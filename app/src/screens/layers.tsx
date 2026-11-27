// Layers: the city's history, one topic per layer. A grid of layer cards (icon, title, how many buildings),
// filtered by section or search; a card opens the layer's own page with its story, groups and source.
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Icon, IconTile } from '@/components/icon';
import { CITIES, LENS_CITIES, LENS_COLORS } from '@/data/config';
import { layerIcon, layerRu, plBuildings, sectionIcon, sectionRu } from '@/data/layers';
import { type CityLenses, type Lens, loadLenses } from '@/data/places';
import { useJournal } from '@/data/stamps';
import { flyTo, setApp, useApp } from '@/data/store';
import { colors, font, radius, spacing, type } from '@/theme';
import { plural } from '@/utils/format';

export function LayersSheet() {
  const router = useRouter();
  const params = useLocalSearchParams<{ open?: string }>();
  const gm = useApp((s) => s.gm);
  const lensId = useApp((s) => s.lensId);
  const [city, setCity] = useState<CityLenses | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(params.open ?? null);
  const [section, setSection] = useState<string | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { let live = true; loadLenses(gm?.code).then((c) => live && setCity(c)); return () => { live = false; }; }, [gm?.code]);

  const sections = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of city?.layers ?? []) m.set(l.section, (m.get(l.section) ?? 0) + 1);
    return [...m.entries()];
  }, [city]);

  if (city === undefined) return <View style={styles.wrap} />;
  if (!city) return <NoLayers name={gm?.name} onGo={(c) => { router.back(); flyTo(c, 15.3, { pitch: 55, bearing: -20 }); }} onClose={() => router.back()} />;

  const lens = city.layers.find((l) => l.id === open);
  if (lens) return <LayerPage lens={lens} city={city} onBack={() => setOpen(null)} onOpen={setOpen} onShow={() => { setApp({ lensId: lens.id }); router.back(); }} />;

  const needle = q.trim().toLowerCase();
  const shown = city.layers.filter((l) => (!section || l.section === section)
    && (!needle || [layerRu(l.title), l.title, l.text ?? ''].some((t) => t.toLowerCase().includes(needle))));

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={type.display}>Слои</Text>
          <Text style={type.subhead}>{gm?.name ?? city.city} · {city.layers.length} {plural(city.layers.length, 'рассказ', 'рассказа', 'рассказов')} о городе, у каждого свои здания</Text>
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.round}><Icon name="close" size={14} width={2.6} /></Pressable>
      </View>
      <View style={styles.search}>
        <Icon name="search" size={16} color={colors.mute} />
        <TextInput value={q} onChangeText={setQ} placeholder="Рембрандт, синагога, каналы…" placeholderTextColor={colors.mute} style={styles.input} accessibilityLabel="Найти слой" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -spacing.md }}>
        <SectionChip label={`Все · ${city.layers.length}`} on={!section} onPress={() => setSection(null)} />
        {sections.map(([s, n]) => <SectionChip key={s} icon={sectionIcon(s)} label={`${sectionRu(s)} · ${n}`} on={section === s} onPress={() => setSection(section === s ? null : s)} />)}
      </ScrollView>
      <View style={styles.grid}>
        {!section && !needle ? <StampsCard /> : null}
        {shown.map((l) => {
          const on = l.id === lensId;
          return (
            <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`${layerRu(l.title)}, ${plBuildings(l.count)}`} onPress={() => setOpen(l.id)}
              style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && { opacity: 0.85 }]}>
              {on ? <Text style={styles.badge}>на карте</Text> : null}
              <IconTile name={layerIcon(l.title, l.section)} />
              <Text style={styles.cardTitle}>{layerRu(l.title)}</Text>
              <Text style={type.caption}>{sectionRu(l.section)}{l.era ? ` · ${l.era}` : ''}</Text>
              <Text style={styles.count}>{plBuildings(l.count)}</Text>
            </Pressable>
          );
        })}
      </View>
      {!shown.length ? <Text style={type.subhead}>Ничего не нашлось. Попробуйте другое слово или раздел «Все».</Text> : null}
    </ScrollView>
  );
}

