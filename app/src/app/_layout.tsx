import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { loadMunicipalities } from '@/data/places';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => { loadMunicipalities().finally(() => SplashScreen.hideAsync()); }, []);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="building" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.4, 0.75, 1.0],
        sheetInitialDetentIndex: 0, sheetLargestUndimmedDetentIndex: 0, headerShown: false,
      }} />
      <Stack.Screen name="lenses" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.6, 1.0], headerShown: false,
      }} />
    </Stack>
  );
}
