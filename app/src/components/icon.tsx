// Line icons from the design canvas (iteration 3): sections, city layers, tabs and map controls. 24×24, stroke only.
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';

import { colors } from '@/theme';

type El = { p: string; dash?: string } | { c: [number, number, number] } | { r: [number, number, number, number, number] };
const I: Record<string, El[]> = {
  // sections
  arch: [{ p: 'M5 21V10l3.5-4L12 10l3.5-4L19 10v11' }, { p: 'M5 21h14M10 21v-4h4v4M9 13h1M14 13h1' }],
  trade: [{ p: 'M3 16l2 4h14l2-4H3z' }, { p: 'M12 3v13M12 4l6 9h-6M12 6L7 13h5' }],
  faith: [{ p: 'M12 3v4M10 5h4' }, { p: 'M6 21V12l6-5 6 5v9' }, { p: 'M10 21v-4a2 2 0 0 1 4 0v4' }],
  war: [{ p: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z' }, { p: 'M9 10l6 6M15 10l-6 6' }],
  modern: [{ p: 'M4 21V9h6v12M10 21V4h7v17M4 21h17M13 8h1M13 12h1M13 16h1' }],
  art: [{ p: 'M12 3a9 9 0 1 0 0 18c1.3 0 1.8-1 1.3-2-.6-1.3.2-2.5 1.7-2.5H18a3 3 0 0 0 3-3C21 7 17 3 12 3z' }, { c: [7.5, 11, 1] }, { c: [10, 7, 1] }, { c: [15, 7.5, 1] }],
  science: [{ p: 'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4V5zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6V5z' }],
  discover: [{ c: [12, 12, 9] }, { p: 'M15.5 8.5l-2 5-5 2 2-5 5-2z' }],
  orange: [{ p: 'M5 20h14M6 20l1-9h10l1 9M8 11l-1-5 3 2 2-4 2 4 3-2-1 5' }],
  // layers
  canal: [{ p: 'M3 20a9 9 0 0 1 18 0M6.5 20a5.5 5.5 0 0 1 11 0M10 20a2 2 0 0 1 4 0' }],
  star: [{ p: 'M12 3l7.8 13.5H4.2z' }, { p: 'M12 21L4.2 7.5h15.6z' }],
  flame: [{ p: 'M12 21c-4 0-7-2.8-7-6.5 0-3.2 2.4-5 3.5-7 .6 1.4 1.7 2.3 2.8 2.6C11 7 12.5 4.5 15 3c-.3 2.9 1 4.6 2.3 6.2C18.4 10.6 19 12.4 19 14.5 19 18.2 16 21 12 21z' }],
  brush: [{ p: 'M14.5 4.5l5 5L11 18l-5-5z' }, { p: 'M6 13c-2 .5-3 2-3 4.5 0 1.5-.5 2.5-1 3 3 0 7-.5 8-3.5' }],
  globe: [{ c: [12, 12, 9] }, { p: 'M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z' }],
  key: [{ c: [8, 15, 4] }, { p: 'M11 12l8-8M16 7l3 3M14 9l2 2' }],
  gable: [{ p: 'M7 21V11h2V8h2V5h2v3h2v3h2v10z' }, { p: 'M10 21v-4h4v4M10 13h4' }],
  column: [{ p: 'M4 7l8-4 8 4H4zM5 21h14M6 18h12M7 9v9M10.3 9v9M13.7 9v9M17 9v9' }],
  shield: [{ p: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z' }, { p: 'M8.5 12l2.5 2.5 4.5-5' }],
  crack: [{ p: 'M4 21V10l8-6 8 6v11z' }, { p: 'M12 4l-1 5 2 3-1.5 4 1 5' }],
  house: [{ p: 'M4 21V11l8-7 8 7v10z' }, { p: 'M9 21v-6h6v6' }],
  houses: [{ p: 'M3 21V12l5-4 5 4v9M13 21V9l4-3 4 3v12M3 21h18M6 15h2M16 13h2M16 17h2' }],
  spray: [{ p: 'M9 9h6v12H9z' }, { p: 'M10 9V6h4v3M12 3v1M16 4l1-1M18 7h1M17 10l1 1' }],
  trophy: [{ p: 'M8 4h8v5a4 4 0 0 1-8 0z' }, { p: 'M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4' }],
  wall: [{ r: [4, 5, 16, 14, 1.5] }, { p: 'M8 9l3 3-3 3M13 15h3' }],
  anchor: [{ c: [12, 5, 2] }, { p: 'M12 7v14M8 11h8M5 14a7 7 0 0 0 14 0' }],
  ship: [{ p: 'M3 16l2 4h14l2-4H3z' }, { p: 'M12 3v13M12 4l6 9h-6M12 6L7 13h5' }],
  coin: [{ c: [12, 12, 8] }, { p: 'M14.5 9.5a3 3 0 1 0 0 5M8.5 11h5M8.5 13h5' }],
  flask: [{ p: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3' }, { p: 'M7.5 15h9' }],
  fist: [{ p: 'M7 11V7a1.5 1.5 0 0 1 3 0v3M10 10V6a1.5 1.5 0 0 1 3 0v4M13 10V7a1.5 1.5 0 0 1 3 0v4M16 11a1.5 1.5 0 0 1 3 0v3c0 4-3 7-7 7s-6-3-6-6v-3a1.5 1.5 0 0 1 3 0' }],
  peace: [{ c: [12, 12, 9] }, { p: 'M12 3v18M12 12l-6.4 6.4M12 12l6.4 6.4' }],
  heart: [{ p: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' }],
  mask: [{ p: 'M4 5c4 1.5 12 1.5 16 0v6c0 5-3.6 9-8 9s-8-4-8-9z' }, { p: 'M8.5 11h2M13.5 11h2M9 15c1.7 1.4 4.3 1.4 6 0' }],
  crown: [{ p: 'M4 18l-1-10 5 4 4-6 4 6 5-4-1 10z' }, { p: 'M4 21h16' }],
  church: [{ p: 'M12 2v4M10 4h4M9 21v-9l3-3 3 3v9M5 21v-6l4-3M19 21v-6l-4-3M3 21h18' }],
  pen: [{ p: 'M4 20l4-1 11-11-3-3L5 16z' }, { p: 'M14 7l3 3' }],
  people: [{ c: [9, 8, 3] }, { p: 'M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5' }, { c: [17, 9, 2.4] }, { p: 'M16 14.6c2.4.3 4 2 4.6 4.9' }],
  paint: [{ r: [4, 4, 16, 12, 1.5] }, { p: 'M4 13l4-4 4 4 3-3 5 5M12 16v5M9 21h6' }],
  tile: [{ r: [4, 4, 16, 16, 2] }, { p: 'M12 8c-2 0-3 1.5-3 4s1 4 3 4 3-1.5 3-4-1-4-3-4zM4 8a4 4 0 0 0 4-4M20 8a4 4 0 0 1-4-4M4 16a4 4 0 0 1 4 4M20 16a4 4 0 0 0-4 4' }],
  bolt: [{ p: 'M13 3L5 14h6l-1 7 8-11h-6z' }],
  gate: [{ p: 'M4 21V8l4-3 4 3 4-3 4 3v13M4 21h16M9 21v-6a3 3 0 0 1 6 0v6' }],
  cap: [{ p: 'M2 9l10-5 10 5-10 5z' }, { p: 'M6 11v5c2 2 10 2 12 0v-5M22 9v6' }],
  factory: [{ p: 'M3 21V11l5 3V11l5 3V7h3l1-4h2l1 4v14z' }, { p: 'M7 18h2M12 18h2' }],
  scroll: [{ p: 'M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }, { p: 'M9 9h7M9 13h7M9 17h4' }],
  // tabs and controls
  map: [{ p: 'M3 6.5l5.5-2 7 2 5.5-2v13l-5.5 2-7-2-5.5 2z' }, { p: 'M6 17a6 6 0 0 1 12 0' }, { p: 'M9 17a3 3 0 0 1 6 0' }],
  route: [{ c: [5.5, 18.5, 2] }, { p: 'M7.5 18.5h3a3 3 0 0 0 0-6h-1a3 3 0 0 1 0-6h5', dash: '2 2.4' }, { p: 'M18 2.8a3.2 3.2 0 0 1 3.2 3.2c0 2.4-3.2 5.2-3.2 5.2S14.8 8.4 14.8 6A3.2 3.2 0 0 1 18 2.8z' }],
  stamp: [{ c: [12, 4.8, 2.3] }, { p: 'M10.6 7v3.2h2.8V7' }, { p: 'M6 10.2h12l1.2 4.3H4.8z' }, { p: 'M5 18.5h14', dash: '1.6 1.6' }, { p: 'M7 21h10' }],
  layers: [{ r: [4, 9, 11, 11, 1.5] }, { p: 'M8 9V5.5A1.5 1.5 0 0 1 9.5 4H18.5A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H15' }, { p: 'M7 17.5c1.5-2.5 3.5-2.5 5 0' }],
  sliders: [{ p: 'M4 7h9M17 7h3M4 17h3M11 17h9' }, { c: [15, 7, 2.2] }, { c: [9, 17, 2.2] }],
  plus: [{ p: 'M12 5v14M5 12h14' }],
  minus: [{ p: 'M5 12h14' }],
  pin: [{ p: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z' }, { c: [12, 9.5, 2.4] }],
  hourglass: [{ p: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9' }],
  chevron: [{ p: 'M9 6l6 6-6 6' }],
  down: [{ p: 'M6 9l6 6 6-6' }],
  back: [{ p: 'M15 6l-6 6 6 6' }],
  close: [{ p: 'M6 6l12 12M18 6L6 18' }],
  search: [{ c: [10.5, 10.5, 6.5] }, { p: 'M15.5 15.5L21 21' }],
  cube: [{ p: 'M4 9l8-5 8 5-8 5-8-5z' }, { p: 'M4 9v7l8 5 8-5V9' }, { p: 'M12 14v7' }],
  person: [{ c: [12, 8.5, 4] }, { p: 'M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5' }],
  mail: [{ r: [3, 5, 18, 14, 2] }, { p: 'M4 7l8 6 8-6' }],
  book: [{ p: 'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4V5zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6V5z' }],
  download: [{ p: 'M12 4v11M7 10l5 5 5-5M5 20h14' }],
  check: [{ p: 'M5 12.5l4.5 4.5L19 7.5' }],
};
export type IconName = keyof typeof I;

export function Icon({ name, size = 22, color = colors.ink, width = 1.8 }: { name: string; size?: number; color?: string; width?: number }) {
  const els = I[name] ?? I.discover;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {els.map((e, i) => ('p' in e ? <Path key={i} d={e.p} strokeDasharray={e.dash} />
        : 'c' in e ? <Circle key={i} cx={e.c[0]} cy={e.c[1]} r={e.c[2]} />
          : <Rect key={i} x={e.r[0]} y={e.r[1]} width={e.r[2]} height={e.r[3]} rx={e.r[4]} />))}
    </Svg>
  );
}

/** An icon on a light Delft-blue tile: layers and sections. */
export function IconTile({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.55)} color={colors.delft} width={1.7} />
    </View>
  );
}
