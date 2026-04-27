/**
 * Координаты 36 городов Казахстана (те же, что в seed бэка).
 * Ключ — русское название, чтобы не зависеть от city_id.
 *
 * Используется для геолокации: определяем, какой из наших городов ближе всего
 * к GPS-координатам устройства.
 */

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Астана':         { lat: 51.169, lng: 71.449 },
  'Алматы':         { lat: 43.238, lng: 76.889 },
  'Шымкент':        { lat: 42.341, lng: 69.590 },
  'Актау':          { lat: 43.651, lng: 51.158 },
  'Актобе':         { lat: 50.283, lng: 57.167 },
  'Атырау':         { lat: 47.094, lng: 51.924 },
  'Жезказган':      { lat: 47.789, lng: 67.714 },
  'Караганда':      { lat: 49.806, lng: 73.085 },
  'Кокшетау':       { lat: 53.294, lng: 69.413 },
  'Костанай':       { lat: 53.214, lng: 63.632 },
  'Кызылорда':      { lat: 44.849, lng: 65.497 },
  'Павлодар':       { lat: 52.287, lng: 76.957 },
  'Петропавловск':  { lat: 54.866, lng: 69.146 },
  'Семей':          { lat: 50.411, lng: 80.227 },
  'Талдыкорган':    { lat: 45.017, lng: 78.374 },
  'Тараз':          { lat: 42.900, lng: 71.367 },
  'Темиртау':       { lat: 50.054, lng: 72.964 },
  'Туркестан':      { lat: 43.298, lng: 68.251 },
  'Уральск':        { lat: 51.233, lng: 51.367 },
  'Усть-Каменогорск': { lat: 49.948, lng: 82.628 },
  'Экибастуз':      { lat: 51.727, lng: 75.323 },
  'Балхаш':         { lat: 46.844, lng: 74.985 },
  'Жанаозен':       { lat: 43.340, lng: 52.862 },
  'Кентау':         { lat: 43.518, lng: 68.507 },
  'Риддер':         { lat: 50.349, lng: 83.527 },
  'Рудный':         { lat: 52.963, lng: 63.123 },
  'Сарань':         { lat: 49.797, lng: 72.864 },
  'Сатпаев':        { lat: 47.905, lng: 67.539 },
  'Степногорск':    { lat: 52.350, lng: 71.884 },
  'Шахтинск':       { lat: 49.708, lng: 72.600 },
  'Щучинск':        { lat: 52.928, lng: 70.200 },
  'Капчагай':       { lat: 43.876, lng: 77.079 },
  'Талгар':         { lat: 43.306, lng: 77.240 },
  'Есик':           { lat: 43.359, lng: 77.452 },
  'Каскелен':       { lat: 43.202, lng: 76.623 },
  'Жаркент':        { lat: 44.166, lng: 79.975 },
};

/** Расстояние между двумя точками в километрах (формула гаверсинусов). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + sinDLng * sinDLng * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Из списка наших городов найти ближайший к точке (lat, lng).
 * Возвращает null, если ни один город не ближе `maxKm`.
 */
export function findNearestCity<T extends { name_ru: string }>(
  cities: T[],
  point: { lat: number; lng: number },
  maxKm = 50,
): { city: T; distanceKm: number } | null {
  let best: { city: T; distanceKm: number } | null = null;
  for (const c of cities) {
    const coords = CITY_COORDS[c.name_ru];
    if (!coords) continue;
    const d = haversineKm(coords, point);
    if (d <= maxKm && (!best || d < best.distanceKm)) {
      best = { city: c, distanceKm: d };
    }
  }
  return best;
}
