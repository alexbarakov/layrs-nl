// Design tokens (iteration 3): paper and ink, stamp red for the main action, Delft blue for layers and selection.
// Headings in Manrope; the period ramp stays the brand of the map.
import { PERIODS } from '@/data/config';

export const colors = {
  paper: '#f3efe4',
  card: '#fffcf5',
  ink: '#1d1b17',
  mute: '#6a6458',
  line: '#e2dccd',
  accent: '#a8231b',     // stamp red: primary actions, "on the map"
  delft: '#1f4f96',      // layers, links, selection
  tile: '#e7edf6',       // icon tiles
  monument: '#b8860b',
  blue: '#1a73e8',       // "me" on the map
  chip: '#e9e3d4',
};
export const font = { regular: 'Manrope_500Medium', semibold: 'Manrope_600SemiBold', bold: 'Manrope_700Bold' };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 24, pill: 999 } as const;
export const shadow = { boxShadow: '0 2px 6px rgba(29,27,23,0.18)' } as const;
export const type = {
  display: { fontSize: 30, fontFamily: font.bold, color: colors.ink, letterSpacing: -0.4 },
  title: { fontSize: 24, fontFamily: font.bold, color: colors.ink, letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 16, color: colors.ink },
  subhead: { fontSize: 14, color: colors.mute },
  caption: { fontSize: 12, color: colors.mute },
  story: { fontSize: 16, lineHeight: 24, color: colors.ink, fontFamily: 'Georgia' },
};
export const ramp = PERIODS.map((p) => p.color);
