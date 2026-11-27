// Map on iOS and Android: MapLibre Native (@maplibre/maplibre-react-native), PMTiles from R2.
// The static style comes from baseStyle(); building layers are React <Layer>s so mode, year and lens
// change their paint without reloading the style.
import { Camera, type CameraRef, GeoJSONSource, Layer, Map, type MapRef } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { municipalityAt } from '@/data/places';
import { useJournal } from '@/data/stamps';
import { getApp, setApp, useApp } from '@/data/store';
import { BUILDING_LAYER_IDS, baseStyle, buildingLayers, overviewFilter } from '@/data/style';

import { OVERLAY_LAYERS, overlayData } from './overlay';
import { useMapState } from './use-map-state';

const STYLE = (() => {
  const s = baseStyle();
  // building layers are rendered as components below, so the style keeps only the static ones
  // as is the 100 m overview, whose filter follows the year
  s.layers = s.layers.filter((l) => !BUILDING_LAYER_IDS.includes(l.id) && l.id !== 'o');
  return s;
})();
const OVERVIEW = baseStyle().layers.find((l) => l.id === 'o')!;

export function LayrsMap() {
  const mapRef = useRef<MapRef>(null);
  const cam = useRef<CameraRef>(null);
  const state = useMapState();
  const camera = useApp((s) => s.camera);
  const walk = useApp((s) => s.walk);
  const walkStep = useApp((s) => s.walkStep);
  const me = useApp((s) => s.me);
  const stampsHere = useApp((s) => s.stampsHere);
  const showStamps = useApp((s) => s.showStamps);
  const journal = useJournal();
  const layers = useMemo(() => buildingLayers(state), [state]);
  const overlay = useMemo(() => overlayData({ walk, walkStep, me, stampsHere, showStamps }, journal), [walk, walkStep, me, stampsHere, showStamps, journal]);
  const oFilter = overviewFilter(state.year);

  useEffect(() => {
    if (camera.seq === 0) return;
    cam.current?.flyTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch ?? 0, bearing: camera.bearing ?? 0, duration: 1600 });
  }, [camera]);

  return (
    <Map
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      mapStyle={STYLE}
      attributionPosition={{ bottom: 8, left: 8 }}
      logo={false}
      onRegionDidChange={(e) => {
        const { center, zoom } = e.nativeEvent;
        const gm = municipalityAt(center[0], center[1]);
        setApp({ view: { center: [center[0], center[1]], zoom }, gm: gm ? { code: gm.code, name: gm.name, province: gm.province } : null });
      }}
      onPress={async (e) => {
        const p = e.nativeEvent.point;
        const hit = await mapRef.current?.queryRenderedFeatures(p, { layers: ['stamp', ...BUILDING_LAYER_IDS, 'walk-stop'] });
        // native returns hits in no guaranteed order: a stamp or a walk stop wins over the building under it
        const f = hit?.find((h: any) => h.properties?.k === 'stamp') ?? hit?.find((h: any) => h.properties?.k === 'stop') ?? hit?.[0];
        if (!f) { setApp({ selected: null }); return; }
        const pr: any = f.properties || {};
        if (pr.k === 'stamp') { setApp({ stampId: String(pr.id) }); return; }
        if (pr.k === 'stop') {
          const s = getApp().walk?.stops[pr.n - 1];
          if (s) setApp({ selected: { id: s.id, y: s.y, h: s.h, m: s.m, q: s.q, ll: s.ll } });
          return;
        }
        setApp({ selected: { id: String(pr.id).padStart(16, '0'), y: pr.y, h: pr.h, m: pr.m, q: pr.q, ll: e.nativeEvent.lngLat as [number, number] } });
      }}
      // development only: a long press puts "me" there, to test stamps and walks without walking
      onLongPress={__DEV__ ? (e) => setApp({ me: { ll: e.nativeEvent.lngLat as [number, number], acc: 5, simulated: true } }) : undefined}>
      <Camera ref={cam} initialViewState={{ center: camera.center, zoom: camera.zoom }} />
      <Layer {...(OVERVIEW as any)} {...(oFilter ? { filter: oFilter } : {})} beforeId="rail" />
      {layers.map((l) => (
        <Layer key={l.id} {...(l as any)} beforeId="road-label" />
      ))}
      <GeoJSONSource id="overlay" data={overlay}>
        {OVERLAY_LAYERS.map((l) => {
          const { source, ...rest } = l as any;
          return <Layer key={l.id} {...rest} />;
        })}
      </GeoJSONSource>
    </Map>
  );
}
