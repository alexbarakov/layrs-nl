// Map in the web build: maplibre-gl + pmtiles, same style and overlay as the native map.
import 'maplibre-gl/dist/maplibre-gl.css';

// maplibre-gl 5: its UMD build carries the worker inline, which Metro bundles as is (6.x needs a module worker URL)
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { municipalityAt } from '@/data/places';
import { useJournal } from '@/data/stamps';
import { getApp, setApp, useApp } from '@/data/store';
import { BUILDING_LAYER_IDS, baseStyle, buildingColor, overviewFilter, yearFilter } from '@/data/style';

import { OVERLAY_LAYERS, overlayData } from './overlay';
import { useMapState } from './use-map-state';

let protocolAdded = false;

export function LayrsMap() {
  const host = useRef<any>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const state = useMapState();
  const camera = useApp((s) => s.camera);
  const walk = useApp((s) => s.walk);
  const walkStep = useApp((s) => s.walkStep);
  const me = useApp((s) => s.me);
  const stampsHere = useApp((s) => s.stampsHere);
  const showStamps = useApp((s) => s.showStamps);
  const journal = useJournal();

  useEffect(() => {
    if (!protocolAdded) { maplibregl.addProtocol('pmtiles', new Protocol().tile); protocolAdded = true; }
    const el = host.current as unknown as HTMLElement;
    const { camera: c } = getApp();
    const map = new maplibregl.Map({
      container: el, style: baseStyle() as any, center: c.center, zoom: c.zoom, maxPitch: 70,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5), attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('overlay', { type: 'geojson', data: overlayData(getApp()) });
      OVERLAY_LAYERS.forEach((l) => map.addLayer(l as any));
    });
    map.on('moveend', () => {
      const ctr = map.getCenter();
      const gm = municipalityAt(ctr.lng, ctr.lat);
      setApp({ view: { center: [ctr.lng, ctr.lat], zoom: map.getZoom() }, gm: gm ? { code: gm.code, name: gm.name, province: gm.province } : null });
    });
    map.on('click', (e: maplibregl.MapMouseEvent) => {
      const stamp = map.getLayer('stamp') ? map.queryRenderedFeatures(e.point, { layers: ['stamp'] })[0] : undefined;
      if (stamp) { setApp({ stampId: String((stamp.properties as any).id) }); return; }
      const layers = [...BUILDING_LAYER_IDS, 'walk-stop'].filter((l) => map.getLayer(l));
      const f = map.queryRenderedFeatures(e.point, { layers })[0];
      if (!f) { setApp({ selected: null }); return; }
      const pr: any = f.properties;
      if (f.layer.id === 'walk-stop') {
        const s = getApp().walk?.stops[pr.n - 1];
        if (s) setApp({ selected: { id: s.id, y: s.y, h: s.h, m: s.m, q: s.q, ll: s.ll } });
        return;
      }
      setApp({ selected: { id: String(pr.id).padStart(16, '0'), y: pr.y, h: pr.h, m: pr.m, q: pr.q, ll: [e.lngLat.lng, e.lngLat.lat] } });
    });
    // development only: a right click (long press) puts "me" there, to test stamps and walks without walking
    if (__DEV__) map.on('contextmenu', (e: maplibregl.MapMouseEvent) => setApp({ me: { ll: [e.lngLat.lng, e.lngLat.lat], acc: 5, simulated: true } }));
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    (window as any).layrsMap = map;
    return () => { ro.disconnect(); map.remove(); };
  }, []);

  // mode, year, lens -> paint and filters
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => {
      const color = buildingColor(state), f = yearFilter(state.year);
      for (const id of BUILDING_LAYER_IDS) {
        if (!map.getLayer(id)) continue;
        map.setPaintProperty(id, 'fill-extrusion-color', color as any);
        map.setFilter(id, (f ?? null) as any);
      }
      if (map.getLayer('o')) map.setFilter('o', (overviewFilter(state.year) ?? null) as any);
    };
    if (map.isStyleLoaded()) apply(); else map.once('load', apply);
  }, [state]);

  useEffect(() => {
    const src = mapRef.current?.getSource('overlay') as maplibregl.GeoJSONSource | undefined;
    src?.setData(overlayData({ walk, walkStep, me, stampsHere, showStamps }, journal));
  }, [walk, walkStep, me, stampsHere, showStamps, journal]);

  useEffect(() => {
    if (camera.seq === 0) return;
    mapRef.current?.flyTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch ?? 0, bearing: camera.bearing ?? 0, duration: 1600 });
  }, [camera]);

  return <View ref={host} style={{ position: 'absolute', inset: 0 } as any} />;
}
