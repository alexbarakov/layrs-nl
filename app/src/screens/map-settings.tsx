// Map settings: what colours the buildings (period, monuments, height) and what lies on top (stamps, 3D tilt).
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon, IconTile } from '@/components/icon';
import { Swatches } from '@/components/swatches';
import { BASE_LAYERS } from '@/data/layers';
import { flyTo, getApp, setApp, useApp } from '@/data/store';
import { colors, font, radius, spacing, type } from '@/theme';

const THUMB = {
  periods: require('../../assets/layers/periods.jpg'),
  monuments: require('../../assets/layers/monuments.jpg'),
  height: require('../../assets/layers/height.jpg'),
};
const LEGEND: Record<string, string[]> = {
  periods: ['до 1600', '1800', '1914', '1965', '2000+'],
  monuments: ['рийксмонумент', 'остальные'],
  height: ['0 м', '12', '35', '70', '120+'],
};

export function MapSettingsSheet() {
  const router = useRouter();
  const mode = useApp((s) => s.mode);
  const lensId = useApp((s) => s.lensId);
  const tilt = useApp((s) => s.tilt);
  const cur = BASE_LAYERS.find((l) => l.id === mode)!;

  const setTilt = (v: boolean) => {
    setApp({ tilt: v });
    const view = getApp().view;
    flyTo(view.center, view.zoom, { pitch: v ? 55 : 0, bearing: view.bearing, duration: 500 });
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Text style={type.title}>Настройки карты</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.round}><Icon name="close" size={14} width={2.6} /></Pressable>
      </View>

      <Text style={type.subhead}>Чем окрасить здания</Text>
      <View style={styles.tiles} accessibilityRole="radiogroup">
        {BASE_LAYERS.map((l) => {
          const on = mode === l.id && !lensId;
          return (
            <Pressable key={l.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setApp({ mode: l.id, lensId: null })}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
              <View>
                <Image source={THUMB[l.id]} style={[styles.thumb, on && styles.thumbOn]} contentFit="cover" />
                {on ? <View style={styles.check}><Icon name="check" size={14} color={colors.card} width={3} /></View> : null}
              </View>
              <Text style={[styles.tileText, on && { color: colors.accent }]}>{l.title}</Text>
            </Pressable>
          );
        })}
      </View>
      {lensId ? <Text style={type.caption}>Сейчас здания окрашивает слой города. Выбор цвета снимет слой.</Text> : (
        <View style={styles.legend}>
          <Swatches colors={cur.swatches} width={330} />
          <View style={styles.legendRow}>{LEGEND[mode].map((t) => <Text key={t} style={type.caption}>{t}</Text>)}</View>
        </View>
      )}

      <Text style={[type.subhead, { marginTop: spacing.md }]}>Вид</Text>
      <View style={styles.group}>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <IconTile name="cube" size={40} />
          <View style={{ flex: 1 }}>
            <Text style={type.body}>Наклон 3D</Text>
            <Text style={type.caption}>Объёмные дома. Без наклона — план сверху</Text>
          </View>
          <Switch value={tilt} onValueChange={setTilt} trackColor={{ true: colors.delft }} accessibilityLabel="Наклон 3D" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, gap: 6 },
  thumb: { width: '100%', aspectRatio: 1.3, borderRadius: 14, borderWidth: 3, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.accent },
  check: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 13, fontFamily: font.semibold, color: colors.ink },
  legend: { gap: 4, padding: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  group: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
});
