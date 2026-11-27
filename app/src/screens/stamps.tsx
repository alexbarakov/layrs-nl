// Stamps tab: the travel journal. Every city you collected in, and the city under the map, with all its stamps.
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Journal } from '@/components/journal';
import { useJournal } from '@/data/stamps';
import { colors, spacing, type } from '@/theme';
import { plural } from '@/utils/format';

export function StampsScreen() {
  const insets = useSafeAreaInsets();
  const journal = useJournal();
  const got = Object.values(journal);
  const cities = new Set(got.map((c) => c.gm)).size;
  return (
    <ScrollView style={styles.fill} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <Text style={type.title}>Печати</Text>
      <Text style={type.subhead}>
        {got.length
          ? `${got.length} ${plural(got.length, 'печать', 'печати', 'печатей')} в ${cities} ${plural(cities, 'городе', 'городах', 'городах')}. `
          : 'Дневник пока пуст. '}
        В каждом городе отмечены 5–20 главных зданий разных эпох. Подойдите к такому зданию ближе чем на 60 м, и печать можно поставить.
      </Text>
      <Journal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  wrap: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
});