// Stamps: the first card of the grid, filled Delft blue. Off by default; on, the city's key buildings show on the map.
function StampsCard({ compact }: { compact?: boolean }) {
  const on = useApp((s) => s.showStamps);
  const here = useApp((s) => s.stampsHere);
  const journal = useJournal();
  const got = here.filter((x) => journal[x.id]).length;
  return (
    <Pressable onPress={() => setApp({ showStamps: !on })} accessibilityRole="switch" accessibilityState={{ checked: on }}
      accessibilityLabel={`Печати: ключевые здания города, ${here.length}`}
      style={({ pressed }) => [styles.card, styles.stamps, compact && { width: '100%', minHeight: 0 }, on && styles.stampsOn, pressed && { opacity: 0.9 }]}>
      {on ? <Text style={[styles.badge, { backgroundColor: colors.delft }]}>на карте</Text> : null}
      <View style={styles.stampsIcon}><Icon name="stamp" size={24} color={colors.delft} width={1.9} /></View>
      <Text style={[styles.cardTitle, { color: '#163a70' }]}>Печати</Text>
      <Text style={styles.stampsSub}>Ключевые здания города. Соберите печати в коллекцию</Text>
      <Text style={styles.count}>{here.length ? `${plBuildings(here.length)} · у вас ${got}` : 'здесь печатей нет'}</Text>
    </Pressable>
  );
}

function SectionChip({ icon, label, on, onPress }: { icon?: string; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      {icon ? <Icon name={icon} size={16} color={on ? colors.card : colors.delft} width={1.9} /> : null}
      <Text style={[styles.chipText, on && { color: colors.card }]}>{label}</Text>
    </Pressable>
  );
}

