// One city layer (lens): legend, text and the buildings with stories. Opened from the layers sheet.
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { LENS_COLORS } from '@/data/config';
import { sectionRu } from '@/data/layers';
import type { Lens } from '@/data/places';
import { flyTo, setApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';
import { num } from '@/utils/format';

export function LensDetail({ lens, onBack, onClose }: { lens: Lens; onBack: () => void; onClose: () => void }) {
  const notes = Object.entries(lens.notes).filter(([, n]) => n.ll).slice(0, 80);
  return (
    <SectionList
      sections={[{ title: 'stories', data: notes }]}
      keyExtractor={([bag]) => bag}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.wrap}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <Pressable accessibilityRole="button" onPress={onBack}><Text style={styles.link}>Все слои</Text></Pressable>
          <Text style={type.title}>{lens.title}</Text>
          <Text style={type.subhead}>{lens.era ? `${lens.era} · ` : ''}{sectionRu(lens.section)}</Text>
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
            <Chip label="Снять тему" onPress={() => { setApp({ lensId: null }); onBack(); }} />
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
