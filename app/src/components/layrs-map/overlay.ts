// Walk route, numbered stops and the user's position: one GeoJSON source and its layers, for both renderers.
import type { LayerSpecification } from '@maplibre/maplibre-gl-style-spec';

import { ERA_INK } from '@/data/stamps';
import type { AppState } from '@/data/store';

export function overlayData(s: Pick<AppState, 'walk' | 'walkStep' | 'me' | 'stampsHere' | 'showStamps'>, collected: Record<string, unknown> = {}): GeoJSON.FeatureCollection {
  const f: GeoJSON.Feature[] = [];
  for (const st of s.showStamps ? s.stampsHere : []) {
    f.push({ type: 'Feature', properties: { k: 'stamp', id: st.id, ink: ERA_INK[st.era] ?? ERA_INK[0], got: collected[st.id] ? 1 : 0 },
      geometry: { type: 'Point', coordinates: st.ll } });
  }
  const w = s.walk;
  if (w && w.stops.length) {
    const line = w.path || [w.origin, ...w.stops.map((x) => x.ll), ...(w.loop ? [w.origin] : [])];
    f.push({ type: 'Feature', properties: { k: 'line', routed: w.routed ? 1 : 0 }, geometry: { type: 'LineString', coordinates: line } });
    w.stops.forEach((x, i) => f.push({ type: 'Feature', properties: { k: 'stop', n: i + 1, done: s.walkStep !== null && i < s.walkStep ? 1 : 0 },
      geometry: { type: 'Point', coordinates: x.ll } }));
    f.push({ type: 'Feature', properties: { k: 'start' }, geometry: { type: 'Point', coordinates: w.origin } });
  }
  if (s.me) f.push({ type: 'Feature', properties: { k: 'me', acc: s.me.acc }, geometry: { type: 'Point', coordinates: s.me.ll } });
  return { type: 'FeatureCollection', features: f };
}

const ACC_PX: any = ['interpolate', ['exponential', 2], ['zoom'], 10, ['/', ['get', 'acc'], 150], 20, ['/', ['get', 'acc'], 0.15]];
export const OVERLAY_LAYERS: LayerSpecification[] = [
  // stamps: an ink ring, filled once collected
  { id: 'stamp', type: 'circle', source: 'overlay', filter: ['==', ['get', 'k'], 'stamp'],
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 12], 'circle-color': ['case', ['==', ['get', 'got'], 1], ['get', 'ink'], '#fffdf8'],
      'circle-stroke-color': ['get', 'ink'], 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 3], 'circle-pitch-alignment': 'viewport' } },
  { id: 'stamp-dot', type: 'circle', source: 'overlay', filter: ['all', ['==', ['get', 'k'], 'stamp'], ['==', ['get', 'got'], 0]],
    minzoom: 13, paint: { 'circle-radius': 3, 'circle-color': ['get', 'ink'] } },
  { id: 'walk-line', type: 'line', source: 'overlay', filter: ['==', ['get', 'k'], 'line'],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#8c1c13', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 17, 5], 'line-opacity': 0.9 } },
  { id: 'walk-stop', type: 'circle', source: 'overlay', filter: ['==', ['get', 'k'], 'stop'],
    paint: { 'circle-radius': 11, 'circle-color': ['case', ['==', ['get', 'done'], 1], '#b9b4aa', '#8c1c13'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } },
  { id: 'walk-num', type: 'symbol', source: 'overlay', filter: ['==', ['get', 'k'], 'stop'],
    layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': ['Open Sans Semibold'], 'text-size': 12, 'text-allow-overlap': true },
    paint: { 'text-color': '#fff' } },
  { id: 'walk-start', type: 'circle', source: 'overlay', filter: ['==', ['get', 'k'], 'start'],
    paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-color': '#8c1c13', 'circle-stroke-width': 3 } },
  { id: 'me-acc', type: 'circle', source: 'overlay', filter: ['==', ['get', 'k'], 'me'],
    paint: { 'circle-radius': ACC_PX, 'circle-color': '#1a73e8', 'circle-opacity': 0.12, 'circle-pitch-alignment': 'map' } },
  { id: 'me', type: 'circle', source: 'overlay', filter: ['==', ['get', 'k'], 'me'],
    paint: { 'circle-radius': 7, 'circle-color': '#1a73e8', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' } },
] as LayerSpecification[];
