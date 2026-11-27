import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { loadMunicipalities } from '@/data/places';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => { loadMunicipalities().finally(() => SplashScreen.hideAsync()); }, []);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="building" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.4, 0.75, 1.0],
        sheetInitialDetentIndex: 0, sheetLargestUndimmedDetentIndex: 0, headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }} />
      <Stack.Screen name="stamp" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.7, 1.0], headerShown: false,
        // an impression needs plain paper under it, not the iOS glass with the map showing through
        contentStyle: { backgroundColor: colors.paper },
      }} />
      <Stack.Screen name="layers" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.6, 1.0], headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }} />
    </Stack>
  );
}
