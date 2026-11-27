// Stamps tab: the travel journal. Every city you collected in, and the city under the map, with all its stamps.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Journal } from '@/components/journal';
import { useJournal } from '@/data/stamps';
import { colors, spacing, type } from '@/theme';
import { plural } from '@/utils/format';

export function StampsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const journal = useJournal();
  const got = Object.values(journal);
  const cities = new Set(got.map((c) => c.gm)).size;
  return (
    <ScrollView style={styles.fill} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={type.display}>Печати</Text>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Профиль и язык"
          style={({ pressed }) => [styles.profile, pressed && { opacity: 0.7 }]}>
          <Icon name="person" size={22} color={colors.ink} />
        </Pressable>
      </View>
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
  profile: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
});
