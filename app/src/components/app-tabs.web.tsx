// Tabs in the web preview: a bottom bar like the phone's, built from expo-router/ui.
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...(props as any)} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} style={styles.tab}>
      <Text style={[styles.label, isFocused && styles.on]}>{children}</Text>
    </Pressable>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={styles.bar}>
          <TabTrigger name="index" href="/" asChild><TabButton>Карта</TabButton></TabTrigger>
          <TabTrigger name="walks" href="/walks" asChild><TabButton>Маршруты</TabButton></TabTrigger>
          <TabTrigger name="stamps" href="/stamps" asChild><TabButton>Печати</TabButton></TabTrigger>
          <TabTrigger name="search" href="/search" asChild><TabButton>Поиск</TabButton></TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.card, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 12, color: colors.mute },
  on: { color: colors.accent, fontWeight: '600' },
});
