// Position while the user wants it: asked for on first use (When In Use), never in the background.
import * as Location from 'expo-location';

import { dist } from '@/data/walk';
import { getApp, setApp } from '@/data/store';

let sub: Location.LocationSubscription | null = null;
let arrive: ((ll: [number, number]) => void) | null = null;

export async function startLocation(): Promise<'ok' | 'denied' | 'error'> {
  if (sub) return 'ok';
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return 'denied';
    sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
      (p) => {
        const ll: [number, number] = [p.coords.longitude, p.coords.latitude];
        setApp({ me: { ll, acc: p.coords.accuracy ?? 30 } });
        arrive?.(ll);
      },
    );
    return 'ok';
  } catch {
    return 'error';
  }
}
export function stopLocation() { sub?.remove(); sub = null; setApp({ me: null }); }

// guided walk: the next stop counts as visited within 25 m
arrive = (ll) => {
  const { walk, walkStep } = getApp();
  if (!walk || walkStep === null) return;
  const s = walk.stops[walkStep];
  if (s && dist(ll, s.ll) <= 25) setApp({ walkStep: walkStep + 1 });
};
