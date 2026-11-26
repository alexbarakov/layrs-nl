// Search tab: municipalities, stories of the current city, and any Dutch address (PDOK Locatieserver).
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type CityLenses, loadLenses, municipalities } from '@/data/places';
import { flyTo, useApp } from '@/data/store';
import { colors, spacing, type } from '@/theme';

interface Hit { key: string; title: string; sub: string; go: () => Promise<void> | void }
const PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const gm = useApp((s) => s.gm);
  const [q, setQ] = useState('');
  const [addr, setAddr] = useState<Hit[]>([]);
  const [city, setCity] = useState<CityLenses | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { loadLenses(gm?.code).then(setCity); }, [gm?.code]);

  const open = (ll: [number, number], zoom: number) => { flyTo(ll, zoom, { pitch: zoom > 15 ? 50 : 0 }); router.navigate('/'); };

  // addresses: PDOK suggest, debounced; the query text goes to the Dutch government geocoder only
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) { setAddr([]); setState('idle'); return; }
    timer.current = setTimeout(async () => {
      setState('loading');
      try {
        const r = await fetch(`${PDOK}/suggest?fq=type:adres&rows=8&q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setAddr((j.response?.docs ?? []).map((d: any) => ({
          key: d.id, title: d.weergavenaam, sub: 'адрес',
          go: async () => {
            const l = await (await fetch(`${PDOK}/lookup?fl=centroide_ll&id=${d.id}`)).json();
            const m = /POINT\(([\d.]+) ([\d.]+)\)/.exec(l.response?.docs?.[0]?.centroide_ll ?? '');
            if (m) open([+m[1], +m[2]], 17.5);
          },
        })));
        setState('idle');
      } catch { setState('error'); }
    }, 300);
  }, [q]);

  const local = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const gms = municipalities().filter((g) => g.n.toLowerCase().includes(s)).slice(0, 5).map((g) => ({
      key: g.c, title: g.n, sub: `муниципалитет · ${g.p}`,
      go: () => open([(g.bbox[0] + g.bbox[2]) / 2, (g.bbox[1] + g.bbox[3]) / 2], 13),
    }));
    const stories: Hit[] = [];
    for (const l of city?.layers ?? []) for (const [bag, n] of Object.entries(l.notes)) {
      if (stories.length >= 8) break;
      if (n.ll && ((n.name ?? '').toLowerCase().includes(s) || (n.address ?? '').toLowerCase().includes(s)))
        stories.push({ key: `${l.id}:${bag}`, title: n.name || n.address || bag, sub: `${l.title}${n.address ? ' · ' + n.address : ''}`, go: () => open(n.ll!, 17) });
    }
    return [...gms, ...stories];
  }, [q, city]);

  const data = [...local, ...addr];
  return (
    <View style={[styles.fill, { paddingTop: insets.top + spacing.md }]}>
      <TextInput value={q} onChangeText={setQ} placeholder="Адрес, город или здание…" placeholderTextColor={colors.mute}
        style={styles.input} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" accessibilityLabel="Поиск" />
      {state === 'error' ? <Text style={[type.subhead, styles.pad]}>Поиск адресов недоступен. Проверьте соединение.</Text> : null}
      <FlatList
        data={data}
        keyExtractor={(h) => h.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.pad}
        ListEmptyComponent={q.trim().length >= 3 && state === 'idle' ? <Text style={type.subhead}>Ничего не нашлось. Попробуйте улицу с номером дома.</Text>
          : q.trim().length < 3 ? <Text style={type.subhead}>Например: Oude Delft 25, Утрехт, Rembrandthuis.</Text> : undefined}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => item.go()} style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.chip }]}>
            <Text style={type.body}>{item.title}</Text>
            <Text style={type.caption}>{item.sub}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.card },
  pad: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  input: { marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.chip, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 17, color: colors.ink },
  item: { paddingVertical: 11, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
