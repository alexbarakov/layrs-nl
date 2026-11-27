// Profile: the travel journal at a glance, the app language, map settings, sources. No sign-in: all of it stays on the phone.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Flag } from '@/components/flag';
import { Icon, IconTile } from '@/components/icon';
import { DATA_REV } from '@/data/config';
import { type Lang, setLang, useLang } from '@/data/lang';
import { useSaved } from '@/data/saved';
import { useJournal } from '@/data/stamps';
import { colors, font, spacing, type } from '@/theme';
import { plural } from '@/utils/format';

const LANGS: [Lang, string][] = [['ru', 'Русский'], ['en', 'English'], ['nl', 'Nederlands']];

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const journal = useJournal();
  const saved = useSaved();
  const lang = useLang();
  const got = Object.values(journal);
  const cities = new Set(got.map((c) => c.gm)).size;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}><Icon name="back" size={18} color={colors.delft} width={2.4} /><Text style={styles.backText}>Назад</Text></Pressable>

      <View style={styles.diary}>
        <Text style={styles.diaryNote}>Без входа · всё хранится на этом телефоне</Text>
        <Text style={styles.diaryTitle}>Дневник путешественника</Text>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <Stat n={got.length} label={plural(got.length, 'печать', 'печати', 'печатей')} gold />
          <Stat n={cities} label={plural(cities, 'город', 'города', 'городов')} />
          <Stat n={saved.walks.length} label={plural(saved.walks.length, 'прогулка', 'прогулки', 'прогулок')} />
        </View>
      </View>

      <Text style={styles.label}>Язык · Language · Taal</Text>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
        {LANGS.map(([l, name]) => (
          <Pressable key={l} onPress={() => setLang(l)} accessibilityRole="radio" accessibilityState={{ checked: lang === l }}
            style={[styles.lang, lang === l && styles.langOn]}>
            <Flag lang={l} />
            <Text style={[type.body, { fontSize: 14 }, lang === l && { fontWeight: '600' }]}>{name}</Text>
          </Pressable>
        ))}
      </View>
      {lang !== 'ru' ? <Text style={type.caption}>Перевод интерфейса на этот язык в работе: пока экраны остаются на русском.</Text> : null}

      <View style={[styles.group, { marginTop: spacing.md }]}>
        <Row icon="stamp" title="Мои печати" value={String(got.length)} onPress={() => router.navigate('/stamps')} />
        <Row icon="route" title="Сохранённые прогулки" value={String(saved.walks.length)} onPress={() => router.navigate('/walks')} />
        <Row icon="download" title="Города без сети" value="скоро" last />
      </View>
      <View style={[styles.group, { marginTop: spacing.sm }]}>
        <Row icon="sliders" title="Настройки карты" onPress={() => router.push('/map-settings')} />
        <Row icon="book" title="Источники и лицензии" onPress={() => WebBrowser.openBrowserAsync('https://github.com/alexbarakov/layrs-nl#sources')} />
        <Row icon="mail" title="Код и обратная связь" onPress={() => WebBrowser.openBrowserAsync('https://github.com/alexbarakov/layrs-nl/issues')} last />
      </View>
      <View style={{ alignItems: 'center', gap: 6, marginTop: spacing.lg }}>
        <Image source={require('../../assets/images/logo.png')} style={{ width: 150, height: 66 }} contentFit="contain" accessibilityLabel="LAYRS" />
        <Text style={type.caption}>Look at your city like never before · 0.1 · данные {DATA_REV}</Text>
      </View>
    </ScrollView>
  );
}

function Stat({ n, label, gold }: { n: number; label: string; gold?: boolean }) {
  return (
    <View>
      <Text style={[styles.statN, gold && { color: '#f2c14e' }]}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

function Row({ icon, title, value, last, onPress }: { icon: string; title: string; value?: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.chip }]}>
      <IconTile name={icon} size={36} />
      <Text style={[type.body, { flex: 1 }]}>{title}</Text>
      {value ? <Text style={type.subhead}>{value}</Text> : null}
      {onPress ? <Icon name="chevron" size={14} color="#a39c8c" width={2.6} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  backText: { color: colors.delft, fontSize: 16 },
  diary: { backgroundColor: colors.ink, borderRadius: 20, padding: 18, gap: 6 },
  diaryNote: { fontSize: 12, color: 'rgba(243,239,228,0.7)' },
  diaryTitle: { fontFamily: font.bold, fontSize: 26, color: colors.paper, marginBottom: 8, letterSpacing: -0.3 },
  statN: { fontFamily: font.bold, fontSize: 30, color: colors.paper },
  statL: { fontSize: 12, color: 'rgba(243,239,228,0.75)' },
  label: { ...type.subhead, marginTop: spacing.md },
  lang: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  langOn: { borderWidth: 2, borderColor: colors.accent },
  group: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
});
