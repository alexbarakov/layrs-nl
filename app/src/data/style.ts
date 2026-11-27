// One map style for both renderers: maplibre-gl on web, MapLibre Native on iOS/Android.
// baseStyle(): everything that never changes. buildingLayers(state): the layers that follow mode, year and lens.
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

import { BUILDING_PARTS, dataUrl, LENS_COLORS, MONUMENT, PERIODS } from './config';

const SEA = '#c9d9e2';
const PAPER = '#f4f3ef';
const FONT_BOLD = ['Open Sans Semibold'];
const FONT = ['Noto Sans Regular'];

const W = (...pairs: [number, number][]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.6], ['zoom'], ...pairs.flat()] as ExpressionSpecification;

const mix = (hex: string, t = 0.45) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const w = [244, 243, 239];
  return '#' + c.map((v, i) => Math.round(v + (w[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const step = (pale: boolean): ExpressionSpecification =>
  ['step', ['get', 'y'], pale ? mix(PERIODS[0].color) : PERIODS[0].color,
    ...PERIODS.slice(1).flatMap((p) => [p.from, pale ? mix(p.color) : p.color])] as ExpressionSpecification;
// approximate years (q 1 rounded, 2 estimated, 4 RCE span) are drawn paler
export const PERIOD_COLOR: ExpressionSpecification =
  ['case', ['in', ['coalesce', ['get', 'q'], 0], ['literal', [1, 2, 4]]], step(true), step(false)];
export const MONUMENT_COLOR: ExpressionSpecification = ['case', ['has', 'm'], MONUMENT, '#d9d7d0'];
// height by 3D BAG: low houses pale, towers deep blue (stops shared with the legend)
export const HEIGHT_STOPS: [number, string][] = [[0, '#efe9d8'], [6, '#e6d3a0'], [12, '#cfa767'], [20, '#8fae9f'], [35, '#4b7f98'], [70, '#24476e'], [120, '#121f38']];
export const HEIGHT_COLOR: ExpressionSpecification =
  ['interpolate', ['linear'], ['coalesce', ['get', 'h'], 0], ...HEIGHT_STOPS.flat()] as ExpressionSpecification;
const OTHER = '#dedbd3';

export type Mode = 'periods' | 'monuments' | 'height';
export interface LensPaint { groups: number[][] }   // building ids per lens group, in group order
export interface MapState { mode: Mode; year: number; lens: LensPaint | null }

export function buildingColor(s: MapState): ExpressionSpecification {
  if (s.lens) {
    const arms: (number[] | string)[] = [];
    const seen = new Set<number>();
    s.lens.groups.forEach((ids, i) => {
      const fresh = ids.filter((id) => !seen.has(id) && seen.add(id));
      if (fresh.length) arms.push(fresh, LENS_COLORS[i % LENS_COLORS.length]);
    });
    if (arms.length) return ['match', ['get', 'id'], ...arms, OTHER] as unknown as ExpressionSpecification;
    return ['literal', OTHER] as unknown as ExpressionSpecification;
  }
  return s.mode === 'monuments' ? MONUMENT_COLOR : s.mode === 'height' ? HEIGHT_COLOR : PERIOD_COLOR;
}
export const yearFilter = (year: number): ExpressionSpecification | undefined =>
  year >= 2026 ? undefined : ['all', ['>', ['get', 'y'], 0], ['<=', ['get', 'y'], year]];

const BUILDING_SOURCES = [{ id: 'bl', minzoom: 12.5, maxzoom: 14 }, ...BUILDING_PARTS.map((p) => ({ id: p.id, minzoom: 14, maxzoom: 24 }))];
export const BUILDING_LAYER_IDS = BUILDING_SOURCES.map((s) => `${s.id}-x`);

export function buildingLayers(s: MapState): LayerSpecification[] {
  const filter = yearFilter(s.year);
  return BUILDING_SOURCES.map((src) => ({
    id: `${src.id}-x`,
    type: 'fill-extrusion',
    source: src.id,
    'source-layer': 'b',
    minzoom: src.minzoom,
    maxzoom: src.maxzoom,
    ...(filter ? { filter } : {}),
    paint: {
      'fill-extrusion-color': buildingColor(s),
      'fill-extrusion-height': ['get', 'h'],
      'fill-extrusion-opacity': 0.95,
    },
  }) as LayerSpecification);
}
export const overviewFilter = (year: number): ExpressionSpecification | undefined =>
  year >= 2026 ? undefined : ['<=', ['get', 'y'], year];

export function baseStyle(): StyleSpecification {
  const base = (id: string, type: string, layer: string, o: object) => ({ id, type, source: 'base', 'source-layer': layer, ...o });
  const ctx = (id: string, type: string, layer: string, o: object) => ({ id, type, source: 'ctx', 'source-layer': layer, ...o });
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      base: { type: 'vector', url: `pmtiles://${dataUrl('nl-base.pmtiles')}`, attribution: 'Kadaster BRT Top10NL (CC BY 4.0)' },
      ctx: { type: 'vector', url: `pmtiles://${dataUrl('nl-context.pmtiles')}`, attribution: 'Natural Earth, Kadaster BRK' },
      or: { type: 'raster', url: `pmtiles://${dataUrl('nl-overview-r.pmtiles')}`, tileSize: 256 },
      o: { type: 'vector', url: `pmtiles://${dataUrl('nl-overview.pmtiles')}` },
      bl: { type: 'vector', url: `pmtiles://${dataUrl('nl-buildings-lo.pmtiles')}` },
      ...Object.fromEntries(BUILDING_PARTS.map((p) => [p.id, {
        type: 'vector', url: p.url, bounds: [p.west, 50.7, p.east, 53.6], attribution: '3D BAG (CC BY 4.0), BAG, RCE',
      }])),
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': SEA } },
      ctx('land', 'fill', 'land', { paint: { 'fill-color': ['match', ['get', 'k'], 'nl', PAPER, '#e7e4dd'], 'fill-antialias': false } }),
      base('green', 'fill', 'green', { paint: { 'fill-color': ['match', ['get', 'k'], 'forest', '#dfe6d3', 'heath', '#e8e2d6', 'sand', '#efe9da', 'cemetery', '#dde3d6', '#e3eadb'], 'fill-antialias': false } }),
      base('water', 'fill', 'water', { paint: { 'fill-color': SEA, 'fill-antialias': false } }),
      base('waterline', 'line', 'waterline', { minzoom: 13, paint: { 'line-color': SEA, 'line-width': W([13, 0.4], [16, 1.5]) } }),
      { id: 'or', type: 'raster', source: 'or', maxzoom: 10, paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0 } },
      { id: 'o', type: 'fill', source: 'o', 'source-layer': 'o', minzoom: 10, maxzoom: 12.5,
        paint: { 'fill-color': step(false), 'fill-opacity': ['interpolate', ['linear'], ['get', 'c'], 0, 0.2, 0.3, 0.95], 'fill-antialias': false } },
      base('rail', 'line', 'rail', { filter: ['!', ['has', 't']], paint: { 'line-color': '#a9a49a', 'line-width': W([8, 0.4], [15, 1.4]), 'line-dasharray': [3, 2] } }),
      base('road-minor', 'line', 'road', { minzoom: 13, filter: ['all', ['in', ['get', 'c'], ['literal', ['street', 'minor', 'path']]], ['!', ['has', 't']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['match', ['get', 'c'], 'path', '#e4e0d6', '#ffffff'], 'line-width': W([13, 0.5], [16, 4]) } }),
      base('road-major', 'line', 'road', { filter: ['all', ['in', ['get', 'c'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]], ['!', ['has', 't']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['match', ['get', 'c'], 'motorway', '#f2d9a6', 'trunk', '#f5e2b8', '#ffffff'],
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 6, ['match', ['get', 'c'], 'motorway', 0.8, 0.4], 16, ['match', ['get', 'c'], 'motorway', 10, 'trunk', 8, 6]] } }),
      ctx('border-x', 'line', 'border', { filter: ['==', ['get', 'k'], 'x'], paint: { 'line-color': '#b9b4aa', 'line-width': W([5, 0.5], [12, 1.2]), 'line-dasharray': [4, 2] } }),
      ctx('border-nl', 'line', 'border', { filter: ['==', ['get', 'k'], 'nl'], layout: { 'line-join': 'round' },
        paint: { 'line-color': '#6f6a5f', 'line-width': W([5, 1.3], [10, 2], [15, 3.5]), 'line-dasharray': [4, 1.5, 1, 1.5] } }),
      ...buildingLayers({ mode: 'periods', year: 2026, lens: null }),
      base('road-label', 'symbol', 'road', { minzoom: 15, filter: ['has', 'n'],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'n'], 'text-font': FONT, 'text-size': 11, 'text-max-angle': 30 },
        paint: { 'text-color': '#6b675f', 'text-halo-color': '#fff', 'text-halo-width': 1.2 } }),
      base('place-label', 'symbol', 'place', {
        layout: { 'text-field': ['get', 'n'], 'text-font': FONT_BOLD, 'text-padding': 4,
          'text-size': ['match', ['get', 'k'], 'town', ['interpolate', ['linear'], ['coalesce', ['get', 'p'], 0], 0, 11, 100000, 14, 500000, 17], 'district', 11, 'quarter', 10, 10],
          'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'p'], 0]] },
        paint: { 'text-color': ['match', ['get', 'k'], 'town', '#3c3a36', '#7a766d'], 'text-halo-color': '#f4f3efdd', 'text-halo-width': 1.5 } }),
      ctx('country', 'symbol', 'country', {
        layout: { 'text-field': ['step', ['zoom'], ['get', 'n'], 9, ['concat', ['get', 'n'], '\n', ['get', 'ne']]], 'text-font': FONT_BOLD,
          'text-size': W([5, 11], [10, 15]), 'text-letter-spacing': 0.08 },
        paint: { 'text-color': '#9a9488', 'text-halo-color': '#e7e4dd', 'text-halo-width': 1.5 } }),
    ] as LayerSpecification[],
  };
}
