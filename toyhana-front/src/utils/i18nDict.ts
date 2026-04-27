interface WithLangNames {
  name_ru: string;
  name_kz: string;
}

export function dictName(item: WithLangNames, lang: 'ru' | 'kz'): string {
  return lang === 'kz' ? item.name_kz : item.name_ru;
}
