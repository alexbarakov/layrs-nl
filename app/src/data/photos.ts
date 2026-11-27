// Open photos of a building from Wikimedia: the monument's own image and Commons category (via Wikidata, by RCE number),
// then geotagged Commons files within a few dozen metres. Every photo keeps its author and licence.
import { Platform } from 'react-native';

export interface Photo { file: string; thumb: string; page: string; author: string; license: string; near?: boolean }
export interface BuildingMedia { name?: string; photos: Photo[] }

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
// Wikimedia asks API clients to identify themselves; browsers may not set User-Agent, so native sends Api-User-Agent
const HEADERS: Record<string, string> = Platform.OS === 'web' ? {} : { 'Api-User-Agent': 'layrs-nl/0.1 (https://github.com/alexbarakov/layrs-nl)' };
const PHOTO = /\.(jpe?g|png|webp|tiff?)$/i;

async function api(base: string, params: Record<string, string>) {
  const q = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const r = await fetch(`${base}?${q}`, { headers: HEADERS });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

const strip = (html?: string) => (html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Wikidata item of a rijksmonument: its label in the app language, main image, Commons category. */
async function monument(m: number, lang: string) {
  const s = await api(WIKIDATA, { action: 'query', list: 'search', srsearch: `haswbstatement:P359=${m}`, srlimit: '1' });
  const id = s.query?.search?.[0]?.title;
  if (!id) return null;
  const e = (await api(WIKIDATA, { action: 'wbgetentities', ids: id, props: 'labels|claims', languages: `${lang}|nl|en` })).entities?.[id];
  const claim = (p: string) => e?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value as string | undefined;
  const label = e?.labels?.[lang]?.value ?? e?.labels?.nl?.value ?? e?.labels?.en?.value;
  return { label, image: claim('P18'), category: claim('P373') };
}

async function categoryFiles(cat: string): Promise<string[]> {
  const r = await api(COMMONS, { action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file', cmlimit: '12' });
  return (r.query?.categorymembers ?? []).map((x: any) => x.title as string);
}

async function nearFiles(ll: [number, number], radius = 40): Promise<string[]> {
  const r = await api(COMMONS, { action: 'query', list: 'geosearch', gscoord: `${ll[1]}|${ll[0]}`, gsradius: String(radius), gsnamespace: '6', gslimit: '12' });
  return (r.query?.geosearch ?? []).map((x: any) => x.title as string);
}

async function describe(files: string[], near: Set<string>): Promise<Photo[]> {
  if (!files.length) return [];
  const r = await api(COMMONS, { action: 'query', titles: files.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '480' });
  const pages: any[] = Object.values(r.query?.pages ?? {});
  const byTitle = new Map(pages.map((p) => [p.title, p]));
  return files.flatMap((f) => {
    const ii = byTitle.get(f)?.imageinfo?.[0];
    if (!ii?.thumburl) return [];
    const md = ii.extmetadata ?? {};
    return [{ file: f, thumb: ii.thumburl, page: ii.descriptionurl, author: strip(md.Artist?.value) || 'автор не указан', license: strip(md.LicenseShortName?.value) || 'см. страницу файла', near: near.has(f) }];
  });
}

const cache = new Map<string, Promise<BuildingMedia>>();
export function buildingMedia(id: string, ll: [number, number] | undefined, m: number | undefined, lang = 'ru'): Promise<BuildingMedia> {
  const key = `${id}:${lang}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const mon = m ? await monument(m, lang).catch(() => null) : null;
      const [cat, near] = await Promise.all([
        mon?.category ? categoryFiles(mon.category).catch(() => []) : Promise.resolve([] as string[]),
        ll ? nearFiles(ll).catch(() => []) : Promise.resolve([] as string[]),
      ]);
      const own = [...(mon?.image ? [`File:${mon.image}`] : []), ...cat];
      const files = [...new Set([...own, ...near])].filter((f) => PHOTO.test(f)).slice(0, 10);
      // photos of the monument itself come first; geotagged ones are only "taken nearby"
      const nearOnly = new Set(near.filter((f) => !own.includes(f)));
      return { name: mon?.label, photos: await describe(files, nearOnly).catch(() => []) };
    })());
  }
  return cache.get(key)!;
}

export const googleMapsUrl = (ll: [number, number]) => `https://www.google.com/maps/search/?api=1&query=${ll[1].toFixed(6)},${ll[0].toFixed(6)}`;
