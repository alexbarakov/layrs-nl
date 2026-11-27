// Building sheet: short on top (name, year, height), then every layer the building belongs to; a tap shows that layer on the map.
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { LENS_COLORS, periodOf } from '@/data/config';
import { type CityLenses, lensesOf, loadLenses } from '@/data/places';
import { ERA_INK } from '@/data/stamps';
import { HEIGHT_STOPS } from '@/data/style';
import { setApp, useApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';
import { num, Q_TEXT, yearLabel } from '@/utils/format';

const heightColor = (h: number) => [...HEIGHT_STOPS].reverse().find(([v]) => h >= v)?.[1] ?? HEIGHT_STOPS[0][1];

export function BuildingSheet() {
  const router = useRouter();
  const b = useApp((s) => s.selected);
  const gm = useApp((s) => s.gm);
  const mode = useApp((s) => s.mode);
  const lensId = useApp((s) => s.lensId);
  const stamp = useApp((s) => (b ? s.stampsHere.find((x) => x.bags.some((id) => id.padStart(16, '0') === b.id)) : undefined));
  const [city, setCity] = useState<CityLenses | null>(null);
  useEffect(() => { let live = true; loadLenses(gm?.code).then((c) => live && setCity(c)); return () => { live = false; }; }, [gm?.code]);
  useEffect(() => () => setApp({ selected: null }), []);
  if (!b) return <View style={styles.wrap}><Text style={type.subhead}>Здание не выбрано.</Text></View>;

  const p = periodOf(b.y);
  const lenses = lensesOf(city, b.id);
  const named = stamp?.name_nl || lenses.find((l) => l.note?.name)?.note?.name;
  const open = (url: string) => WebBrowser.openBrowserAsync(url);
  const base = (m: typeof mode) => mode === m && !lensId;
  const openStamp = () => { router.back(); setTimeout(() => setApp({ stampId: stamp!.id }), 400); };

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      {named ? <Text style={type.title}>{named}</Text> : null}
      <Text style={named ? type.headline : type.title}>{yearLabel(b.y, b.q)}</Text>
      {b.q && b.q > 1 ? <Text style={type.subhead}>{Q_TEXT[b.q]}</Text> : null}
      <Text style={type.subhead} selectable>BAG {b.id}</Text>

      <Text style={styles.head}>Слои здания</Text>
      <View style={styles.group}>
        <LayerRow color={p.color} title="Период постройки" value={p.label} on={base('periods')} onPress={() => setApp({ mode: 'periods', lensId: null })} />
        {b.m ? <LayerRow color={colors.monument} title="Памятник" value={`рийксмонумент № ${b.m}`} on={base('monuments')} onPress={() => setApp({ mode: 'monuments', lensId: null })} /> : null}
        <LayerRow color={heightColor(b.h)} title="Высота" value={`${num(b.h)} м`} on={base('height')} onPress={() => setApp({ mode: 'height', lensId: null })} />
        {stamp ? <LayerRow color={ERA_INK[stamp.era]} round title="Печать" value={stamp.name_nl || stamp.name} action="Открыть" onPress={openStamp} /> : null}
        {lenses.map(({ lens, group, note }) => (
          <LayerRow key={lens.id} color={LENS_COLORS[group % LENS_COLORS.length]} title={lens.title}
            value={lens.groups.length > 1 ? lens.groups[group].label : lens.era || ''} on={lensId === lens.id}
            onPress={() => setApp({ lensId: lens.id })}>
            {note?.story ? <Text style={type.story} selectable>{note.story}</Text> : null}
            {note?.source ? <Pressable accessibilityRole="link" onPress={() => open(note.source!)}><Text style={styles.link}>Источник</Text></Pressable> : null}
          </LayerRow>
        ))}
      </View>
      {!lenses.length && !city ? <Text style={type.caption}>Темы города (торговля, война, вера и другие) пока есть только в Амстердаме и Делфте.</Text> : null}

      <View style={styles.row}>
        {b.m ? <Chip label={`Реестр RCE № ${b.m}`} onPress={() => open(`https://monumentenregister.cultureelerfgoed.nl/monumenten/${b.m}`)} /> : null}
        <Chip label="BAG viewer" onPress={() => open(`https://bagviewer.kadaster.nl/lvbag/bag-viewer/?objectId=${b.id}`)} />
      </View>
      <Text style={[type.caption, { marginTop: spacing.sm }]}>Данные: 3D BAG (CC BY 4.0), BAG, RCE (CC BY){lenses.length ? `, LAYRS ${city?.city}` : ''}.</Text>
    </ScrollView>
  );
}

function LayerRow({ color, round, title, value, on, action, onPress, children }: {
  color: string; round?: boolean; title: string; value: string; on?: boolean; action?: string; onPress: () => void; children?: React.ReactNode;
}) {
  return (
    <View style={styles.item}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} accessibilityHint={action ? undefined : 'Показать слой на карте'}
        onPress={onPress} style={({ pressed }) => [styles.itemHead, pressed && { opacity: 0.6 }]}>
        <View style={[styles.swatch, { backgroundColor: color }, round && { borderRadius: 7 }]} />
        <View style={{ flex: 1 }}>
          <Text style={type.caption}>{title}</Text>
          <Text style={[type.body, on && { fontWeight: '600' }]}>{value}</Text>
        </View>
        <Text style={[styles.state, on && { color: colors.ink }]}>{on ? 'на карте' : action ?? 'Показать'}</Text>
      </Pressable>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  head: { ...type.headline, marginTop: spacing.md },
  group: { backgroundColor: colors.card, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 12 },
  item: { gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 14, height: 14, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.25)' },
  state: { color: colors.accent, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  link: { color: colors.accent, fontSize: 14 },
});
