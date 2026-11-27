// Map tab: the country, a city, a building. Full-screen map with a persistent panel at the bottom.
import { Host, Slider } from '@expo/ui';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { LayrsMap } from '@/components/layrs-map';
import { Swatches } from '@/components/swatches';
import { CITIES, HOME, LENS_COLORS, YEAR_MAX, YEAR_MIN } from '@/data/config';
import { BASE_LAYERS } from '@/data/layers';
import { loadLenses } from '@/data/places';
import { COLLECT_RADIUS_M, ERA_INK, MAX_ACCURACY_M, loadStamps, useJournal } from '@/data/stamps';
import { flyTo, getApp, setApp, useApp } from '@/data/store';
import { bearing, dist, legMeters, walkMeters } from '@/data/walk';
import { startLocation } from '@/hooks/use-location';
import { colors, radius, spacing, type } from '@/theme';
import { meters, plural, yearLabel } from '@/utils/format';

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const gm = useApp((s) => s.gm);
  const zoom = useApp((s) => s.view.zoom);
  const mode = useApp((s) => s.mode);
  const year = useApp((s) => s.year);
  const lensId = useApp((s) => s.lensId);
  const selected = useApp((s) => s.selected);
  const stampId = useApp((s) => s.stampId);
  const stampsHere = useApp((s) => s.stampsHere);
  const me = useApp((s) => s.me);
  const journal = useJournal();
  const [lensCount, setLensCount] = useState(0);
  const [lens, setLens] = useState<{ title: string; groups: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const country = zoom < 9;
  const base = BASE_LAYERS.find((l) => l.id === mode)!;
  const layerTitle = lens ? lens.title : base.title;
  const layerColors = lens ? Array.from({ length: Math.min(lens.groups, 6) }, (_, i) => LENS_COLORS[i]) : base.swatches;
  // the iOS tab bar floats over the screen (83 pt from the bottom edge on an iPhone with a home indicator)
  const tabBar = Platform.OS === 'ios' ? insets.bottom + 56 : 0;

  // lenses follow the municipality under the map centre
  useEffect(() => {
    let live = true;
    loadLenses(gm?.code).then((c) => {
      if (!live) return;
      setLensCount(c ? c.layers.length : 0);
      const l = c?.layers.find((x) => x.id === lensId);
      setLens(l ? { title: l.title, groups: l.groups.length } : null);
      if (!c && lensId) setApp({ lensId: null });
    });
    return () => { live = false; };
  }, [gm?.code, lensId]);

  // a tap on a building opens its sheet; a tap on a stamp opens the stamp
  useEffect(() => { if (selected) router.push('/building'); }, [selected, router]);
  useEffect(() => { if (stampId) router.push('/stamp'); }, [stampId, router]);

  // stamps of the municipality under the map centre
  useEffect(() => {
    let live = true;
    loadStamps(gm?.code).then((c) => { if (live) setApp({ stampsHere: c?.stamps ?? [], stampsCity: c?.name ?? null }); });
    return () => { live = false; };
  }, [gm?.code]);

  // standing next to a stamp you do not have yet
  const nearby = me && me.acc <= MAX_ACCURACY_M
    ? stampsHere.filter((st) => !journal[st.id]).map((st) => ({ st, d: dist(me.ll, st.ll) })).filter((x) => x.d <= COLLECT_RADIUS_M).sort((a, b) => a.d - b.d)[0]
    : undefined;

  const locate = async () => {
    const r = await startLocation();
    if (r === 'denied') { setNote('Доступ к геопозиции запрещён. Включите его в настройках телефона для LAYRS.'); return; }
    if (r === 'error') { setNote('Не удалось определить место. Попробуйте ещё раз на улице.'); return; }
    setNote(null);
    const wait = setInterval(() => {
      const me = getApp().me;
      if (me) { clearInterval(wait); flyTo(me.ll, Math.max(getApp().view.zoom, 16)); }
    }, 300);
    setTimeout(() => clearInterval(wait), 15000);
  };

  return (
    <View style={styles.fill}>
      <LayrsMap />
      <Pressable onPress={locate} accessibilityRole="button" accessibilityLabel="Моё место"
        style={({ pressed }) => [styles.locate, { top: insets.top + spacing.sm }, pressed && { opacity: 0.7 }]}>
        <SymbolView name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }} tintColor={colors.blue} size={20} />
      </Pressable>
      <Pressable onPress={() => router.push('/layers')} accessibilityRole="button" accessibilityLabel="Слои"
        style={({ pressed }) => [styles.locate, { top: insets.top + spacing.sm + 52 }, pressed && { opacity: 0.7 }]}>
        <SymbolView name={{ ios: 'square.3.layers.3d', android: 'layers', web: 'layers' }} tintColor={colors.ink} size={20} />
      </Pressable>
      {note ? <Text accessibilityLiveRegion="polite" style={[styles.note, { top: insets.top + 112 }]}>{note}</Text> : null}

      <View style={[styles.panel, tabBar ? { paddingBottom: tabBar } : null]}>
        {nearby ? (
          <Pressable accessibilityRole="button" onPress={() => setApp({ stampId: nearby.st.id })}
            style={({ pressed }) => [styles.nearby, { borderColor: ERA_INK[nearby.st.era] }, pressed && { opacity: 0.8 }]}>
            <View style={[styles.nearbyDot, { backgroundColor: ERA_INK[nearby.st.era] }]} />
            <Text style={[type.headline, { flex: 1 }]} numberOfLines={2}>Вы у {nearby.st.name_nl || nearby.st.name} — поставить печать</Text>
          </Pressable>
        ) : null}
        <WalkStrip />
        <Text style={type.caption} accessibilityLiveRegion="polite">
          {country ? 'Нидерланды' : gm ? `${gm.name} · ${gm.province}` : 'вне Нидерландов'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Chip label="Вся страна" on={country} onPress={() => flyTo(HOME.center, HOME.zoom)} />
          {gm && !country && !CITIES.some((c) => c.code === gm.code) ? <Chip label={gm.name} on onPress={() => {}} /> : null}
          {CITIES.map((c) => (
            <Chip key={c.code} label={c.name} on={!country && gm?.code === c.code} onPress={() => flyTo(c.center, 15.3, { pitch: 55, bearing: -20 })} />
          ))}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel={`Слои. Сейчас: ${layerTitle}`} onPress={() => router.push('/layers')}
          style={({ pressed }) => [styles.layerBar, pressed && { backgroundColor: colors.chip }]}>
          <Swatches colors={layerColors} width={40} />
          <View style={{ flex: 1 }}>
            <Text style={type.caption}>Слой</Text>
            <Text style={type.headline} numberOfLines={1}>{layerTitle}</Text>
          </View>
          <Text style={styles.layerMore}>{lensCount ? `Все слои · ${lensCount + 3}` : 'Все слои'}</Text>
        </Pressable>
        <View style={styles.year}>
          <Text style={type.subhead}>Год</Text>
          <View style={{ flex: 1 }}>
            <Host matchContents={{ vertical: true }}>
              <Slider value={year} min={YEAR_MIN} max={YEAR_MAX} step={1} onValueChange={(v) => setApp({ year: Math.round(v) })} />
            </Host>
          </View>
          <Text style={[type.headline, styles.yearValue]}>{year >= YEAR_MAX ? 'сейчас' : year}</Text>
        </View>
      </View>
    </View>
  );
}

