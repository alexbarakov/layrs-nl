// A stamp impression: the rendered PNG from pipeline/stamp_styles.py (five designs), or a drawn monogram as a fallback.
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { dataUrl } from '@/data/config';
import { STAMP_INK, tilt } from '@/data/stamps';

interface Props { id: string; name: string; era: number; year: number; img?: string; size?: number; collected?: boolean; date?: number }

const monogram = (name: string) =>
  name.replace(/[^\p{L}\s'-]/gu, ' ').split(/\s+/).filter((w) => w.length > 2 && !/^(de|het|van|the|of|en)$/i.test(w))
    .slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 1).toUpperCase();

export function StampArt({ id, name, era, year, img, size = 96, collected = true, date }: Props) {
  const ink = STAMP_INK;
  const ring = Math.max(2, size / 40);
  // the pipeline renders the whole impression (frame, lettering, sketch, ink texture) into one PNG
  if (img) {
    return (
      <Image source={{ uri: dataUrl(img) }} contentFit="contain" accessible
        accessibilityLabel={`${name}, ${year}${collected ? (date ? `, печать от ${new Date(date).toLocaleDateString('ru-RU')}` : ', печать получена') : ', печать не получена'}`}
        style={{ width: size, height: size, opacity: collected ? 0.95 : 0.18, transform: collected ? [{ rotate: `${tilt(id)}deg` }] : undefined }} />
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${year}${collected ? (date ? `, печать от ${new Date(date).toLocaleDateString('ru-RU')}` : ', печать получена') : ', печать не получена'}`}
      style={{ width: size, height: size, transform: collected ? [{ rotate: `${tilt(id)}deg` }] : undefined, opacity: collected ? 0.92 : 0.28 }}>
      <View style={[styles.round, { borderColor: ink, borderWidth: ring, borderRadius: size / 2 }]}>
        <View style={[styles.round, styles.inner, { top: ring * 1.5, left: ring * 1.5, right: ring * 1.5, bottom: ring * 1.5,
          borderColor: ink, borderWidth: ring / 2, borderRadius: size / 2, borderStyle: collected ? 'solid' : 'dashed' }]}>
          {img ? (
            <Image source={{ uri: dataUrl(img) }} tintColor={ink} contentFit="contain" style={{ width: '82%', height: '82%' }} accessible={false} />
          ) : (
            <Text style={{ color: ink, fontSize: size * 0.32, fontWeight: '700', fontFamily: 'Georgia', letterSpacing: 1 }}>{monogram(name)}</Text>
          )}
        </View>
      </View>
      {size >= 80 ? (
        <Text style={[styles.year, { color: ink, fontSize: Math.max(9, size / 11), bottom: size * 0.06, backgroundColor: '#fffdf8' }]}>{year}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  round: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inner: { position: 'absolute' },
  year: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 4, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 1 },
});
