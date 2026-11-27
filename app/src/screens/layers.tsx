// Layers sheet: everything the map can show here. One colouring at a time (a base layer or a city layer), stamps on top.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Swatches } from '@/components/swatches';
import { CITIES, LENS_CITIES, LENS_COLORS } from '@/data/config';
import { BASE_LAYERS, sectionRu } from '@/data/layers';
import { type CityLenses, type Lens, loadLenses } from '@/data/places';
import { flyTo, setApp, useApp } from '@/data/store';
import { LensDetail } from '@/screens/lenses';
import { colors, spacing, type } from '@/theme';
import { num, plural } from '@/utils/format';

export function LayersSheet() {
  const router = useRouter();
  const gm = useApp((s) => s.gm);
  const mode = useApp((s) => s.mode);
  const lensId = useApp((s) => s.lensId);
  const showStamps = useApp((s) => s.showStamps);
  const stampsHere = useApp((s) => s.stampsHere);
  const [city, setCity] = useState<CityLenses | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { let live = true; loadLenses(gm?.code).then((c) => live && setCity(c)); return () => { live = false; }; }, [gm?.code]);

  const lens = city?.layers.find((l) => l.id === open);
  if (lens) return <LensDetail lens={lens} onBack={() => setOpen(null)} onClose={() => router.back()} />;

  const sections: { title: string; data: Lens[] }[] = [];
  for (const l of city?.layers ?? []) {
    let s = sections.find((x) => x.title === l.section);
    if (!s) sections.push((s = { title: l.section, data: [] }));
    s.data.push(l);
  }
  const lensCities = CITIES.filter((c) => LENS_CITIES.has(c.code));

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.title}>
        <Text style={type.title}>Слои</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}><Text style={styles.done}>Готово</Text></Pressable>
      </View>
      <Text style={type.subhead}>{gm ? `${gm.name} · ${gm.province}` : 'Нидерланды'}. Здания окрашивает один слой, печати лежат поверх.</Text>

      <Text style={styles.head}>Раскраска зданий</Text>
      <View style={styles.group}>
        {BASE_LAYERS.map((l) => {
          const on = mode === l.id && !lensId;
          return (
            <Row key={l.id} on={on} onPress={() => setApp({ mode: l.id, lensId: null })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.body, on && styles.onText]}>{l.title}</Text>
                <Text style={type.caption}>{l.note}</Text>
              </View>
              <Swatches colors={l.swatches} />
            </Row>
          );
        })}
      </View>

      <Text style={styles.head}>Поверх карты</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.body}>Печати</Text>
            <Text style={type.caption}>
              {stampsHere.length ? `${stampsHere.length} ${plural(stampsHere.length, 'здание', 'здания', 'зданий')} здесь, где можно поставить печать` : 'В этом месте печатей нет'}
            </Text>
          </View>
          <Switch value={showStamps} onValueChange={(v) => setApp({ showStamps: v })} trackColor={{ true: colors.accent }} accessibilityLabel="Печати на карте" />
        </View>
      </View>

      <Text style={styles.head}>{city ? `Темы города · ${city.city} · ${city.layers.length}` : 'Темы города'}</Text>
      {city ? sections.map((s) => (
        <View key={s.title} style={{ gap: 4 }}>
          <Text style={styles.sub}>{sectionRu(s.title)}</Text>
          <View style={styles.group}>
            {s.data.map((l) => {
              const on = l.id === lensId;
              return (
                <Row key={l.id} on={on} onPress={() => { setApp({ lensId: l.id }); setOpen(l.id); }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.body, on && styles.onText]}>{l.title}</Text>
                    <Text style={[type.caption, { fontVariant: ['tabular-nums'] }]}>
                      {l.era ? `${l.era} · ` : ''}{num(l.count)} {plural(l.count, 'здание', 'здания', 'зданий')}
                    </Text>
                  </View>
                  <Swatches colors={l.groups.slice(0, 6).map((_, i) => LENS_COLORS[i % LENS_COLORS.length])} width={8 * Math.min(l.groups.length, 6)} />
                </Row>
              );
            })}
          </View>
        </View>
      )) : (
        <View style={[styles.group, { padding: spacing.md, gap: spacing.sm }]}>
          <Text style={type.subhead}>
            Здесь тем пока нет. Темы — это слои истории города: торговля, война, вера, архитектура. Пока они есть в двух городах: {lensCities.map((c) => c.name).join(' и ')}.
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {lensCities.map((c) => (
              <Chip key={c.code} label={c.name} onPress={() => { router.back(); flyTo(c.center, 15.3, { pitch: 55, bearing: -20 }); }} />
            ))}
          </View>
        </View>
      )}
      {lensId && city ? <Chip label="Снять тему, вернуть период постройки" onPress={() => setApp({ lensId: null, mode: 'periods' })} /> : null}

      <Text style={[type.caption, { marginTop: spacing.lg }]}>
        Источники: 3D BAG (CC BY 4.0), BAG (CC0), RCE (CC BY), Kadaster BRT Top10NL и BRK (CC BY 4.0), Natural Earth, Wikidata и Wikimedia Commons. Темы и истории — сайты LAYRS Амстердам и Делфт.
      </Text>
    </ScrollView>
  );
}

function Row({ on, onPress, children }: { on: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.chip }]}>
      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  title: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  done: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  head: { ...type.headline, marginTop: spacing.md },
  sub: { ...type.caption, marginTop: spacing.xs },
  group: { backgroundColor: colors.card, borderRadius: 12, borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  onText: { fontWeight: '600' },
});
