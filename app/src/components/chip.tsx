// Pill toggle. Rows highlight by background; no scale-on-press.
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

export function Chip({ label, on, onPress, style, tone }: { label: string; on?: boolean; onPress: () => void; style?: ViewStyle; tone?: 'accent' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [styles.chip, on && (tone === 'accent' ? styles.accent : styles.on), pressed && styles.pressed, style]}>
      <Text style={[styles.label, on && styles.onLabel]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.chip, minHeight: 36, justifyContent: 'center' },
  on: { backgroundColor: colors.ink },
  accent: { backgroundColor: colors.accent },
  pressed: { opacity: 0.75 },
  label: { fontSize: 14, color: colors.ink },
  onLabel: { color: colors.card },
});
