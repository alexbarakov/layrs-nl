// Stamp sheet: the landmark, how far you are, and the stamp once you stand next to it.
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Chip } from '@/components/chip';
import { StampArt } from '@/components/stamp-art';
import { COLLECT_RADIUS_M, ERA_INK, ERA_LABEL, MAX_ACCURACY_M, STAMP_INK, collect, useJournal } from '@/data/stamps';
import { setApp, useApp } from '@/data/store';
import { dist } from '@/data/walk';
import { startLocation } from '@/hooks/use-location';
import { colors, spacing, type } from '@/theme';
import { meters } from '@/utils/format';

export function StampSheet() {
  const id = useApp((s) => s.stampId);
  const stamp = useApp((s) => s.stampsHere.find((x) => x.id === s.stampId));
  const city = useApp((s) => s.stampsCity);
  const me = useApp((s) => s.me);
  const journal = useJournal();
  const reduce = useReducedMotion();
  const [note, setNote] = useState<string | null>(null);
  const scale = useSharedValue(1), rot = useSharedValue(0);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }] }));
  useEffect(() => () => setApp({ stampId: null }), []);
  useEffect(() => { if (!me) startLocation(); }, [me]);

  if (!id || !stamp) return <View style={styles.wrap}><Text style={type.subhead}>Печать не найдена.</Text></View>;
  const got = journal[stamp.id];
  const d = me ? dist(me.ll, stamp.ll) : null;
  const accurate = !!me && me.acc <= MAX_ACCURACY_M;
  const near = d !== null && d <= COLLECT_RADIUS_M && accurate;
  const ink = STAMP_INK;
  const eraInk = ERA_INK[stamp.era];

  const stampIt = () => {
    if (!near || got) return;
    collect(stamp, city ?? '');
    if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!reduce) {
      scale.value = 1.35; rot.value = -14;
      scale.value = withSequence(withTiming(0.92, { duration: 140 }), withSpring(1, { damping: 9 }));
      rot.value = withSpring(0, { damping: 10 });
    }
    setNote('Печать в дневнике.');
  };

  let status: string;
  if (got) status = `Получена ${new Date(got.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  else if (!me) status = 'Определяю, где вы…';
  else if (!accurate) status = `Геопозиция неточная (±${Math.round(me.acc)} м). Выйдите на открытое место.`;
  else if (near) status = 'Вы на месте. Можно поставить печать.';
  else status = `До здания ${meters(d!)}. Печать ставится в радиусе ${COLLECT_RADIUS_M} м.`;

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      <Animated.View style={[styles.art, press]}>
        <StampArt id={stamp.id} name={stamp.name} era={stamp.era} year={stamp.year} img={stamp.img} size={180} collected={!!got || near} date={got?.at} />
      </Animated.View>
      <Text style={[type.title, styles.center]}>{stamp.name}</Text>
      {stamp.name_nl && stamp.name_nl !== stamp.name ? <Text style={[type.subhead, styles.center]}>{stamp.name_nl}</Text> : null}
      <Text style={[type.caption, styles.center, { color: eraInk }]}>{stamp.year} · {ERA_LABEL[stamp.era]}{city ? ` · ${city}` : ''}</Text>
      <Text style={[type.body, styles.center]} accessibilityLiveRegion="polite">{note ?? status}</Text>
      {!got ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !near }} disabled={!near} onPress={stampIt}
          style={({ pressed }) => [styles.button, { backgroundColor: near ? ink : colors.chip }, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.buttonText, { color: near ? colors.card : colors.mute }]}>Поставить печать</Text>
        </Pressable>
      ) : null}
      <View style={styles.row}>
        {stamp.wiki ? <Chip label="Википедия" onPress={() => WebBrowser.openBrowserAsync(stamp.wiki)} /> : null}
      </View>
      {stamp.credit ? (
        <Text style={[type.caption, styles.center]}>
          Зарисовка по фото: {stamp.credit.author || 'автор не указан'}, {stamp.credit.license || 'лицензия на Commons'}.{' '}
          <Text style={{ color: colors.accent }} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(stamp.credit!.source)}>Wikimedia Commons</Text>
        </Text>
      ) : null}
      {me?.simulated ? <Text style={[type.caption, styles.center]}>Позиция задана вручную (режим разработки).</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, alignItems: 'stretch' },
  art: { alignSelf: 'center', marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  button: { alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999, marginVertical: spacing.sm },
  buttonText: { fontSize: 17, fontWeight: '600' },
});
