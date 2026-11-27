// Where the data lives and how it is cut. Built by ../pipeline, hosted on Cloudflare R2.
export const DATA = 'https://pub-6906f03443584a13a66fc2c26a45f448.r2.dev/v1';
// bump after every data upload: busts browser and edge caches for all clients
export const DATA_REV = 7;
export const dataUrl = (path: string) => `${DATA}/${path}?r=${DATA_REV}`;

// z14-15 buildings are split west to east into three archives (pipeline/p10_split_buildings.py).
// Cut points are z14 tile columns; as longitudes they bound each archive's source.
export const BUILDING_CUTS_Z14 = [8424, 8467];
const colToLon = (c: number) => (c / 2 ** 14) * 360 - 180;
export const BUILDING_PARTS = [0, 1, 2].map((i) => ({
  id: `b${i}`,
  url: `pmtiles://${dataUrl(`nl-buildings-${i}.pmtiles`)}`,
  west: i === 0 ? 3.2 : colToLon(BUILDING_CUTS_Z14[i - 1]),
  east: i === 2 ? 7.3 : colToLon(BUILDING_CUTS_Z14[i]),
}));

export const NL_BOUNDS: [number, number, number, number] = [3.2, 50.7, 7.3, 53.6];
export const HOME = { center: [5.3, 52.15] as [number, number], zoom: 6.6 };

// Construction periods: lower bound and colour (shared with the stand and the design).
export const PERIODS: { from: number; color: string; label: string }[] = [
  { from: 0, color: '#4a1410', label: 'до 1600' },
  { from: 1600, color: '#8c1c13', label: '1600–1665' },
  { from: 1666, color: '#c0462b', label: '1666–1799' },
  { from: 1800, color: '#d97a2b', label: '1800–1869' },
  { from: 1870, color: '#e5b13a', label: '1870–1913' },
  { from: 1914, color: '#8e9f3c', label: '1914–1940' },
  { from: 1941, color: '#3f8f6b', label: '1941–1964' },
  { from: 1965, color: '#2c7391', label: '1965–1984' },
  { from: 1985, color: '#3a4f9a', label: '1985–1999' },
  { from: 2000, color: '#6a3f8f', label: 'с 2000' },
];
export const MONUMENT = '#b8860b';
export const LENS_COLORS = ['#ec0000', '#1f4e8c', '#d99a12', '#2e8b57', '#7b3fa0', '#00909a', '#8c5a2b', '#d6336c'];
export const YEAR_MIN = 1300;
export const YEAR_MAX = 2026;

// Cities with hand-built lenses (layers/<GM>.json from pipeline/p14_city_layers.py)
export const LENS_CITIES = new Set(['GM0363', 'GM0503']);

export const CITIES: { name: string; code: string; center: [number, number] }[] = [
  { name: 'Амстердам', code: 'GM0363', center: [4.8952, 52.3731] },
  { name: 'Делфт', code: 'GM0503', center: [4.3571, 52.0116] },
  { name: 'Роттердам', code: 'GM0599', center: [4.4777, 51.92] },
  { name: 'Гаага', code: 'GM0518', center: [4.3113, 52.0799] },
  { name: 'Утрехт', code: 'GM0344', center: [5.1214, 52.0907] },
  { name: 'Лейден', code: 'GM0546', center: [4.4937, 52.1601] },
  { name: 'Харлем', code: 'GM0392', center: [4.637, 52.381] },
  { name: 'Гронинген', code: 'GM0014', center: [6.5665, 53.2194] },
  { name: 'Маастрихт', code: 'GM0935', center: [5.6909, 50.8514] },
];

export const periodOf = (y: number) => {
  let p = PERIODS[0];
  for (const x of PERIODS) if (y >= x.from) p = x;
  return p;
};
