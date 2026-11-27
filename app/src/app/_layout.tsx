import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { loadMunicipalities } from '@/data/places';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady] = useFonts({ Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  useEffect(() => { if (fontsReady) loadMunicipalities().finally(() => SplashScreen.hideAsync()); }, [fontsReady]);
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
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75, 1.0], headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }} />
      <Stack.Screen name="map-settings" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.62, 1.0], headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }} />
      <Stack.Screen name="place" options={{
        presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.9], headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }} />
      <Stack.Screen name="profile" options={{ presentation: 'card', headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
    </Stack>
  );
}
