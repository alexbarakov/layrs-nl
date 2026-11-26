// Design tokens. The period ramp is the brand; everything else stays quiet.
import { PERIODS } from '@/data/config';

export const colors = {
  paper: '#f4f3ef',
  card: '#fffdf8',
  ink: '#22201c',
  mute: '#6b675f',
  line: '#dcd9d0',
  accent: '#8c1c13',
  monument: '#b8860b',
  blue: '#1a73e8',
  chip: '#ecebe5',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
export const type = {
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.ink },
  headline: { fontSize: 17, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 16, color: colors.ink },
  subhead: { fontSize: 14, color: colors.mute },
  caption: { fontSize: 12, color: colors.mute },
  story: { fontSize: 16, lineHeight: 23, color: colors.ink, fontFamily: 'Georgia' },
};
export const ramp = PERIODS.map((p) => p.color);
