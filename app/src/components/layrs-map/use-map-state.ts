// What the map renders from the app state: building paint (mode, year, lens) and the overlay.
import { useEffect, useMemo, useState } from 'react';

import { lensGroups, loadLenses } from '@/data/places';
import { useApp } from '@/data/store';
import type { LensPaint, MapState } from '@/data/style';

export function useMapState(): MapState {
  const mode = useApp((s) => s.mode);
  const year = useApp((s) => s.year);
  const lensId = useApp((s) => s.lensId);
  const code = useApp((s) => s.gm?.code);
  const [lens, setLens] = useState<LensPaint | null>(null);
  useEffect(() => {
    let live = true;
    if (!lensId) { setLens(null); return; }
    loadLenses(code).then((city) => {
      const l = city?.layers.find((x) => x.id === lensId);
      if (live) setLens(city && l ? { groups: lensGroups(city, l) } : null);
    });
    return () => { live = false; };
  }, [lensId, code]);
  return useMemo(() => ({ mode, year, lens }), [mode, year, lens]);
}
