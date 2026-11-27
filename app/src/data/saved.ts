// Saved walks, kept on the device.
import { useSyncExternalStore } from 'react';

import { kvGet, kvSet } from './kv';
import type { Walk } from './store';

export interface SavedWalk { walk: Walk; title: string; at: number }
interface Saved { walks: SavedWalk[] }

const KEY = 'layrs.saved.v1';
let saved: Saved = (() => { try { const v = JSON.parse(kvGet(KEY) || '') as Saved; return { walks: v.walks ?? [] }; } catch { return { walks: [] }; } })();
const subs = new Set<() => void>();
const write = (next: Saved) => { saved = next; kvSet(KEY, JSON.stringify(saved)); subs.forEach((f) => f()); };

export const useSaved = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => saved, () => saved);
export function saveWalk(walk: Walk, title: string) {
  write({ ...saved, walks: [{ walk, title, at: Date.now() }, ...saved.walks].slice(0, 30) });
}
export function removeWalk(at: number) { write({ ...saved, walks: saved.walks.filter((w) => w.at !== at) }); }
