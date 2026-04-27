/**
 * Нормализация и форматирование казахстанских номеров.
 * Бэк принимает только +77XXXXXXXXX.
 */

/** Привести любой ввод к +77XXXXXXXXX или вернуть null, если не получилось. */
export function normalizeKzPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  let d = digits;
  // 8XXXXXXXXXX -> 7XXXXXXXXXX
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  if (d.length !== 11 || !d.startsWith('77')) return null;
  return '+' + d;
}

/** Формат для показа: +7 (701) 234 56 78 */
export function formatKzPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length !== 11 || !d.startsWith('77')) return phone;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

/**
 * Привести ввод пользователя к красивому виду по мере набора.
 * Пример: '87011' -> '+7 (701) 1'
 * Всегда возвращает строку, которая начинается с '+7 '.
 */
export function maskPhoneInput(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);              // без ведущей 7
  const p1 = rest.slice(0, 3);
  const p2 = rest.slice(3, 6);
  const p3 = rest.slice(6, 8);
  const p4 = rest.slice(8, 10);

  let out = '+7';
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ')';
  if (p2) out += ` ${p2}`;
  if (p3) out += ` ${p3}`;
  if (p4) out += ` ${p4}`;
  return out;
}
