// Bottom menu (iteration 3), the same on iOS, Android and web: a dark capsule with Map, Walks, Stamps,
// and Search as its own round button. It floats over the screens; screens leave room with tabBarSpace().
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const flat = StyleSheet.flatten;
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { colors } from '@/theme';

export const TAB_BAR_H = 64;
/** Distance from the screen bottom to the top of the menu. */
export const tabBarSpace = (insetBottom: number) => Math.max(insetBottom, 12) + TAB_BAR_H;

const LIGHT = 'rgba(243,239,228,0.72)';

function TabButton({ icon, label, isFocused, ref, ...props }: TabTriggerSlotProps & { icon: string; label: string }) {
  return (
    <Pressable {...(props as any)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isFocused }}
      style={flat([styles.tab, isFocused && styles.tabOn])}>
      <Icon name={icon} size={24} color={isFocused ? colors.ink : LIGHT} width={1.7} />
      <Text style={[styles.label, isFocused && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

function SearchButton({ isFocused, ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...(props as any)} accessibilityRole="tab" accessibilityLabel="Поиск" accessibilityState={{ selected: isFocused }}
      style={flat([styles.search, isFocused && styles.tabOn])}>
      <Icon name="search" size={24} color={isFocused ? colors.ink : colors.paper} width={2} />
    </Pressable>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);
  // TabList needs the triggers as direct children, so the dark capsule is drawn behind them as its own view
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <View pointerEvents="none" style={flat([styles.capsule, { bottom }])} />
      <TabList asChild>
        <View style={flat([styles.row, { bottom }])}>
          <TabTrigger name="index" href="/" asChild><TabButton icon="map" label="Карта" /></TabTrigger>
          <TabTrigger name="walks" href="/walks" asChild><TabButton icon="route" label="Маршруты" /></TabTrigger>
          <TabTrigger name="stamps" href="/stamps" asChild><TabButton icon="stamp" label="Печати" /></TabTrigger>
          <TabTrigger name="search" href="/search" asChild><SearchButton /></TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const shadow = { boxShadow: '0 6px 18px rgba(29,27,23,0.35)' } as const;
const styles = StyleSheet.create({
  row: { position: 'absolute', left: 12, right: 12, height: TAB_BAR_H, flexDirection: 'row', alignItems: 'center', paddingLeft: 5 },
  capsule: { position: 'absolute', left: 12, right: 12 + TAB_BAR_H + 10, height: TAB_BAR_H, borderRadius: TAB_BAR_H / 2, backgroundColor: 'rgba(29,27,23,0.94)', ...shadow },
  tab: { flex: 1, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabOn: { backgroundColor: colors.paper },
  label: { fontSize: 11, fontWeight: '600', color: LIGHT },
  search: { marginLeft: 15, width: TAB_BAR_H, height: TAB_BAR_H, borderRadius: TAB_BAR_H / 2, backgroundColor: 'rgba(29,27,23,0.94)', alignItems: 'center', justifyContent: 'center', ...shadow },
});
