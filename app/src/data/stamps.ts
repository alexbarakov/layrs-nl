// Stamps: 5-20 landmarks per municipality (pipeline/p15_stamps.py). Collect one by standing next to it.
import { useSyncExternalStore } from 'react';

import { dataUrl } from './config';
import { kvGet, kvSet } from './kv';

export interface Stamp {
  id: string; gm: string; bags: string[]; ll: [number, number];
  name: string; name_nl: string; year: number; era: number; sl: number;
  wiki: string; wiki_en: string; img?: string; style?: number; place?: string;
  credit?: { author: string; license: string; license_url: string; source: string };
}
export interface CityStamps { gm: string; name: string; eras: string[]; stamps: Stamp[] }
export interface StampIndex { [gm: string]: { name: string; n: number; ll: [number, number] } }

// stamps are black and white; the era colours mark them on the map (same order as ERAS in the pipeline)
export const STAMP_INK = '#1f1d1a';
export const ERA_INK = ['#4a1410', '#8c1c13', '#a8481f', '#8a6410', '#2f6b4a', '#2c5a91'];
export const ERA_LABEL = ['до 1500', '1500–1649', '1650–1799', '1800–1899', '1900–1944', 'с 1945'];
export const COLLECT_RADIUS_M = 60;
export const MAX_ACCURACY_M = 50;

const cache = new Map<string, Promise<CityStamps | null>>();
export function loadStamps(code: string | null | undefined): Promise<CityStamps | null> {
  if (!code) return Promise.resolve(null);
  if (!cache.has(code)) cache.set(code, fetch(dataUrl(`stamps/${code}.json`)).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(code)!;
}
let indexP: Promise<StampIndex> | null = null;
export const loadStampIndex = () => (indexP ??= fetch(dataUrl('stamps/index.json')).then((r) => r.json()).catch(() => { indexP = null; return {}; }));
export const stampArt = (s: Stamp) => (s.img ? dataUrl(s.img) : null);

// ---- the travel journal: collected stamps, kept on the device ----
export interface Collected { id: string; gm: string; city: string; name: string; era: number; year: number; img?: string; at: number }
const KEY = 'layrs.stamps.v1';
let journal: Record<string, Collected> = (() => { try { return JSON.parse(kvGet(KEY) || '{}'); } catch { return {}; } })();
const subs = new Set<() => void>();
export const useJournal = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => journal, () => journal);
export const isCollected = (id: string) => !!journal[id];
export function collect(s: Stamp, city: string) {
  if (journal[s.id]) return journal[s.id];
  const c: Collected = { id: s.id, gm: s.gm, city, name: s.name_nl || s.name, era: s.era, year: s.year, img: s.img, at: Date.now() };
  journal = { ...journal, [s.id]: c };
  kvSet(KEY, JSON.stringify(journal));
  subs.forEach((f) => f());
  return c;
}
/** A slight, stable tilt per stamp, as if pressed by hand. */
export const tilt = (id: string) => ((id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 13) - 6);
