// Small flags for the language switch.
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

export function Flag({ lang, width = 30 }: { lang: 'ru' | 'en' | 'nl'; width?: number }) {
  const h = (width * 2) / 3;
  const stripes = lang === 'ru' ? ['#ffffff', '#0039a6', '#d52b1e'] : ['#ae1c28', '#ffffff', '#21468b'];
  return (
    <Svg width={width} height={h} viewBox="0 0 30 20">
      <Defs><ClipPath id={`f-${lang}`}><Rect width={30} height={20} rx={3} /></ClipPath></Defs>
      <G clipPath={`url(#f-${lang})`}>
        {lang === 'en' ? (
          <>
            <Rect width={30} height={20} fill="#012169" />
            <Path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth={4} />
            <Path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth={1.5} />
            <Path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth={6} />
            <Path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth={3.2} />
          </>
        ) : stripes.map((c, i) => <Rect key={i} y={(20 / 3) * i} width={30} height={20 / 3 + 0.2} fill={c} />)}
      </G>
      <Rect width={30} height={20} rx={3} fill="none" stroke="#d9d4c7" strokeWidth={1} />
    </Svg>
  );
}