// One layer: what it is, how many buildings and in which groups, where the data comes from, buildings with stories.
function LayerPage({ lens, city, onBack, onOpen, onShow }: { lens: Lens; city: CityLenses; onBack: () => void; onOpen: (id: string) => void; onShow: () => void }) {
  const notes = Object.entries(lens.notes).filter(([, n]) => n.ll).slice(0, 40);
  const related = city.layers.filter((l) => l.section === lens.section && l.id !== lens.id).slice(0, 2);
  const groups = lens.groups.length;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: 110 }]}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}><Icon name="back" size={18} color={colors.delft} width={2.4} /><Text style={styles.backText}>Все слои</Text></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile name={layerIcon(lens.title, lens.section)} size={64} />
          <Text style={[type.subhead, { flex: 1 }]}>{sectionRu(lens.section)}{lens.era ? ` · ${lens.era}` : ''}</Text>
        </View>
        <Text style={type.display}>{layerRu(lens.title)}</Text>
        <Text style={styles.big}>{plBuildings(lens.count)}{groups > 1 ? <Text style={type.body}>{`  в ${groups} ${plural(groups, 'группе', 'группах', 'группах')}`}</Text> : null}</Text>
        {lens.text ? <Text style={type.story}>{lens.text}</Text> : null}
        <View style={styles.legend}>
          {lens.groups.map((g, i) => (
            <View key={g.key} style={styles.legendRow}>
              <View style={[styles.sw, { backgroundColor: LENS_COLORS[i % LENS_COLORS.length] }]} />
              <Text style={[type.body, { flex: 1 }]}>{g.label}</Text>
              <Text style={type.subhead}>{plBuildings(g.count)}</Text>
            </View>
          ))}
          <View style={[styles.legendRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.sw, { backgroundColor: '#cfcbc1' }]} />
            <Text style={[type.subhead, { flex: 1 }]}>Остальные здания города</Text>
            <Text style={type.subhead}>серым</Text>
          </View>
        </View>
        {lens.caveat ? <Text style={type.caption}>{lens.caveat}</Text> : null}
        {lens.source ? <Text style={styles.link} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(lens.source!.url)}>Источник: {lens.source.label}</Text> : null}
        {notes.length ? <Text style={[type.headline, { marginTop: spacing.md }]}>Здания с историями · {notes.length}</Text> : null}
        {notes.map(([bag, n]) => (
          <Pressable key={bag} accessibilityRole="button" style={({ pressed }) => [styles.note, pressed && { backgroundColor: colors.chip }]}
            onPress={() => { onShow(); flyTo(n.ll!, 17, { pitch: 50 }); }}>
            <Text style={type.body} numberOfLines={1}>{n.name || n.address || `BAG ${bag}`}</Text>
            {n.address && n.name ? <Text style={type.caption} numberOfLines={1}>{n.address}</Text> : null}
          </Pressable>
        ))}
        {related.length ? <Text style={[type.headline, { marginTop: spacing.md }]}>Ещё в разделе</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {related.map((l) => (
            <Pressable key={l.id} onPress={() => onOpen(l.id)} accessibilityRole="button" style={({ pressed }) => [styles.rel, pressed && { opacity: 0.85 }]}>
              <IconTile name={layerIcon(l.title, l.section)} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.relTitle} numberOfLines={2}>{layerRu(l.title)}</Text>
                <Text style={type.caption}>{plBuildings(l.count)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={styles.cta}>
        <Pressable onPress={onShow} accessibilityRole="button" style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaText}>Показать на карте</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NoLayers({ name, onGo, onClose }: { name?: string; onGo: (c: [number, number]) => void; onClose: () => void }) {
  const cities = CITIES.filter((c) => LENS_CITIES.has(c.code));
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Text style={[type.title, { flex: 1 }]}>Слои{name ? ` · ${name}` : ''}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.round}><Icon name="close" size={14} width={2.6} /></Pressable>
      </View>
      <StampsCard compact />
      <Text style={[type.body, { marginTop: spacing.sm }]}>Историй города здесь пока нет. Слой — это одна тема из истории города: каналы, война, вера, торговля. Каждый слой выделяет на карте свои здания и рассказывает о них.</Text>
      <Text style={type.subhead}>Цвет зданий по году, высоте и памятникам есть везде — в настройках карты.</Text>
      <Text style={[type.subhead, { marginTop: spacing.sm }]}>Истории есть в двух городах</Text>
      {cities.map((c) => <Chip key={c.code} label={c.name} onPress={() => onGo(c.center)} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm },
  stamps: { backgroundColor: '#dce7f5', borderColor: '#b7cbe6' },
  stampsOn: { borderWidth: 2, borderColor: colors.delft },
  stampsIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stampsSub: { fontSize: 12, lineHeight: 16, color: '#3d5578' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.chip, marginTop: spacing.xs },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  chips: { gap: 6, paddingHorizontal: spacing.md, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.delft, borderColor: colors.delft },
  chipText: { fontSize: 14, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.xs },
  card: { width: '48.8%', minHeight: 150, gap: 6, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  cardOn: { borderWidth: 2, borderColor: colors.delft },
  badge: { position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: '700', color: colors.card, backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  cardTitle: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: colors.ink },
  count: { marginTop: 'auto', fontSize: 13, fontWeight: '600', color: colors.delft },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  backText: { color: colors.delft, fontSize: 16 },
  big: { fontFamily: font.bold, fontSize: 24, color: colors.delft },
  legend: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  sw: { width: 14, height: 14, borderRadius: 3 },
  link: { color: colors.delft, fontSize: 13 },
  note: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 2 },
  rel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  relTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, paddingBottom: 30, backgroundColor: colors.paper },
  ctaBtn: { height: 52, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: colors.card, fontSize: 16, fontWeight: '600' },
});