// Active walk: summary, then guidance with distance and direction to the next stop.
function WalkStrip() {
  const walk = useApp((s) => s.walk);
  const step = useApp((s) => s.walkStep);
  const me = useApp((s) => s.me);
  const viewBearing = 0;
  if (!walk || !walk.stops.length) return null;
  if (step === null) {
    return (
      <View style={styles.walk}>
        <Text style={type.headline}>Прогулка · {walk.stops.length} {plural(walk.stops.length, 'остановка', 'остановки', 'остановок')}</Text>
        <Text style={type.subhead}>{meters(walkMeters(walk))} {walk.routed ? 'по улицам' : 'оценка по прямой'}</Text>
        <View style={styles.row}>
          <Chip label="Начать" tone="accent" on onPress={() => { setApp({ walkStep: 0 }); startLocation(); flyTo(walk.stops[0].ll, 17); }} />
          <Chip label="Убрать с карты" onPress={() => setApp({ walk: null, walkStep: null })} />
        </View>
      </View>
    );
  }
  const s = walk.stops[step];
  if (!s) {
    return (
      <View style={styles.walk}>
        <Text style={type.headline}>Прогулка пройдена · {walk.stops.length} из {walk.stops.length}</Text>
        <Chip label="Готово" tone="accent" on onPress={() => setApp({ walk: null, walkStep: null })} />
      </View>
    );
  }
  const d = me ? dist(me.ll, s.ll) : null;
  const rot = me ? bearing(me.ll, s.ll) - viewBearing : 0;
  return (
    <View style={styles.walk}>
      <View style={styles.next}>
        <View style={styles.arrow} accessibilityLabel={me ? 'Направление к остановке' : 'Направление неизвестно'}>
          <Text style={{ fontSize: 22, transform: [{ rotate: `${rot}deg` }] }}>{me ? '↑' : '•'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.caption}>Остановка {step + 1} из {walk.stops.length}</Text>
          <Text style={type.headline}>{yearLabel(s.y, s.q)}{s.m ? ' · памятник' : ''}</Text>
          <Text style={type.subhead}>{d !== null ? `${meters(d)} по прямой` : `${meters(legMeters(walk, step))} от прошлой остановки`}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Chip label={me ? 'Я на месте' : 'Дальше'} tone="accent" on onPress={() => { setApp({ walkStep: step + 1 }); const n = walk.stops[step + 1]; if (n) flyTo(n.ll, 17); }} />
        <Chip label="О здании" onPress={() => setApp({ selected: { id: s.id, y: s.y, h: s.h, m: s.m, q: s.q, ll: s.ll } })} />
        <Chip label="Закончить" onPress={() => setApp({ walkStep: null })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  locate: { position: 'absolute', right: spacing.sm + 2, width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' },
  note: { position: 'absolute', left: spacing.md, right: 64, backgroundColor: 'rgba(34,32,28,0.9)', color: colors.card, padding: 10, borderRadius: radius.md, fontSize: 13 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    borderCurve: 'continuous', paddingHorizontal: spacing.md, paddingTop: spacing.sm + 4, paddingBottom: spacing.sm, gap: spacing.sm,
    boxShadow: '0 -4px 16px rgba(20,25,28,0.10)' },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  year: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  yearValue: { minWidth: 56, textAlign: 'right', fontVariant: ['tabular-nums'] },
  walk: { gap: 6, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  next: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nearby: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 2, borderRadius: 14, padding: 10, backgroundColor: colors.paper },
  nearbyDot: { width: 14, height: 14, borderRadius: 7 },
  layerBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderRadius: 14, borderCurve: 'continuous',
    paddingVertical: 8, paddingHorizontal: 12 },
  layerMore: { color: colors.accent, fontSize: 15, fontWeight: '500' },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
});
