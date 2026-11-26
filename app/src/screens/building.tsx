// Building sheet: short on top (year, period, height), stories and sources lower down.
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { LENS_COLORS, periodOf } from '@/data/config';
import { type CityLenses, lensesOf, loadLenses } from '@/data/places';
import { isSaved, toggleBuilding, useSaved } from '@/data/saved';
import { setApp, useApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';
import { num, Q_TEXT, yearLabel } from '@/utils/format';

export function BuildingSheet() {
  const b = useApp((s) => s.selected);
  const gm = useApp((s) => s.gm);
  const [city, setCity] = useState<CityLenses | null>(null);
  useSaved();
  useEffect(() => { loadLenses(gm?.code).then(setCity); }, [gm?.code]);
  useEffect(() => () => setApp({ selected: null }), []);
  if (!b) return <View style={styles.wrap}><Text style={type.subhead}>Здание не выбрано.</Text></View>;

  const p = periodOf(b.y);
  const lenses = lensesOf(city, b.id);
  const named = lenses.find((l) => l.note?.name)?.note?.name;
  const open = (url: string) => WebBrowser.openBrowserAsync(url);

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.head}>
        <View style={[styles.swatch, { backgroundColor: b.m ? colors.monument : p.color }]} />
        <Text style={type.caption}>{p.label}{b.m ? ' · рийксмонумент' : ''}</Text>
      </View>
      {named ? <Text style={type.title}>{named}</Text> : null}
      <Text style={named ? type.headline : type.title}>{yearLabel(b.y, b.q)}</Text>
      {b.q && b.q > 1 ? <Text style={type.subhead}>{Q_TEXT[b.q]}</Text> : null}
      <Text style={type.subhead} selectable>высота {num(b.h)} м · BAG {b.id}</Text>

      <View style={styles.row}>
        <Chip label={isSaved(b.id) ? 'Сохранено' : 'Сохранить'} on={isSaved(b.id)}
          onPress={() => toggleBuilding({ ...b, name: named, place: gm?.name, at: Date.now() })} />
        {b.m ? <Chip label={`Реестр RCE № ${b.m}`} onPress={() => open(`https://monumentenregister.cultureelerfgoed.nl/monumenten/${b.m}`)} /> : null}
        <Chip label="BAG viewer" onPress={() => open(`https://bagviewer.kadaster.nl/lvbag/bag-viewer/?objectId=${b.id}`)} />
      </View>

      {lenses.length ? <Text style={[type.caption, styles.section]}>В линзах {city?.city}</Text> : null}
      {lenses.map(({ lens, group, note }) => (
        <View key={lens.id} style={styles.lens}>
          <View style={styles.head}>
            <View style={[styles.swatch, { backgroundColor: LENS_COLORS[group % LENS_COLORS.length] }]} />
            <Text style={type.headline}>{lens.title}{lens.groups.length > 1 ? ` · ${lens.groups[group].label}` : ''}</Text>
          </View>
          {note?.story ? <Text style={type.story} selectable>{note.story}</Text> : null}
          {note?.source ? (
            <Pressable accessibilityRole="link" onPress={() => open(note.source!)}><Text style={styles.link}>Источник</Text></Pressable>
          ) : null}
        </View>
      ))}
      <Text style={[type.caption, styles.section]}>Данные: 3D BAG (CC BY 4.0), BAG, RCE (CC BY){lenses.length ? `, LAYRS ${city?.city}` : ''}.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  section: { marginTop: spacing.md },
  lens: { gap: 6, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  link: { color: colors.accent, fontSize: 14 },
});
