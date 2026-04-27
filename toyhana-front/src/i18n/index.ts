import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ru from './ru.json';
import kz from './kz.json';

export type AppLanguage = 'ru' | 'kz';

/**
 * Определить стартовый язык.
 * Если язык устройства — казахский, берём 'kz'.
 * Иначе — 'ru' (дефолт). Русский в КЗ понимают почти все.
 * Позже authStore перезапишет язык из профиля пользователя.
 */
export function detectInitialLanguage(): AppLanguage {
  const locales = Localization.getLocales();
  const first = locales[0]?.languageCode ?? 'ru';
  return first === 'kk' || first === 'kz' ? 'kz' : 'ru';
}

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      ru: { translation: ru },
      kz: { translation: kz },
    },
    lng: detectInitialLanguage(),
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
  });

export function setAppLanguage(lang: AppLanguage) {
  i18n.changeLanguage(lang);
}

export default i18n;
