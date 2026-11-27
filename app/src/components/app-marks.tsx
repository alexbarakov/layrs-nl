// Small marks for the "open in" apps on the building card. Simplified, drawn here; not the vendors' logo files.
import Svg, { Circle, G, Path } from 'react-native-svg';
import { View } from 'react-native';

function Tile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

/** ChatGPT: a knot of six rounded petals on black. */
export function ChatGptMark() {
  return (
    <Tile bg="#0d0d0d">
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round">
        <G>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <Path key={a} d="M12 12V5.6a3.6 3.6 0 0 1 6.2-2.5" transform={`rotate(${a} 12 12)`} />
          ))}
        </G>
      </Svg>
    </Tile>
  );
}

/** Claude: a terracotta sunburst. */
export function ClaudeMark() {
  return (
    <Tile bg="#f4e9e2">
      <Svg width={26} height={26} viewBox="0 0 24 24">
        {Array.from({ length: 12 }, (_, i) => (
          <Path key={i} d="M12 12L12 3.2" stroke="#d97757" strokeWidth={2.2} strokeLinecap="round"
            transform={`rotate(${i * 30} 12 12) scale(1 ${i % 2 ? 0.82 : 1}) `} />
        ))}
        <Circle cx={12} cy={12} r={2.2} fill="#d97757" />
      </Svg>
    </Tile>
  );
}

/** Maps: a pin in four colours on a light tile. */
export function MapsMark() {
  return (
    <Tile bg="#eef3fb">
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 22s-7-6.6-7-12a7 7 0 0 1 7-7z" fill="#1a73e8" />
        <Path d="M12 22s7-6.6 7-12a7 7 0 0 0-7-7z" fill="#34a853" />
        <Path d="M5 10a7 7 0 0 1 7-7v7z" fill="#ea4335" />
        <Path d="M19 10a7 7 0 0 0-7-7v7z" fill="#fbbc04" />
        <Circle cx={12} cy={10} r={2.6} fill="#fff" />
      </Svg>
    </Tile>
  );
}

/** BAG viewer (Kadaster): a building outline on Dutch blue. */
export function RegisterMark() {
  return (
    <Tile bg="#e7edf6">
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1f4f96" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
        <Path d="M4 21V9l8-5 8 5v12z" /><Path d="M9 21v-6h6v6M4 21h16" />
      </Svg>
    </Tile>
  );
}
