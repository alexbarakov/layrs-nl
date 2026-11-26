// Saved buildings and walks, kept on the device.
import { useSyncExternalStore } from 'react';

import { kvGet, kvSet } from './kv';
import type { Building, Walk } from './store';

export interface SavedBuilding extends Building { name?: string; place?: string; at: number }
export interface SavedWalk { walk: Walk; title: string; at: number }
interface Saved { buildings: SavedBuilding[]; walks: SavedWalk[] }

const KEY = 'layrs.saved.v1';
let saved: Saved = (() => { try { return JSON.parse(kvGet(KEY) || '') as Saved; } catch { return { buildings: [], walks: [] }; } })();
const subs = new Set<() => void>();
const write = (next: Saved) => { saved = next; kvSet(KEY, JSON.stringify(saved)); subs.forEach((f) => f()); };

export const useSaved = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => saved, () => saved);
export const isSaved = (id: string) => saved.buildings.some((b) => b.id === id);
export function toggleBuilding(b: SavedBuilding) {
  write({ ...saved, buildings: isSaved(b.id) ? saved.buildings.filter((x) => x.id !== b.id) : [{ ...b, at: Date.now() }, ...saved.buildings] });
}
export function saveWalk(walk: Walk, title: string) {
  write({ ...saved, walks: [{ walk, title, at: Date.now() }, ...saved.walks].slice(0, 30) });
}
export function removeWalk(at: number) { write({ ...saved, walks: saved.walks.filter((w) => w.at !== at) }); }
