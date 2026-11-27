// Building sheet: name and photos; the facts every building has (year, monument, height); its stamp, if it is one;
// then the city layers it belongs to, each with what that layer says about this building. A tap on a layer shows it on the map.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { StampArt } from '@/components/stamp-art';
import { LENS_COLORS, periodOf } from '@/data/config';
import { sectionRu } from '@/data/layers';
import { type BuildingMedia, buildingMedia, googleMapsUrl } from '@/data/photos';
import { type CityLenses, lensesOf, loadLenses } from '@/data/places';
import { ERA_LABEL, useJournal } from '@/data/stamps';
import { setApp, useApp } from '@/data/store';
import { dist } from '@/data/walk';
import { colors, spacing, type } from '@/theme';
import { meters, num, Q_TEXT, yearLabel } from '@/utils/format';

/** The first sentence of a layer's text: what the layer is about, when the building has no story of its own. */
const firstSentence = (t?: string) => (t ? (t.match(/^.*?[.!?](\s|$)/)?.[0] ?? t).trim() : '');

export function BuildingSheet() {
  const router = useRouter();
  const b = useApp((s) => s.selected);
  const gm = useApp((s) => s.gm);
  const lensId = useApp((s) => s.lensId);
  const me = useApp((s) => s.me);
  const journal = useJournal();
  const stamp = useApp((s) => (b ? s.stampsHere.find((x) => x.bags.some((id) => id.padStart(16, '0') === b.id)) : undefined));
  const [city, setCity] = useState<CityLenses | null>(null);
  useEffect(() => { let live = true; loadLenses(gm?.code).then((c) => live && setCity(c)); return () => { live = false; }; }, [gm?.code]);
  const [media, setMedia] = useState<BuildingMedia | null>(null);
  useEffect(() => {
    let live = true;
    setMedia(null);
    if (b) buildingMedia(b.id, b.ll, b.m).then((m) => live && setMedia(m)).catch(() => live && setMedia({ photos: [] }));
    return () => { live = false; };
  }, [b?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setApp({ selected: null }), []);
  // nothing selected (e.g. the state was reset): close instead of showing an empty sheet
  useEffect(() => { if (!b && router.canGoBack()) router.back(); }, [b, router]);
  if (!b) return <View style={styles.wrap}><Text style={type.subhead}>Здание не выбрано.</Text></View>;

  const p = periodOf(b.y);
  const lenses = lensesOf(city, b.id);
  const named = stamp?.name_nl || lenses.find((l) => l.note?.name)?.note?.name || media?.name;
  const open = (url: string) => WebBrowser.openBrowserAsync(url);
  const openStamp = () => { router.back(); setTimeout(() => setApp({ stampId: stamp!.id }), 400); };
  const got = stamp ? journal[stamp.id] : undefined;

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      <Text style={type.title}>{named || yearLabel(b.y, b.q)}</Text>

      {media === null ? (
        <View style={[styles.photos, { height: 150, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.mute} /></View>
      ) : media.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos} style={{ marginHorizontal: -spacing.md }}>
          {media.photos.map((ph) => (
            <Pressable key={ph.file} accessibilityRole="link" accessibilityLabel={`Фото: ${ph.author}, ${ph.license}. Открыть на Wikimedia Commons`}
              onPress={() => open(ph.page)} style={({ pressed }) => [styles.photo, pressed && { opacity: 0.8 }]}>
              <Image source={{ uri: ph.thumb }} style={styles.photoImg} contentFit="cover" transition={150} />
              <Text style={styles.credit} numberOfLines={1}>{ph.near ? 'снято рядом · ' : ''}{ph.author} · {ph.license}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : <Text style={type.caption}>Открытых фото этого места на Wikimedia Commons пока нет.</Text>}

      {/* facts every building has: not layers */}
      <View style={styles.facts}>
        <Fact label="Построено" value={yearLabel(b.y, b.q)} note={b.q && b.q > 1 ? Q_TEXT[b.q] : p.label} swatch={p.color} />
        <Fact label="Высота" value={`${num(b.h)} м`} />
        {b.m ? <Fact label="Памятник" value={`№ ${b.m}`} note="рийксмонумент" swatch={colors.monument}
          onPress={() => open(`https://monumentenregister.cultureelerfgoed.nl/monumenten/${b.m}`)} /> : null}
      </View>

      {stamp ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Печать ${stamp.name_nl || stamp.name}. Открыть`} onPress={openStamp}
          style={({ pressed }) => [styles.stamp, pressed && { opacity: 0.8 }]}>
          <StampArt id={stamp.id} name={stamp.name_nl || stamp.name} era={stamp.era} year={stamp.year} img={stamp.img} size={72} collected={!!got} date={got?.at} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.caption}>Печать · {ERA_LABEL[stamp.era]}</Text>
            <Text style={type.headline}>{got ? 'В дневнике' : 'Здесь можно поставить печать'}</Text>
            <Text style={type.subhead}>
              {got ? `Получена ${new Date(got.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
                : me && !me.simulated ? `${meters(dist(me.ll, stamp.ll))} от вас · нужно ближе 60 м` : 'Подойдите ближе 60 м'}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {lenses.length ? <Text style={styles.head}>В слоях {city?.city}</Text> : null}
      {lenses.map(({ lens, group, note }) => {
        const on = lensId === lens.id;
        const groupLabel = lens.groups.length > 1 ? lens.groups[group].label : '';
        return (
          <Pressable key={lens.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityHint="Показать слой на карте"
            onPress={() => setApp({ lensId: on ? null : lens.id })}
            style={({ pressed }) => [styles.layer, on && styles.layerOn, pressed && { opacity: 0.85 }]}>
            <View style={styles.layerHead}>
              <View style={[styles.dot, { backgroundColor: LENS_COLORS[group % LENS_COLORS.length] }]} />
              <View style={{ flex: 1 }}>
                <Text style={type.headline}>{lens.title}</Text>
                <Text style={type.caption}>{[sectionRu(lens.section), groupLabel].filter(Boolean).join(' · ')}</Text>
              </View>
              {on ? <Text style={styles.onMark}>на карте</Text> : null}
            </View>
            <Text style={note?.story ? type.story : type.subhead} selectable numberOfLines={note?.story ? undefined : 3}>
              {note?.story || firstSentence(lens.text)}
            </Text>
            {note?.source ? <Text style={styles.link} onPress={() => open(note.source!)} accessibilityRole="link">Источник</Text> : null}
          </Pressable>
        );
      })}
      {!lenses.length && !city ? <Text style={type.caption}>Слои истории города пока есть только в Амстердаме и Делфте.</Text> : null}

      <View style={styles.row}>
        {b.ll ? <Chip label="Открыть в Google Maps" tone="accent" on onPress={() => open(googleMapsUrl(b.ll!))} /> : null}
        <Chip label="BAG viewer" onPress={() => open(`https://bagviewer.kadaster.nl/lvbag/bag-viewer/?objectId=${b.id}`)} />
      </View>
      <Text style={[type.caption, { marginTop: spacing.sm }]} selectable>
        BAG {b.id}. Данные: 3D BAG (CC BY 4.0), BAG, RCE (CC BY), Wikidata, фото Wikimedia Commons (лицензия у каждого фото){lenses.length ? `, LAYRS ${city?.city}` : ''}.
      </Text>
    </ScrollView>
  );
}

function Fact({ label, value, note, swatch, onPress }: { label: string; value: string; note?: string; swatch?: string; onPress?: () => void }) {
  const body = (
    <>
      <Text style={type.caption}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
        <Text style={[type.headline, onPress && { color: colors.accent }]}>{value}</Text>
      </View>
      {note ? <Text style={type.caption} numberOfLines={2}>{note}</Text> : null}
    </>
  );
  return onPress
    ? <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.fact, pressed && { opacity: 0.7 }]}>{body}</Pressable>
    : <View style={styles.fact}>{body}</View>;
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  head: { ...type.headline, marginTop: spacing.md },
  photos: { gap: 8, paddingHorizontal: spacing.md },
  photo: { width: 200, gap: 4 },
  photoImg: { width: 200, height: 140, borderRadius: 12, backgroundColor: colors.chip },
  credit: { fontSize: 11, color: colors.mute },
  facts: { flexDirection: 'row', gap: 8, marginTop: spacing.xs },
  fact: { flex: 1, backgroundColor: colors.card, borderRadius: 12, borderCurve: 'continuous', padding: 10, gap: 2 },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.25)' },
  stamp: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, borderCurve: 'continuous', padding: 12, marginTop: spacing.xs },
  layer: { backgroundColor: colors.card, borderRadius: 14, borderCurve: 'continuous', padding: 12, gap: 8, borderWidth: 2, borderColor: 'transparent' },
  layerOn: { borderColor: colors.accent },
  layerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 3 },
  onMark: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  link: { color: colors.accent, fontSize: 14 },
});
