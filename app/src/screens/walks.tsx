// Walks tab: three questions (from where, what to see, how long), then the route with its stops.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { removeWalk, saveWalk, useSaved } from '@/data/saved';
import { flyTo, getApp, setApp, useApp, type Walk } from '@/data/store';
import { type Interest, legMeters, planWalk, walkMeters, walkMinutes } from '@/data/walk';
import { startLocation } from '@/hooks/use-location';
import { colors, spacing, type } from '@/theme';
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
  const [loop, setLoop] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Walk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: Interest) => setWant((w) => { const n = new Set(w); n.has(k) ? n.delete(k) : n.add(k); if (!n.size) n.add('mon'); return n; });

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
      const w = await planWalk(origin, km, loop, want);
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
              <Text style={[type.body, { flex: 1 }]}>{yearLabel(s.y, s.q)}{s.m ? ` · памятник ${s.m}` : ''}</Text>
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
  result: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  stop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  n: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  nText: { color: colors.card, fontSize: 12, fontWeight: '600' },
});
