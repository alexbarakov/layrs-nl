// Municipality under a point (gemeenten.json, simplified PDOK boundaries) and the city lens files.
import { dataUrl, LENS_CITIES } from './config';

interface Gem { c: string; n: string; p: string; bbox: [number, number, number, number]; polys: number[][][][] }
let GEM: Gem[] = [];
let loading: Promise<Gem[]> | null = null;

export function loadMunicipalities(): Promise<Gem[]> {
  loading ??= fetch(dataUrl(`gemeenten.json`)).then((r) => r.json()).then((fc) => {
    GEM = fc.features.map((f: any) => {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
      for (const p of polys) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return { c: f.properties.c, n: f.properties.n, p: f.properties.p, bbox: [x0, y0, x1, y1], polys };
    });
    return GEM;
  }).catch(() => { loading = null; return GEM; });   // offline: retried on the next call
  return loading;
}
export const municipalities = () => GEM;

function inRing(x: number, y: number, r: number[][]) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
export function municipalityAt(lon: number, lat: number) {
  const g = GEM.find((g) => lon >= g.bbox[0] && lon <= g.bbox[2] && lat >= g.bbox[1] && lat <= g.bbox[3] &&
    g.polys.some((p) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h))));
  return g ? { code: g.c, name: g.n, province: g.p, bbox: g.bbox } : null;
}

// ---- city lenses ----
export interface LensGroup { key: string; label: string; label_nl?: string; bit: number; count: number }
export interface LensNote { name?: string; name_nl?: string; story?: string; story_nl?: string; source?: string; address?: string; ll?: [number, number] }
export interface Lens {
  id: string; section: string; title: string; era?: string; text?: string; caveat?: string | null;
  source?: { label: string; url: string }; count: number; groups: LensGroup[]; notes: Record<string, LensNote>;
}
export interface CityLenses { city: string; layers: Lens[]; b: Record<string, number[]> }
const lensCache = new Map<string, Promise<CityLenses | null>>();
export function loadLenses(code: string | null | undefined): Promise<CityLenses | null> {
  if (!code || !LENS_CITIES.has(code)) return Promise.resolve(null);
  if (!lensCache.has(code)) lensCache.set(code, fetch(dataUrl(`layers/${code}.json`)).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return lensCache.get(code)!;
}
/** Building ids per group of one lens, for the map's colour expression. */
export function lensGroups(city: CityLenses, lens: Lens): number[][] {
  const byBit = new Map(lens.groups.map((g, i) => [g.bit, i]));
  const out: number[][] = lens.groups.map(() => []);
  for (const [bag, bits] of Object.entries(city.b)) {
    const hit = bits.find((b) => byBit.has(b));
    if (hit !== undefined) out[byBit.get(hit)!].push(Number(bag));
  }
  return out;
}
/** Lenses a building belongs to, with its group and story. */
export function lensesOf(city: CityLenses | null, bag: string) {
  if (!city) return [];
  const bits = city.b[bag.padStart(16, '0')];
  if (!bits) return [];
  return city.layers.flatMap((l) => {
    const gi = l.groups.findIndex((g) => bits.includes(g.bit));
    return gi < 0 ? [] : [{ lens: l, group: gi, note: l.notes[bag.padStart(16, '0')] }];
  });
}
