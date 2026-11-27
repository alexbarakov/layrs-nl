// What the map can show: three ways to colour every building, the stamps on top, and the city's themed layers (lenses).
import { MONUMENT, PERIODS } from './config';
import { HEIGHT_STOPS, type Mode } from './style';

export interface BaseLayer { id: Mode; title: string; note: string; swatches: string[] }
export const BASE_LAYERS: BaseLayer[] = [
  { id: 'periods', title: 'Период постройки', note: 'Год постройки по реестру BAG, десять эпох', swatches: PERIODS.map((p) => p.color) },
  { id: 'monuments', title: 'Памятники', note: 'Рийксмонументы по реестру RCE', swatches: [MONUMENT, '#d9d7d0'] },
  { id: 'height', title: 'Высота', note: 'От низких домов до башен, по 3D BAG', swatches: HEIGHT_STOPS.map(([, c]) => c) },
];

// the city sites name their sections in English and Dutch; the app speaks Russian
const SECTION_RU: Record<string, string> = {
  'The modern city': 'Современный город',
  Architecture: 'Архитектура',
  'Trade and empire': 'Торговля и колонии',
  'Trade and industry': 'Торговля и промышленность',
  Discover: 'Находки',
  'Faith and community': 'Вера и община',
  'War and occupation': 'Война и оккупация',
  'War and disaster': 'Войны и бедствия',
  'Art and craft': 'Искусство и ремёсла',
  'Science and learning': 'Наука и учёба',
  'House of Orange': 'Оранский дом',
};
export const sectionRu = (s: string) => SECTION_RU[s] ?? s;

export const baseTitle = (mode: Mode) => BASE_LAYERS.find((l) => l.id === mode)!.title;
