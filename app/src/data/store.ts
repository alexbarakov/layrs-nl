// App state shared by the tabs. Small on purpose: one store, read through useApp(selector).
import { useSyncExternalStore } from 'react';

import { HOME, YEAR_MAX, YEAR_MIN } from './config';
import type { Stamp } from './stamps';
import type { Mode } from './style';

export interface Building { id: string; y: number; h: number; m?: number; q?: number; ll?: [number, number] }
export interface Stop { ll: [number, number]; id: string; y: number; h: number; m: number; q: number; gm: string; s?: number }
export interface Walk {
  origin: [number, number]; stops: Stop[]; loop: boolean; km: number;
  len: number; legs: number[] | null; path: [number, number][] | null; routed: boolean;
}
export interface Camera { center: [number, number]; zoom: number; pitch?: number; bearing?: number; duration?: number; seq: number }

export interface AppState {
  view: { center: [number, number]; zoom: number; pitch?: number; bearing?: number };   // last reported by the map
  camera: Camera;                                      // where the map should go (seq bumps a move)
  mode: Mode;
  year: number;                                        // last year shown (to)
  yearFrom: number;                                    // first year shown
  lensId: string | null;                                // active lens in the current city
  gm: { code: string; name: string; province: string } | null;
  selected: Building | null;
  walk: Walk | null;
  walkStep: number | null;                              // index of the next stop while walking, null when not guiding
  me: { ll: [number, number]; acc: number; simulated?: boolean } | null;
  stampsHere: Stamp[];                                  // stamps of the municipality under the map centre
  stampsCity: string | null;
  stampId: string | null;                               // stamp opened in its sheet
  showStamps: boolean;                                  // the stamps layer is on the map
  tilt: boolean;                                        // 3D: buildings seen at an angle when flying to a place
}

let state: AppState = {
  view: { center: HOME.center, zoom: HOME.zoom },
  camera: { center: HOME.center, zoom: HOME.zoom, seq: 0 },
  mode: 'periods',
  year: YEAR_MAX,
  yearFrom: YEAR_MIN,
  lensId: null,
  gm: null,
  selected: null,
  walk: null,
  walkStep: null,
  me: null,
  stampsHere: [],
  stampsCity: null,
  stampId: null,
  showStamps: false,
  tilt: true,
};
const subs = new Set<() => void>();

export const getApp = () => state;
export function setApp(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  subs.forEach((f) => f());
}
export function flyTo(center: [number, number], zoom: number, extra: { pitch?: number; bearing?: number; duration?: number } = {}) {
  setApp((s) => ({ camera: { center, zoom, ...extra, pitch: s.tilt ? extra.pitch : 0, seq: s.camera.seq + 1 } }));
}
/** The +/- buttons: same place, angle and heading, one zoom step. */
export function zoomBy(d: number) {
  const v = state.view;
  flyTo(v.center, Math.max(5, Math.min(19, v.zoom + d)), { pitch: v.pitch, bearing: v.bearing, duration: 300 });
}
export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => select(state),
    () => select(state),
  );
}
