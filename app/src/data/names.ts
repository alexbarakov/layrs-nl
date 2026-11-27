// A readable name for a walk stop: the stamp or city-layer name we already have, else the monument's name on Wikidata,
// else the street address (PDOK reverse geocoder). Cached per building.
import { useEffect, useState } from 'react';

import { monument } from './photos';
import { loadLenses } from './places';
import { loadStamps } from './stamps';
import type { Stop } from './store';

const PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse';
// register descriptions rather than names: "Hoekhuis met gevels, thans onder rechte lijst", "Fors huis met gevel ..."
const GENERIC = /\b(met|onder|thans|voorzien)\b|^(huis|pand|panden|woonhuis|hoekhuis|herenhuis|winkelpand|winkel|fors|breed|smal|dubbel|groot|klein)\b/i;
const cache = new Map<string, Promise<string | null>>();

async function resolve(s: Stop): Promise<string | null> {
  const id = s.id.padStart(16, '0');
  const st = (await loadStamps(s.gm))?.stamps.find((x) => x.bags.some((b) => b.padStart(16, '0') === id));
  if (st) return st.name_nl || st.name;
  const city = await loadLenses(s.gm);
  for (const l of city?.layers ?? []) { const n = l.notes[id]?.name; if (n) return n; }
  if (s.m) {
    const mon = await monument(s.m, 'nl').catch(() => null);
    // generic register labels ("Huis met ...") are worse than the address
    if (mon?.label && !GENERIC.test(mon.label)) return mon.label;
  }
  const r = await fetch(`${PDOK}?lat=${s.ll[1]}&lon=${s.ll[0]}&type=adres&rows=1`).then((x) => x.json()).catch(() => null);
  const a: string | undefined = r?.response?.docs?.[0]?.weergavenaam;
  return a ? a.replace(/,\s*\d{4}\s?[A-Z]{2}\s/, ', ') : null;
}

export function stopName(s: Stop) {
  if (!cache.has(s.id)) cache.set(s.id, resolve(s).catch(() => null));
  return cache.get(s.id)!;
}

export function useStopName(s: Stop | undefined) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setName(null);
    if (s) stopName(s).then((n) => live && setName(n));
    return () => { live = false; };
  }, [s?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  return name;
}
