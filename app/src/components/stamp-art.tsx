// A stamp impression: the PNG rendered by pipeline/stamp_styles.py (five frames, a line drawing of the building in the
// centre, docs/stamps/requirements.md). States: not collected (a faint blind impression), near (ready to press),
// collected (full ink, tilted as if pressed by hand).
import { Image } from 'expo-image';
import { View } from 'react-native';

import { dataUrl } from '@/data/config';
import { STAMP_INK, tilt } from '@/data/stamps';

interface Props {
  id: string; name: string; era: number; year: number; img?: string; size?: number;
  collected?: boolean; near?: boolean; date?: number;
  /** draw without the hand tilt (the stamp sheet animates it) */
  straight?: boolean;
}

export const STAMP_OPACITY = { none: 0.16, near: 0.34, got: 0.95 };

export function stampLabel(name: string, year: number, collected: boolean, date?: number) {
  return `${name}, ${year}${collected ? (date ? `, печать от ${new Date(date).toLocaleDateString('ru-RU')}` : ', печать получена') : ', печать не получена'}`;
}

export function StampArt({ id, name, year, img, size = 96, collected = true, near = false, date, straight }: Props) {
  const opacity = collected ? STAMP_OPACITY.got : near ? STAMP_OPACITY.near : STAMP_OPACITY.none;
  const transform = collected && !straight ? [{ rotate: `${tilt(id)}deg` }] : undefined;
  if (img) {
    return (
      <Image source={{ uri: dataUrl(img) }} contentFit="contain" accessible accessibilityLabel={stampLabel(name, year, collected, date)}
        style={{ width: size, height: size, opacity, transform }} />
    );
  }
  // no image yet (data still loading or an old cache): an empty double ring, never letters
  const ring = Math.max(2, size / 40);
  return (
    <View accessible accessibilityLabel={stampLabel(name, year, collected, date)}
      style={{ width: size, height: size, opacity, transform, borderRadius: size / 2, borderWidth: ring, borderColor: STAMP_INK, padding: ring * 2 }}>
      <View style={{ flex: 1, borderRadius: size / 2, borderWidth: ring / 2, borderColor: STAMP_INK, borderStyle: collected ? 'solid' : 'dashed' }} />
    </View>
  );
}
