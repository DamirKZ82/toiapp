import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/store/themeStore';
import {
  AppColors,
  buildPaperTheme,
  darkColors,
  lightColors,
} from './index';

/**
 * Вернёт актуальную палитру на основании:
 * - режима из themeStore ('system' | 'light' | 'dark')
 * - системной схемы (когда режим 'system')
 */
export function useThemeColors(): AppColors {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();   // 'light' | 'dark' | null

  const isDark =
    mode === 'dark'
      ? true
      : mode === 'light'
        ? false
        : system === 'dark';

  return isDark ? darkColors : lightColors;
}

/**
 * Тема Paper на основе текущей палитры.
 * Используется один раз в App.tsx.
 */
export function useAppPaperTheme() {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();

  const isDark =
    mode === 'dark'
      ? true
      : mode === 'light'
        ? false
        : system === 'dark';

  const palette = isDark ? darkColors : lightColors;
  return buildPaperTheme(palette, isDark);
}

/** True если текущая тема тёмная. Нужно для StatusBar и прочего. */
export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  return mode === 'dark' ? true : mode === 'light' ? false : system === 'dark';
}
