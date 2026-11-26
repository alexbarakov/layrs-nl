// Mine tab: saved buildings and walks, city packs and their sizes, data sources.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { removeWalk, toggleBuilding, useSaved } from '@/data/saved';
import { flyTo, setApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';
import { plural, yearLabel } from '@/utils/format';

// Measured on the current build (buildings z12-15, basemap, overview, walk stops and street graph, municipality bbox).
const PACKS: [string, number][] = [['Делфт', 8.8], ['Лейден', 10.2], ['Амстердам', 41.1], ['Гаага', 33.9], ['Роттердам', 65.5]];

export function MineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const saved = useSaved();
  return (
    <ScrollView style={styles.fill} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <Text style={type.title}>Мои</Text>

      <Text style={styles.label}>Сохранённые здания</Text>
      {saved.buildings.length ? (
        <View style={styles.group}>
          {saved.buildings.map((b) => (
            <View key={b.id} style={styles.item}>
              <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={() => {
                if (b.ll) flyTo(b.ll, 17, { pitch: 50 });
                setApp({ selected: b }); router.navigate('/');
              }}>
                <Text style={type.body}>{b.name || yearLabel(b.y, b.q)}</Text>
                <Text style={type.caption}>{[b.place, b.name ? yearLabel(b.y, b.q) : null, b.m ? 'памятник' : null].filter(Boolean).join(' · ')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Убрать из сохранённых" onPress={() => toggleBuilding(b)} hitSlop={8}>
                <Text style={styles.remove}>Убрать</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : <Text style={type.subhead}>Пока пусто. В карточке здания есть кнопка «Сохранить».</Text>}

      <Text style={styles.label}>Сохранённые прогулки</Text>
      {saved.walks.length ? (
        <View style={styles.group}>
          {saved.walks.map((w) => (
            <View key={w.at} style={styles.item}>
              <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={() => { setApp({ walk: w.walk, walkStep: null }); flyTo(w.walk.stops[0].ll, 15.5); router.navigate('/'); }}>
                <Text style={type.body}>{w.title}</Text>
                <Text style={type.caption}>{w.walk.stops.length} {plural(w.walk.stops.length, 'остановка', 'остановки', 'остановок')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Удалить прогулку" onPress={() => removeWalk(w.at)} hitSlop={8}>
                <Text style={styles.remove}>Удалить</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : <Text style={type.subhead}>Постройте прогулку во вкладке «Маршруты» и сохраните её.</Text>}

      <Text style={styles.label}>Города без сети</Text>
      <Text style={type.subhead}>Скачивание пакетов появится в нативной сборке. Размер пакета города сейчас:</Text>
      <View style={styles.group}>
        {PACKS.map(([n, mb]) => (
          <View key={n} style={styles.item}>
            <Text style={[type.body, { flex: 1 }]}>{n}</Text>
            <Text style={[type.caption, { fontVariant: ['tabular-nums'] }]}>{String(mb).replace('.', ',')} МБ</Text>
          </View>
        ))}
      </View>

      <Text style={styles.label}>Источники</Text>
      <Text style={type.subhead}>3D BAG (CC BY 4.0), BAG (CC0), RCE (CC BY), Kadaster BRT Top10NL и BRK (CC BY 4.0), Natural Earth. Линзы и истории — сайты LAYRS Амстердам и Делфт.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  wrap: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  label: { ...type.caption, marginTop: spacing.md },
  group: { backgroundColor: colors.card, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  remove: { color: colors.accent, fontSize: 14 },
});
