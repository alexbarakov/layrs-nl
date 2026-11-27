// Two-thumb slider for a range of years. Plain PanResponder, so it works the same on iOS, Android and web.
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { PERIODS } from '@/data/config';
import { colors } from '@/theme';

const THUMB = 30;

export function RangeSlider({ min, max, from, to, onChange, step = 1 }: {
  min: number; max: number; from: number; to: number; step?: number; onChange: (from: number, to: number) => void;
}) {
  const [w, setW] = useState(0);
  const live = useRef({ from, to, w, min, max }); live.current = { from, to, w, min, max };
  const toX = (v: number) => ((v - min) / (max - min)) * Math.max(1, w - THUMB);
  const toV = (x: number) => {
    const { w, min, max } = live.current;
    const v = min + (Math.min(Math.max(0, x), w - THUMB) / Math.max(1, w - THUMB)) * (max - min);
    return Math.round(v / step) * step;
  };
  const thumb = (which: 'from' | 'to') => {
    const start = useRef(0);
    return useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { const c = live.current; start.current = ((c[which] - c.min) / (c.max - c.min)) * (c.w - THUMB); },
      onPanResponderMove: (_, g) => {
        const c = live.current, v = toV(start.current + g.dx);
        if (which === 'from') onChange(Math.min(v, c.to - step * 10), c.to);
        else onChange(c.from, Math.max(v, c.from + step * 10));
      },
    })).current;
  };
  const a = thumb('from'), b = thumb('to');
  const span = PERIODS.map((p, i) => [p.from || min, PERIODS[i + 1]?.from ?? max, p.color] as const);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={styles.wrap}
      accessibilityRole="adjustable" accessibilityLabel={`Годы с ${from} по ${to}`}>
      <View style={[styles.track, { left: THUMB / 2, right: THUMB / 2 }]}>
        {span.map(([s, e, c]) => <View key={c} style={{ flex: Math.max(1, Math.min(e, max) - Math.max(s, min)), backgroundColor: c }} />)}
      </View>
      {w ? <>
        <View style={[styles.dim, { left: THUMB / 2, width: toX(from) }]} />
        <View style={[styles.dim, { left: toX(to) + THUMB / 2, right: THUMB / 2 }]} />
        <View {...a.panHandlers} hitSlop={12} style={[styles.thumb, { left: toX(from) }]} />
        <View {...b.panHandlers} hitSlop={12} style={[styles.thumb, { left: toX(to) }]} />
      </> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: THUMB + 8, justifyContent: 'center' },
  track: { position: 'absolute', height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  dim: { position: 'absolute', height: 8, backgroundColor: 'rgba(243,239,228,0.82)' },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: colors.card,
    borderWidth: 2, borderColor: colors.ink, boxShadow: '0 1px 5px rgba(0,0,0,0.3)' },
});
