// Lenses of the current city: list by section, then one lens with legend, text and stories.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { LENS_COLORS } from '@/data/config';
import { type CityLenses, type Lens, loadLenses } from '@/data/places';
import { flyTo, setApp, useApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';
import { num } from '@/utils/format';

export function LensesSheet() {
  const router = useRouter();
  const gm = useApp((s) => s.gm);
  const lensId = useApp((s) => s.lensId);
  const [city, setCity] = useState<CityLenses | null>(null);
  const [open, setOpen] = useState<string | null>(lensId);
  useEffect(() => { loadLenses(gm?.code).then(setCity); }, [gm?.code]);
  if (!city) return <View style={styles.wrap}><Text style={type.subhead}>В этом городе пока нет линз.</Text></View>;

  const lens = city.layers.find((l) => l.id === open);
  if (lens) return <LensDetail lens={lens} onBack={() => setOpen(null)} onClose={() => router.back()} />;

  const sections: { title: string; data: Lens[] }[] = [];
  for (const l of city.layers) {
    let s = sections.find((x) => x.title === l.section);
    if (!s) sections.push((s = { title: l.section, data: [] }));
    s.data.push(l);
  }
  return (
    <SectionList
      sections={sections}
      keyExtractor={(l) => l.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.wrap}
      ListHeaderComponent={
        <View style={{ gap: 6, marginBottom: spacing.sm }}>
          <Text style={type.title}>Линзы · {city.city}</Text>
          <Text style={type.subhead}>Слои истории с сайта LAYRS {city.city}. Тексты пока на английском.</Text>
          {lensId ? <Chip label="Без линзы" onPress={() => { setApp({ lensId: null }); router.back(); }} /> : null}
        </View>
      }
      renderSectionHeader={({ section }) => <Text style={[type.caption, styles.sectionHead]}>{section.title}</Text>}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === lensId }}
          onPress={() => { setApp({ lensId: item.id }); setOpen(item.id); }}
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.chip }]}>
          <Text style={[type.body, item.id === lensId && { fontWeight: '600' }]}>{item.title}</Text>
          <Text style={[type.caption, { fontVariant: ['tabular-nums'] }]}>{item.era ? `${item.era} · ` : ''}{num(item.count)}</Text>
        </Pressable>
      )}
    />
  );
}

function LensDetail({ lens, onBack, onClose }: { lens: Lens; onBack: () => void; onClose: () => void }) {
  const notes = Object.entries(lens.notes).filter(([, n]) => n.ll).slice(0, 80);
  return (
    <SectionList
      sections={[{ title: 'stories', data: notes }]}
      keyExtractor={([bag]) => bag}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.wrap}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <Pressable accessibilityRole="button" onPress={onBack}><Text style={styles.link}>Все линзы</Text></Pressable>
          <Text style={type.title}>{lens.title}</Text>
          <Text style={type.subhead}>{lens.era ? `${lens.era} · ` : ''}{lens.section}</Text>
          {lens.groups.map((g, i) => (
            <View key={g.key} style={styles.legend}>
              <View style={[styles.swatch, { backgroundColor: LENS_COLORS[i % LENS_COLORS.length] }]} />
              <Text style={type.body}>{g.label}</Text>
              <Text style={type.caption}>{num(g.count)}</Text>
            </View>
          ))}
          {lens.text ? <Text style={type.story}>{lens.text}</Text> : null}
          {lens.caveat ? <Text style={type.subhead}>{lens.caveat}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip label="Показать на карте" tone="accent" on onPress={onClose} />
            <Chip label="Без линзы" onPress={() => { setApp({ lensId: null }); onBack(); }} />
          </View>
          {notes.length ? <Text style={[type.caption, styles.sectionHead]}>Здания с историями</Text> : null}
        </View>
      }
      renderSectionHeader={() => null}
      renderItem={({ item: [bag, n] }) => (
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.chip }]}
          onPress={() => { onClose(); flyTo(n.ll!, 17, { pitch: 50 }); }}>
          <Text style={type.body} numberOfLines={1}>{n.name || n.address || `BAG ${bag}`}</Text>
          {n.address ? <Text style={type.caption} numberOfLines={1}>{n.address}</Text> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, paddingTop: spacing.lg },
  sectionHead: { marginTop: spacing.md, marginBottom: spacing.xs },
  item: { paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  link: { color: colors.accent, fontSize: 15 },
});
