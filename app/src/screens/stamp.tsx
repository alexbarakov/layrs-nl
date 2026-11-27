// Stamp sheet: the landmark, how far you are, and the stamp once you stand next to it.
// Pressing the stamp plays a hand stamp: wind-up, strike, the impression inks in and settles at its tilt
// (docs/stamps/requirements.md, section 7). With reduce motion the impression just appears.
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';

import { Chip } from '@/components/chip';
import { StampArt } from '@/components/stamp-art';
import { COLLECT_RADIUS_M, ERA_INK, ERA_LABEL, MAX_ACCURACY_M, collect, tilt, useJournal } from '@/data/stamps';
import { setApp, useApp } from '@/data/store';
import { dist } from '@/data/walk';
import { startLocation } from '@/hooks/use-location';
import { colors, spacing, type } from '@/theme';
import { meters } from '@/utils/format';

const SIZE = 180;
// timings, ms
const WIND_UP = 170, STRIKE = 90, HOLD = 110, LIFT = 260, INK = 380;

export function StampSheet() {
  const id = useApp((s) => s.stampId);
  const stamp = useApp((s) => s.stampsHere.find((x) => x.id === s.stampId));
  const city = useApp((s) => s.stampsCity);
  const me = useApp((s) => s.me);
  const journal = useJournal();
  const reduce = useReducedMotion();
  const [note, setNote] = useState<string | null>(null);
  const [pressing, setPressing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // the hand stamp (handle and rubber), the fresh impression on top of the faint one, and the page under them
  const handY = useSharedValue(-SIZE * 0.6), handRot = useSharedValue(0), handOp = useSharedValue(0);
  const ink = useSharedValue(0), inkRot = useSharedValue(0), page = useSharedValue(1);
  const handStyle = useAnimatedStyle(() => ({ opacity: handOp.value, transform: [{ translateY: handY.value }, { rotate: `${handRot.value}deg` }] }));
  const inkStyle = useAnimatedStyle(() => ({ opacity: ink.value, transform: [{ rotate: `${inkRot.value}deg` }] }));
  const pageStyle = useAnimatedStyle(() => ({ transform: [{ scale: page.value }] }));

  useEffect(() => () => { setApp({ stampId: null }); timers.current.forEach(clearTimeout); }, []);
  useEffect(() => { if (!me) startLocation(); }, [me]);

  if (!id || !stamp) return <View style={styles.wrap}><Text style={type.subhead}>Печать не найдена.</Text></View>;
  const got = journal[stamp.id];
  const d = me ? dist(me.ll, stamp.ll) : null;
  const accurate = !!me && me.acc <= MAX_ACCURACY_M;
  const near = d !== null && d <= COLLECT_RADIUS_M && accurate;
  const eraInk = ERA_INK[stamp.era];
  const name = stamp.name_nl || stamp.name;
  const final = tilt(stamp.id);
  const native = process.env.EXPO_OS !== 'web';
  const later = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, ms)); };

  const stampIt = () => {
    if (!near || got || pressing) return;
    if (reduce) {
      collect(stamp, city ?? '');
      if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNote('Печать в дневнике.');
      return;
    }
    setPressing(true);
    // wind-up: the stamp rises above the page, tilted back
    handOp.set(withTiming(1, { duration: 80 }));
    handY.set(withSequence(
      withTiming(-SIZE * 0.8, { duration: WIND_UP, easing: Easing.out(Easing.quad) }),
      // strike: fast, accelerating down onto the page
      withTiming(-SIZE * 0.42, { duration: STRIKE, easing: Easing.in(Easing.cubic) }),
      withDelay(HOLD, withTiming(-SIZE * 0.95, { duration: LIFT, easing: Easing.out(Easing.cubic) })),
    ));
    handRot.set(withSequence(withTiming(-14, { duration: WIND_UP }), withTiming(final, { duration: STRIKE }),
      withDelay(HOLD, withTiming(final + 8, { duration: LIFT }))));
    handOp.set(withDelay(WIND_UP + STRIKE + HOLD + LIFT * 0.4, withTiming(0, { duration: LIFT * 0.6 })));
    // contact: the page gives a little, the impression inks in and settles at its hand tilt
    const contact = WIND_UP + STRIKE;
    page.set(withDelay(contact, withSequence(withTiming(0.965, { duration: 60 }), withSpring(1, { damping: 8, stiffness: 260 }))));
    inkRot.set(final - 4);
    ink.set(withDelay(contact + HOLD * 0.5, withTiming(1, { duration: INK, easing: Easing.out(Easing.quad) })));
    inkRot.set(withDelay(contact + HOLD, withSpring(final, { damping: 12, stiffness: 140 })));
    later(contact, () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); });
    later(contact + HOLD + INK, () => {
      collect(stamp, city ?? '');
      if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNote('Печать в дневнике.');
      setPressing(false);
    });
  };

  let status: string;
  if (got) status = `Получена ${new Date(got.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  else if (!me) status = 'Определяю, где вы…';
  else if (!accurate) status = `Геопозиция неточная (±${Math.round(me.acc)} м). Выйдите на открытое место.`;
  else if (near) status = 'Вы на месте. Можно поставить печать.';
  else status = `До здания ${meters(d!)}. Печать ставится в радиусе ${COLLECT_RADIUS_M} м.`;

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      <Animated.View style={[styles.art, pageStyle]}>
        {got && !pressing ? (
          <StampArt id={stamp.id} name={name} era={stamp.era} year={stamp.year} img={stamp.img} size={SIZE} collected date={got.at} />
        ) : (
          <>
            <StampArt id={stamp.id} name={name} era={stamp.era} year={stamp.year} img={stamp.img} size={SIZE} collected={false} near={near} />
            <Animated.View style={[StyleSheet.absoluteFill, inkStyle]} pointerEvents="none">
              <StampArt id={stamp.id} name={name} era={stamp.era} year={stamp.year} img={stamp.img} size={SIZE} collected straight />
            </Animated.View>
            <Animated.View style={[styles.hand, handStyle]} pointerEvents="none" accessible={false}>
              <HandStamp ink={eraInk} />
            </Animated.View>
          </>
        )}
      </Animated.View>
      <Text style={[type.title, styles.center]}>{name}</Text>
      {stamp.name_nl && stamp.name_nl !== stamp.name ? <Text style={[type.subhead, styles.center]}>{stamp.name}</Text> : null}
      <Text style={[type.caption, styles.center, { color: eraInk }]}>{stamp.year} · {ERA_LABEL[stamp.era]}{city ? ` · ${city}` : ''}</Text>
      <Text style={[type.body, styles.center]} accessibilityLiveRegion="polite">{note ?? status}</Text>
      {!got ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !near || pressing }} disabled={!near || pressing} onPress={stampIt}
          style={({ pressed }) => [styles.button, { backgroundColor: near ? eraInk : colors.chip }, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.buttonText, { color: near ? colors.card : colors.mute }]}>Поставить печать</Text>
        </Pressable>
      ) : null}
      <View style={styles.row}>
        {stamp.wiki ? <Chip label="Википедия" onPress={() => WebBrowser.openBrowserAsync(stamp.wiki)} /> : null}
      </View>
      {me?.simulated ? <Text style={[type.caption, styles.center]}>Позиция задана вручную (режим разработки).</Text> : null}
    </ScrollView>
  );
}

/** A wooden hand stamp seen from the side: knob, neck, block, rubber. */
function HandStamp({ ink }: { ink: string }) {
  return (
    <View style={styles.handBody}>
      <View style={styles.knob} />
      <View style={styles.neck} />
      <View style={styles.block} />
      <View style={[styles.rubber, { backgroundColor: ink }]} />
    </View>
  );
}

const WOOD = '#8a5a34', WOOD_DARK = '#5e3b20';
const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, alignItems: 'stretch' },
  art: { alignSelf: 'center', width: SIZE, height: SIZE, marginBottom: spacing.sm, marginTop: spacing.xl * 2 },   // room for the wind-up
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  button: { alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999, marginVertical: spacing.sm },
  buttonText: { fontSize: 17, fontWeight: '600' },
  hand: { position: 'absolute', left: 0, right: 0, top: 0, height: SIZE, alignItems: 'center', justifyContent: 'flex-end' },
  handBody: { alignItems: 'center', width: SIZE * 0.86 },
  knob: { width: 46, height: 40, borderRadius: 23, backgroundColor: WOOD, borderWidth: 2, borderColor: WOOD_DARK },
  neck: { width: 22, height: 34, marginTop: -6, backgroundColor: WOOD, borderLeftWidth: 2, borderRightWidth: 2, borderColor: WOOD_DARK },
  block: { width: '100%', height: 30, borderRadius: 6, borderCurve: 'continuous', backgroundColor: WOOD, borderWidth: 2, borderColor: WOOD_DARK },
  rubber: { width: '94%', height: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});
