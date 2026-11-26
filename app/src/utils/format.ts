// Russian number and distance formatting with non-breaking spaces before units.
const NUM = new Intl.NumberFormat('ru', { maximumFractionDigits: 1 });
const KM = new Intl.NumberFormat('ru', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const num = (n: number) => NUM.format(n);
export const meters = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} м` : `${KM.format(m / 1000)} км`);
export const plural = (n: number, a: string, b: string, c: string) =>
  n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;
export const yearLabel = (y: number, q?: number) => (y > 0 ? (q === 1 || q === 2 || q === 4 ? `около ${y}` : String(y)) : 'год неизвестен');
export const Q_TEXT: Record<number, string> = { 1: 'год округлён в BAG, показан приблизительно', 2: 'оценка по соседним домам', 3: 'по реестру памятников RCE', 4: 'по реестру RCE, приблизительно' };
