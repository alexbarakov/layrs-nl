// What the map can show: three ways to colour every building, the stamps on top, and the city's themed layers (lenses).
import { MONUMENT, PERIODS } from './config';
import { HEIGHT_STOPS, type Mode } from './style';

export interface BaseLayer { id: Mode; title: string; note: string; swatches: string[] }
export const BASE_LAYERS: BaseLayer[] = [
  { id: 'periods', title: 'Год постройки', note: 'Год постройки по реестру BAG, десять эпох', swatches: PERIODS.map((p) => p.color) },
  { id: 'monuments', title: 'Памятники', note: 'Рийксмонументы по реестру RCE', swatches: [MONUMENT, '#d9d7d0'] },
  { id: 'height', title: 'Высота', note: 'От низких домов до башен, по 3D BAG', swatches: HEIGHT_STOPS.map(([, c]) => c) },
];

// the city sites name sections and layers in English and Dutch; the app shows Russian titles and its own icons
const SECTIONS: Record<string, { ru: string; icon: string }> = {
  'The modern city': { ru: 'Современный город', icon: 'modern' },
  Architecture: { ru: 'Архитектура', icon: 'arch' },
  'Trade and empire': { ru: 'Торговля', icon: 'trade' },
  'Trade and industry': { ru: 'Торговля и промышленность', icon: 'trade' },
  Discover: { ru: 'Находки', icon: 'discover' },
  'Faith and community': { ru: 'Вера и община', icon: 'faith' },
  'War and occupation': { ru: 'Война', icon: 'war' },
  'War and disaster': { ru: 'Война и бедствия', icon: 'war' },
  'Art and craft': { ru: 'Искусство', icon: 'art' },
  'Science and learning': { ru: 'Наука', icon: 'science' },
  'House of Orange': { ru: 'Оранский дом', icon: 'orange' },
};
export const sectionRu = (s: string) => SECTIONS[s]?.ru ?? s;
export const sectionIcon = (s: string) => SECTIONS[s]?.icon ?? 'discover';

const LAYERS: Record<string, [string, string]> = {
  // Amsterdam
  Gables: ['Фасады и щипцы', 'gable'],
  'Warehouses and the companies': ['Склады и торговые компании', 'anchor'],
  'The canal ring': ['Кольцо каналов', 'canal'],
  'Faith and charity': ['Вера и милосердие', 'heart'],
  'Architecture styles': ['Архитектурные стили', 'column'],
  Architects: ['Архитекторы', 'pen'],
  'Housing Act homes': ['Дома по жилищному закону', 'houses'],
  'The planned city': ['Плановый город', 'modern'],
  'Under fire, 1940–1945': ['Под огнём, 1940–1945', 'flame'],
  'The raid on Noord, 17 July 1943': ['Налёт на Норд, 17 июля 1943', 'crack'],
  'Art on the walls': ['Искусство на стенах', 'paint'],
  'Prize-winning architecture': ['Архитектура с премиями', 'trophy'],
  'Street art': ['Стрит-арт', 'spray'],
  'Protected heritage': ['Охраняемое наследие', 'shield'],
  'The world in Amsterdam': ['Мир в Амстердаме', 'globe'],
  'Jewish Amsterdam': ['Еврейский Амстердам', 'star'],
  'Secrets of the city': ['Секреты города', 'key'],
  'Golden Age merchants': ['Купцы Золотого века', 'coin'],
  'Rembrandt and the painters': ['Рембрандт и художники', 'brush'],
  'The port and the navy': ['Порт и флот', 'ship'],
  'Science and medicine': ['Наука и медицина', 'flask'],
  'Resistance and liberation': ['Сопротивление и освобождение', 'fist'],
  'Provo, squatters and the free city': ['Прово, сквоттеры и свободный город', 'peace'],
  'Queer Amsterdam': ['Квир-Амстердам', 'heart'],
  'Music and theatre': ['Музыка и театр', 'mask'],
  'Royal Amsterdam': ['Королевский Амстердам', 'crown'],
  'The 19th-century city': ['Город XIX века', 'house'],
  'Churches of the city': ['Церкви города', 'church'],
  'Writers and thinkers': ['Писатели и мыслители', 'book'],
  'Who lived here': ['Кто здесь жил', 'people'],
  // Delft
  "Vermeer's Delft": ['Делфт Вермеера', 'brush'],
  'William of Orange': ['Вильгельм Оранский', 'crown'],
  'The Delft Thunderclap': ['Делфтский гром, 1654', 'bolt'],
  'Scientists and engineers': ['Учёные и инженеры', 'flask'],
  'Delft Blue': ['Делфтский фаянс', 'tile'],
  'Markets, beer and trade': ['Рынки, пиво и торговля', 'coin'],
  'Almshouses and orphanages': ['Богадельни и сиротские дома', 'heart'],
  'Churches, open and hidden': ['Церкви, открытые и тайные', 'church'],
  'Walls, gates and arsenals': ['Стены, ворота и арсеналы', 'gate'],
  'Student Delft': ['Студенческий Делфт', 'cap'],
  'Occupation 1940–1945': ['Оккупация 1940–1945', 'war'],
  'Factories and the garden village': ['Фабрики и город-сад', 'factory'],
  'Delft in 1832': ['Делфт в 1832 году', 'scroll'],
};
export const layerRu = (title: string) => LAYERS[title]?.[0] ?? title;
export const layerIcon = (title: string, section: string) => LAYERS[title]?.[1] ?? sectionIcon(section);

export const plBuildings = (n: number) => {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? 'здание' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'здания' : 'зданий';
  return `${new Intl.NumberFormat('ru-RU').format(n)} ${w}`;
};

export const baseTitle = (mode: Mode) => BASE_LAYERS.find((l) => l.id === mode)!.title;
