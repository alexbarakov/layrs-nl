// Map tab (iteration 3): the map fills the screen. Place on the top left; layers, map settings and "me" on the right,
// zoom below them; at the bottom, what colours the buildings and the year. Everything else opens on demand.
import { Host, Slider } from '@expo/ui';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { Icon, IconTile } from '@/components/icon';
import { LayrsMap } from '@/components/layrs-map';
import { Swatches } from '@/components/swatches';
import { LENS_COLORS, YEAR_MAX, YEAR_MIN } from '@/data/config';
import { BASE_LAYERS, layerIcon, layerRu } from '@/data/layers';
import { loadLenses } from '@/data/places';
import { COLLECT_RADIUS_M, ERA_INK, MAX_ACCURACY_M, loadStamps, useJournal } from '@/data/stamps';
import { flyTo, getApp, setApp, useApp, zoomBy } from '@/data/store';
import { bearing, dist, legMeters, walkMeters } from '@/data/walk';
import { startLocation } from '@/hooks/use-location';
import { colors, font, radius, shadow, spacing, type } from '@/theme';
import { meters, plural, yearLabel } from '@/utils/format';

const QUICK_YEARS = [1500, 1650, 1700, 1850, 1940];

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
  const [lens, setLens] = useState<{ title: string; section: string; groups: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const country = zoom < 9;
  // the iOS tab bar floats over the screen
  const bottom = Platform.OS === 'ios' ? insets.bottom + 64 : spacing.md;

  // city layers follow the municipality under the map centre
  useEffect(() => {
    let live = true;
    loadLenses(gm?.code).then((c) => {
      if (!live) return;
      setLensCount(c ? c.layers.length : 0);
      const l = c?.layers.find((x) => x.id === lensId);
      setLens(l ? { title: l.title, section: l.section, groups: l.groups.length } : null);
      if (!c && lensId) setApp({ lensId: null });
    });
    return () => { live = false; };
  }, [gm?.code, lensId]);

  useEffect(() => { if (selected) router.push('/building'); }, [selected, router]);
  useEffect(() => { if (stampId) router.push('/stamp'); }, [stampId, router]);

  useEffect(() => {
    let live = true;
    loadStamps(gm?.code).then((c) => { if (live) setApp({ stampsHere: c?.stamps ?? [], stampsCity: c?.name ?? null }); });
    return () => { live = false; };
  }, [gm?.code]);

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

  const base = BASE_LAYERS.find((l) => l.id === mode)!;
  const place = country ? 'Нидерланды' : gm?.name ?? 'Вне Нидерландов';
  const placeSub = country ? 'вся страна' : gm ? `${gm.province}${lensCount ? ` · ${lensCount} ${plural(lensCount, 'слой', 'слоя', 'слоёв')}` : ''}` : '';

  return (
    <View style={styles.fill}>
      <LayrsMap />

      <Pressable onPress={() => router.push('/place')} accessibilityRole="button" accessibilityLabel={`Место: ${place}. Сменить`}
        style={({ pressed }) => [styles.place, { top: insets.top + spacing.sm }, pressed && { opacity: 0.8 }]}>
        <View style={styles.placePin}><Icon name="pin" size={16} color={colors.card} width={2.2} /></View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.placeName} numberOfLines={1}>{place}</Text>
          {placeSub ? <Text style={styles.placeSub} numberOfLines={1}>{placeSub}</Text> : null}
        </View>
        <Icon name="down" size={14} color={colors.mute} width={2.4} />
      </Pressable>

      <View style={[styles.rail, { top: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.push('/layers')} accessibilityRole="button" accessibilityLabel="Слои"
          style={({ pressed }) => [styles.btn, styles.btnDelft, pressed && { opacity: 0.8 }]}>
          <Icon name="layers" size={24} color={colors.card} />
        </Pressable>
        <Pressable onPress={() => router.push('/map-settings')} accessibilityRole="button" accessibilityLabel="Настройки карты"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <Icon name="sliders" size={22} />
        </Pressable>
        <Pressable onPress={locate} accessibilityRole="button" accessibilityLabel="Моё место"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <SymbolView name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }} tintColor={colors.delft} size={20} />
        </Pressable>
      </View>

      <View style={[styles.zoom, { top: insets.top + 190 }]}>
        <Pressable onPress={() => zoomBy(1)} accessibilityRole="button" accessibilityLabel="Приблизить" style={({ pressed }) => [styles.zoomBtn, pressed && { backgroundColor: colors.chip }]}>
          <Icon name="plus" size={20} width={2.4} />
        </Pressable>
        <View style={styles.zoomLine} />
        <Pressable onPress={() => zoomBy(-1)} accessibilityRole="button" accessibilityLabel="Отдалить" style={({ pressed }) => [styles.zoomBtn, pressed && { backgroundColor: colors.chip }]}>
          <Icon name="minus" size={20} width={2.4} />
        </Pressable>
      </View>

      {note ? <Text accessibilityLiveRegion="polite" style={[styles.note, { top: insets.top + 70 }]}>{note}</Text> : null}

      <View style={[styles.bottom, { bottom }]}>
        {nearby ? (
          <Pressable accessibilityRole="button" onPress={() => setApp({ stampId: nearby.st.id })}
            style={({ pressed }) => [styles.card, styles.nearby, { borderColor: ERA_INK[nearby.st.era] }, pressed && { opacity: 0.85 }]}>
            <Icon name="stamp" size={24} color={colors.accent} />
            <Text style={[type.headline, { flex: 1 }]} numberOfLines={2}>Вы у {nearby.st.name_nl || nearby.st.name} — поставить печать</Text>
          </Pressable>
        ) : null}
        <WalkStrip />
        {timeOpen ? <TimeCard year={year} onClose={() => { setTimeOpen(false); setApp({ year: YEAR_MAX }); }} /> : (
          <View style={styles.row}>
            {lens ? (
              <View style={[styles.pill, { flexShrink: 1, paddingLeft: 8 }]}>
                <Pressable onPress={() => router.push(`/layers?open=${lensId}`)} accessibilityRole="button" accessibilityLabel={`Слой ${layerRu(lens.title)}. Подробнее`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                  <IconTile name={layerIcon(lens.title, lens.section)} size={32} />
                  <View style={{ flexShrink: 1, gap: 3 }}>
                    <Text style={styles.pillText} numberOfLines={1}>{layerRu(lens.title)}</Text>
                    <Swatches colors={Array.from({ length: Math.min(lens.groups, 6) }, (_, i) => LENS_COLORS[i])} width={8 * Math.min(lens.groups, 6)} />
                  </View>
                </Pressable>
                <Pressable onPress={() => setApp({ lensId: null })} accessibilityRole="button" accessibilityLabel="Снять слой" hitSlop={10} style={styles.pillClose}>
                  <Icon name="close" size={14} width={2.6} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => router.push('/map-settings')} accessibilityRole="button" accessibilityLabel={`Цвет зданий: ${base.title}. Настройки карты`}
                style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}>
                <Swatches colors={base.swatches} width={48} />
                <Text style={styles.pillText}>{base.title}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setTimeOpen(true)} accessibilityRole="button" accessibilityLabel={`Год: ${year >= YEAR_MAX ? 'сейчас' : year}. Показать город в другом году`}
              style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}>
              <Icon name="hourglass" size={18} />
              <Text style={[styles.pillText, { fontVariant: ['tabular-nums'] }]}>{year >= YEAR_MAX ? 'Сейчас' : year}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// The year card: the city as it stood in a given year, quick years, and the growth of the city played from 1300 to now.
function TimeCard({ year, onClose }: { year: number; onClose: () => void }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const play = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; setPlaying(false); return; }
    let y = YEAR_MIN;
    setPlaying(true);
    timer.current = setInterval(() => {
      y += y < 1800 ? 25 : 8;
      if (y >= YEAR_MAX) { y = YEAR_MAX; clearInterval(timer.current!); timer.current = null; setPlaying(false); }
      setApp({ year: y });
    }, 120);
  };
  return (
    <View style={[styles.card, { gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Text style={type.caption}>Город в году</Text>
          <Text style={styles.year}>{year >= YEAR_MAX ? 'сейчас' : year}</Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть и вернуться в сейчас" style={styles.round}>
          <Icon name="close" size={16} width={2.4} />
        </Pressable>
      </View>
      <Host matchContents={{ vertical: true }}>
        <Slider value={year} min={YEAR_MIN} max={YEAR_MAX} step={1} onValueChange={(v) => setApp({ year: Math.round(v) })} />
      </Host>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {QUICK_YEARS.map((y) => <Chip key={y} label={String(y)} on={year === y} onPress={() => setApp({ year: y })} />)}
      </View>
      <Pressable onPress={play} accessibilityRole="button" style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}>
        <Text style={styles.playText}>{playing ? 'Остановить' : 'Рост города: 1300 → сейчас'}</Text>
      </Pressable>
    </View>
  );
}

// Active walk: summary, then guidance with distance and direction to the next stop.
function WalkStrip() {
  const walk = useApp((s) => s.walk);
  const step = useApp((s) => s.walkStep);
  const me = useApp((s) => s.me);
  if (!walk || !walk.stops.length) return null;
  if (step === null) {
    return (
      <View style={[styles.card, { gap: 6 }]}>
        <Text style={type.headline}>Прогулка · {walk.stops.length} {plural(walk.stops.length, 'остановка', 'остановки', 'остановок')}</Text>
        <Text style={type.subhead}>{meters(walkMeters(walk))} {walk.routed ? 'по улицам' : 'оценка по прямой'}</Text>
        <View style={[styles.row, { justifyContent: 'flex-start' }]}>
          <Chip label="Начать" tone="accent" on onPress={() => { setApp({ walkStep: 0 }); startLocation(); flyTo(walk.stops[0].ll, 17); }} />
          <Chip label="Убрать с карты" onPress={() => setApp({ walk: null, walkStep: null })} />
        </View>
      </View>
    );
  }
  const s = walk.stops[step];
  if (!s) {
    return (
      <View style={[styles.card, { gap: 6 }]}>
        <Text style={type.headline}>Прогулка пройдена · {walk.stops.length} из {walk.stops.length}</Text>
        <Chip label="Готово" tone="accent" on onPress={() => setApp({ walk: null, walkStep: null })} />
      </View>
    );
  }
  const d = me ? dist(me.ll, s.ll) : null;
  const rot = me ? bearing(me.ll, s.ll) : 0;
  return (
    <View style={[styles.card, { gap: 8 }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={styles.arrow} accessibilityLabel={me ? 'Направление к остановке' : 'Направление неизвестно'}>
          <Text style={{ fontSize: 22, transform: [{ rotate: `${rot}deg` }] }}>{me ? '↑' : '•'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.caption}>Остановка {step + 1} из {walk.stops.length}</Text>
          <Text style={type.headline}>{yearLabel(s.y, s.q)}{s.m ? ' · памятник' : ''}</Text>
          <Text style={type.subhead}>{d !== null ? `${meters(d)} по прямой` : `${meters(legMeters(walk, step))} от прошлой остановки`}</Text>
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'flex-start' }]}>
        <Chip label={me ? 'Я на месте' : 'Дальше'} tone="accent" on onPress={() => { setApp({ walkStep: step + 1 }); const n = walk.stops[step + 1]; if (n) flyTo(n.ll, 17); }} />
        <Chip label="О здании" onPress={() => setApp({ selected: { id: s.id, y: s.y, h: s.h, m: s.m, q: s.q, ll: s.ll } })} />
        <Chip label="Закончить" onPress={() => setApp({ walkStep: null })} />
      </View>
    </View>
  );
}

const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, ...shadow } as const;
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  place: { position: 'absolute', left: spacing.sm + 4, maxWidth: 260, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 8, paddingRight: 14, paddingVertical: 6, borderRadius: radius.pill, ...card },
  placePin: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontFamily: font.bold, fontSize: 18, color: colors.ink, letterSpacing: -0.3 },
  placeSub: { fontSize: 11, color: colors.mute },
  rail: { position: 'absolute', right: spacing.sm + 4, gap: 8 },
  btn: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', ...card },
  btnDelft: { backgroundColor: colors.delft, borderColor: colors.delft },
  zoom: { position: 'absolute', right: spacing.sm + 4, width: 46, borderRadius: radius.md, overflow: 'hidden', ...card },
  zoomBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  zoomLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginHorizontal: 9 },
  note: { position: 'absolute', left: spacing.md, right: 70, backgroundColor: 'rgba(29,27,23,0.9)', color: colors.card, padding: 10, borderRadius: radius.md, fontSize: 13 },
  bottom: { position: 'absolute', left: spacing.sm + 4, right: spacing.sm + 4, gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  pill: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, ...card },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  pillClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20, padding: 14, ...card },
  nearby: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2 },
  year: { fontFamily: font.bold, fontSize: 32, color: colors.ink, fontVariant: ['tabular-nums'] },
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  play: { height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.card, fontSize: 15, fontWeight: '600' },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
});
