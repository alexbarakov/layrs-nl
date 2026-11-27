// Travel journal: per city, every stamp of that city; collected ones in ink with a date, the rest as faint outlines.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StampArt } from '@/components/stamp-art';
import { type CityStamps, loadStamps, useJournal } from '@/data/stamps';
import { flyTo, setApp, useApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';

export function Journal() {
  const journal = useJournal();
  const here = useApp((s) => s.gm);
  const [cities, setCities] = useState<CityStamps[]>([]);
  const codes = [...new Set([...(here ? [here.code] : []), ...Object.values(journal).sort((a, b) => b.at - a.at).map((c) => c.gm)])];
  const key = codes.join(',');
  useEffect(() => {
    let live = true;
    Promise.all(codes.map(loadStamps)).then((all) => { if (live) setCities(all.filter((c): c is CityStamps => !!c)); });
    return () => { live = false; };
  }, [key]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ gap: spacing.md }}>
      {cities.map((c) => <CityPage key={c.gm} city={c} />)}
    </View>
  );
}

function CityPage({ city }: { city: CityStamps }) {
  const router = useRouter();
  const journal = useJournal();
  const got = city.stamps.filter((s) => journal[s.id]).length;
  const open = (id: string) => {
    const s = city.stamps.find((x) => x.id === id)!;
    setApp({ stampsHere: city.stamps, stampsCity: city.name, stampId: id });
    flyTo(s.ll, 16.5, { pitch: 45 });
    router.navigate('/');
  };
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Text style={type.headline}>{city.name}</Text>
        <Text style={[type.subhead, { fontVariant: ['tabular-nums'] }]} accessibilityLabel={`${got} из ${city.stamps.length} печатей`}>{got} / {city.stamps.length}</Text>
      </View>
      <View style={styles.bar}><View style={[styles.fill, { width: `${(100 * got) / city.stamps.length}%` }]} /></View>
      <View style={styles.grid}>
        {city.stamps.map((s) => {
          const c = journal[s.id];
          return (
            <Pressable key={s.id} accessibilityRole="button" onPress={() => open(s.id)} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}>
              <StampArt id={s.id} name={s.name_nl || s.name} era={s.era} year={s.year} img={s.img} size={88} collected={!!c} date={c?.at} />
              <Text style={[type.caption, styles.name]} numberOfLines={2}>{s.name_nl || s.name}</Text>
              {c ? <Text style={[type.caption, styles.date]}>{new Date(c.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.card, borderRadius: 12, borderCurve: 'continuous', padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.chip, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-start' },
  cell: { width: 96, alignItems: 'center', gap: 4, paddingVertical: 4 },
  name: { textAlign: 'center', color: colors.ink },
  date: { textAlign: 'center' },
});
