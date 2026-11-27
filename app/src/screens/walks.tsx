// Walks tab: three questions (from where, what to see, how long), then the route with its stops.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { Icon, IconTile } from '@/components/icon';
import { layerIcon, layerRu, plBuildings } from '@/data/layers';
import { useStopName } from '@/data/names';
import { type CityLenses, lensGroups, loadLenses } from '@/data/places';
import { removeWalk, saveWalk, useSaved } from '@/data/saved';
import { flyTo, getApp, setApp, type Stop, useApp, type Walk } from '@/data/store';
import { type Interest, legMeters, planWalk, walkMeters, walkMinutes } from '@/data/walk';
import { startLocation } from '@/hooks/use-location';
import { colors, font, spacing, type } from '@/theme';
import { meters, plural, yearLabel } from '@/utils/format';

const INTERESTS: [Interest, string][] = [['mon', 'Памятники'], ['old', 'Старые дома'], ['eras', 'Разные эпохи'], ['tall', 'Высотные']];

export function WalksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const gm = useApp((s) => s.gm);
  const saved = useSaved();
  const [from, setFrom] = useState<'me' | 'map'>('map');
  const [want, setWant] = useState<Set<Interest>>(new Set(['mon', 'old']));
  const [km, setKm] = useState(2);
  const [stops, setStops] = useState(8);
  const [layers, setLayers] = useState<Set<string>>(new Set());
  const [city, setCity] = useState<CityLenses | null>(null);
  useEffect(() => { let live = true; loadLenses(gm?.code).then((c) => { if (live) { setCity(c); setLayers(new Set()); } }); return () => { live = false; }; }, [gm?.code]);
  const toggleLayer = (id: string) => setLayers((l) => { const n = new Set(l); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [loop, setLoop] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Walk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: Interest) => setWant((w) => { const n = new Set(w); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function build() {
    setBusy(true); setError(null); setResult(null);
    let origin = getApp().view.center;
    if (from === 'me') {
      const r = await startLocation();
      for (let i = 0; i < 30 && !getApp().me && r === 'ok'; i++) await new Promise((res) => setTimeout(res, 300));
      const me = getApp().me;
      if (!me) { setError('Не удалось получить геопозицию. Постройте маршрут от центра карты.'); setBusy(false); return; }
      origin = me.ll;
    }
    try {
      // the chosen city layers: their buildings get a bonus, and buildings with stories join the candidates
      const layerIds = new Set<string>(), extra: Stop[] = [];
      for (const l of city?.layers ?? []) {
        if (!layers.has(l.id)) continue;
        lensGroups(city!, l).flat().forEach((id) => layerIds.add(String(id).padStart(16, '0')));
        for (const [bag, n] of Object.entries(l.notes)) if (n.ll) extra.push({ ll: n.ll, id: bag, y: 0, h: 0, m: 0, q: 0, gm: gm?.code ?? '' });
      }
      const w = await planWalk(origin, km, loop, layers.size && !want.size ? new Set() : want, { layerIds, extra, stops });
      if (!w.stops.length) setError('Рядом нет зданий под выбранные интересы. Увеличьте длину или добавьте «Старые дома».');
      else setResult(w);
    } catch {
      setError('Не удалось загрузить данные для маршрута. Проверьте соединение и попробуйте ещё раз.');
    }
    setBusy(false);
  }
  const show = (w: Walk) => {
    setApp({ walk: w, walkStep: null });
    // centre on the whole walk; a 2 km loop fits a phone screen at zoom 15
    const pts = [w.origin, ...w.stops.map((s) => s.ll)];
    const lats = pts.map((p) => p[1]);
    // the map panel covers the lower part of the screen: aim below the walk so it sits in the open part above
    const c: [number, number] = [pts.reduce((a, p) => a + p[0], 0) / pts.length, (Math.min(...lats) + Math.max(...lats)) / 2 - (Math.max(...lats) - Math.min(...lats)) * 0.45];
    flyTo(c, w.km >= 4 ? 14.1 : w.km >= 2 ? 14.7 : 15.3);
    router.navigate('/');
  };
  const gmaps = (w: Walk) => {
    const ll = (p: [number, number]) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`;
    const pts = w.stops.map((s) => s.ll), dest = w.loop ? w.origin : pts[pts.length - 1];
    const way = (w.loop ? pts : pts.slice(0, -1)).slice(0, 9);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${ll(w.origin)}&destination=${ll(dest)}&waypoints=${encodeURIComponent(way.map(ll).join('|'))}`);
  };

  return (
    <ScrollView style={styles.fill} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.md }]} keyboardShouldPersistTaps="handled">
      <Text style={type.display}>Прогулка</Text>
      <Text style={type.subhead}>По памятникам и старым домам, по улицам. {gm ? `Сейчас карта в ${gm.name}.` : ''}</Text>

      <Group label="Откуда">
        <Chip label="Центр карты" on={from === 'map'} onPress={() => setFrom('map')} />
        <Chip label="Моё место" on={from === 'me'} onPress={() => setFrom('me')} />
      </Group>
      <Group label="Что смотреть">
        {INTERESTS.map(([k, l]) => <Chip key={k} label={l} on={want.has(k)} onPress={() => toggle(k)} />)}
      </Group>
      {city ? (
        <View style={{ gap: 6 }}>
          <Text style={type.caption}>Слои {gm?.name}: по каким историям идти</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }} style={{ marginHorizontal: -spacing.md }}>
            {city.layers.map((l) => {
              const on = layers.has(l.id);
              return (
                <Pressable key={l.id} onPress={() => toggleLayer(l.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  style={[styles.layer, on && styles.layerOn]}>
                  <IconTile name={layerIcon(l.title, l.section)} size={34} />
                  <Text style={styles.layerTitle} numberOfLines={2}>{layerRu(l.title)}</Text>
                  <Text style={type.caption}>{plBuildings(l.count)}</Text>
                  {on ? <View style={styles.tick}><Icon name="check" size={12} color={colors.card} width={3} /></View> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <Text style={type.caption}>Сколько остановок</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => setStops(Math.max(3, stops - 1))} accessibilityRole="button" accessibilityLabel="Меньше остановок" style={styles.stepBtn}><Icon name="minus" size={18} width={2.4} /></Pressable>
          <Text style={styles.stepValue} accessibilityLiveRegion="polite">{stops} {plural(stops, 'остановка', 'остановки', 'остановок')}</Text>
          <Pressable onPress={() => setStops(Math.min(20, stops + 1))} accessibilityRole="button" accessibilityLabel="Больше остановок" style={styles.stepBtn}><Icon name="plus" size={18} width={2.4} /></Pressable>
        </View>
      </View>
      <Group label="Длина пешком">
        {[1, 2, 3, 5].map((k) => <Chip key={k} label={`${k} км`} on={km === k} onPress={() => setKm(k)} />)}
      </Group>
      <Group label="Форма">
        <Chip label="Круг" on={loop} onPress={() => setLoop(true)} />
        <Chip label="В одну сторону" on={!loop} onPress={() => setLoop(false)} />
      </Group>
      <View style={styles.row}>
        <Chip label={busy ? 'Строю…' : 'Построить'} tone="accent" on onPress={() => !busy && build()} />
        {busy ? <ActivityIndicator color={colors.accent} /> : null}
      </View>
      {error ? <Text style={[type.subhead, { color: colors.accent }]} accessibilityLiveRegion="polite">{error}</Text> : null}

      {result ? (
        <View style={styles.result}>
          <Text style={type.headline}>{result.stops.length} {plural(result.stops.length, 'остановка', 'остановки', 'остановок')}</Text>
          <Text style={type.subhead}>{meters(walkMeters(result))} {result.routed ? 'по улицам' : 'пешком, оценка по прямой'} · {walkMinutes(result)} мин с остановками</Text>
          <View style={styles.row}>
            <Chip label="Показать на карте" tone="accent" on onPress={() => show(result)} />
            <Chip label="Сохранить" onPress={() => saveWalk(result, `${result.km} км${getApp().gm ? ', ' + getApp().gm!.name : ''}`)} />
            <Chip label="Google Maps" onPress={() => gmaps(result)} />
          </View>
          {result.stops.map((s, i) => (
            <Pressable key={s.id} accessibilityRole="button" style={({ pressed }) => [styles.stop, pressed && { backgroundColor: colors.chip }]}
              onPress={() => { show(result); setApp({ selected: { id: s.id, y: s.y, h: s.h, m: s.m, q: s.q, ll: s.ll } }); }}>
              <View style={styles.n}><Text style={styles.nText}>{i + 1}</Text></View>
              <StopLabel stop={s} />
              <Text style={[type.caption, { fontVariant: ['tabular-nums'] }]}>{meters(legMeters(result, i))}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {saved.walks.length ? (
        <View style={{ gap: 4, marginTop: spacing.lg }}>
          <Text style={type.caption}>Сохранённые прогулки</Text>
          {saved.walks.map((s) => (
            <Pressable key={s.at} accessibilityRole="button" style={({ pressed }) => [styles.stop, pressed && { backgroundColor: colors.chip }]} onPress={() => show(s.walk)}>
              <Text style={[type.body, { flex: 1 }]}>{s.title}</Text>
              <Text style={type.caption}>{s.walk.stops.length} {plural(s.walk.stops.length, 'остановка', 'остановки', 'остановок')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Удалить прогулку ${s.title}`} onPress={() => removeWalk(s.at)} hitSlop={8}>
                <Text style={{ color: colors.accent, fontSize: 14 }}>Удалить</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function StopLabel({ stop }: { stop: Stop }) {
  const name = useStopName(stop);
  return (
    <View style={{ flex: 1 }}>
      <Text style={type.body} numberOfLines={1}>{name ?? '…'}</Text>
      <Text style={type.caption}>{stop.y ? yearLabel(stop.y, stop.q) : ''}{stop.m ? `${stop.y ? ' · ' : ''}памятник` : ''}</Text>
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={type.caption}>{label}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  wrap: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  layer: { width: 132, minHeight: 124, padding: 10, gap: 6, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  layerOn: { borderWidth: 2, borderColor: colors.delft },
  layerTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 18, color: colors.ink },
  tick: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.delft, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, padding: 4, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 130, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] },
  result: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  stop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  n: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  nText: { color: colors.card, fontSize: 12, fontWeight: '600' },
});
