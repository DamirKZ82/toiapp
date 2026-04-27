/**
 * Форматирование цены и дат.
 */

/** Цена с пробелами как разделителем тысяч: 350 000 ₸ */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  const withSpaces = abs.toLocaleString('ru-RU').replace(/,/g, ' ');
  return `${withSpaces} ₸`;
}

const monthsRu = [
  '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const monthsKz = [
  '', 'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
];

/** '2027-05-15' -> '15 мая 2027' */
export function formatDateHuman(iso: string, lang: 'ru' | 'kz' = 'ru'): string {
  if (!iso || iso.length !== 10) return iso;
  const [y, m, d] = iso.split('-');
  const months = lang === 'kz' ? monthsKz : monthsRu;
  return `${parseInt(d, 10)} ${months[parseInt(m, 10)]} ${y}`;
}

/** Сегодняшняя дата в формате YYYY-MM-DD (локальная зона устройства) */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Конкатенация YYYY-MM-DD для месяца вперёд: '2026-04-01' -> '2026-05-01' */
export function addMonths(iso: string, delta: number): string {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  const ry = d.getFullYear();
  const rm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ry}-${rm}-01`;
}

/** 'YYYY-MM' из 'YYYY-MM-DD' */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Преобразовать YYYY-MM в первый день месяца */
export function firstDayOfMonth(ym: string): string {
  return `${ym}-01`;
}
