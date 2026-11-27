// App language: Russian, English or Dutch, kept on the device. Translations of the interface follow this setting.
import { useSyncExternalStore } from 'react';

import { kvGet, kvSet } from './kv';

export type Lang = 'ru' | 'en' | 'nl';
const KEY = 'layrs.lang';
let lang: Lang = ((): Lang => { const v = kvGet(KEY); return v === 'en' || v === 'nl' ? v : 'ru'; })();
const subs = new Set<() => void>();
export const getLang = () => lang;
export const useLang = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => lang, () => lang);
export function setLang(l: Lang) { lang = l; kvSet(KEY, l); subs.forEach((f) => f()); }
