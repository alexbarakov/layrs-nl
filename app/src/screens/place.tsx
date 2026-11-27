// "Where to look": my position, the whole country, cities with layers, other cities with their stamps. Any address: Search tab.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { CITIES, HOME, LENS_CITIES } from '@/data/config';
import { loadStampIndex, type StampIndex, useJournal } from '@/data/stamps';
import { flyTo, getApp, useApp } from '@/data/store';
import { startLocation } from '@/hooks/use-location';
import { colors, spacing, type } from '@/theme';
import { plural } from '@/utils/format';

const LAYER_COUNT: Record<string, number> = { GM0363: 30, GM0503: 17 };

export function PlaceSheet() {
  const router = useRouter();
  const gm = useApp((s) => s.gm);
  const journal = useJournal();
  const [index, setIndex] = useState<StampIndex>({});
  useEffect(() => { loadStampIndex().then(setIndex); }, []);
  const got = (code: string) => Object.values(journal).filter((c) => c.gm === code).length;
  const go = (center: [number, number], zoom: number, pitch = 55) => { router.back(); flyTo(center, zoom, { pitch, bearing: -20 }); };
  const mine = async () => {
    router.back();
    await startLocation();
    const t = setInterval(() => { const me = getApp().me; if (me) { clearInterval(t); flyTo(me.ll, 16); } }, 300);
    setTimeout(() => clearInterval(t), 15000);
  };
  const withLayers = CITIES.filter((c) => LENS_CITIES.has(c.code));
  const others = CITIES.filter((c) => !LENS_CITIES.has(c.code));

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Text style={type.title}>Где смотреть</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.done}>Готово</Text></Pressable>
      </View>
      <Pressable onPress={() => { router.back(); router.navigate('/search'); }} accessibilityRole="search" style={styles.search}>
        <Icon name="search" size={18} color={colors.mute} />
        <Text style={[type.body, { color: colors.mute }]}>Город, район или адрес</Text>
      </Pressable>

      <View style={styles.group}>
        <Row icon="pin" title="Моё место" sub="Что рядом и ближайшие печати" onPress={mine} />
        <Row icon="map" title="Вся страна" sub="Все здания по году постройки" onPress={() => go(HOME.center, HOME.zoom, 0)} last />
      </View>

      <Text style={styles.label}>Города со слоями истории</Text>
      <View style={styles.group}>
        {withLayers.map((c, i) => (
          <Row key={c.code} title={c.name} on={gm?.code === c.code} last={i === withLayers.length - 1}
            sub={`${LAYER_COUNT[c.code]} ${plural(LAYER_COUNT[c.code], 'слой', 'слоя', 'слоёв')} · печати ${got(c.code)} из ${index[c.code]?.n ?? '…'}`}
            onPress={() => go(c.center, 15.3)} />
        ))}
      </View>

      <Text style={styles.label}>Другие города</Text>
      <View style={styles.group}>
        {others.map((c, i) => (
          <Row key={c.code} title={c.name} on={gm?.code === c.code} last={i === others.length - 1}
            value={index[c.code] ? `${index[c.code].n} ${plural(index[c.code].n, 'печать', 'печати', 'печатей')}` : ''} onPress={() => go(c.center, 15.3)} />
        ))}
      </View>
      <Text style={[type.caption, { marginTop: spacing.xs }]}>Любой другой город и адрес — в поиске.</Text>
    </ScrollView>
  );
}

function Row({ icon, title, sub, value, on, last, onPress }: { icon?: string; title: string; sub?: string; value?: string; on?: boolean; last?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [styles.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.chip }]}>
      {icon ? <Icon name={icon} size={20} color={colors.delft} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, on && { fontWeight: '600' }]}>{title}</Text>
        {sub ? <Text style={type.caption}>{sub}</Text> : null}
      </View>
      {value ? <Text style={type.subhead}>{value}</Text> : null}
      {on ? <Icon name="check" size={18} color={colors.accent} width={2.6} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  done: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.chip },
  label: { ...type.subhead, marginTop: spacing.md },
  group: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
});
