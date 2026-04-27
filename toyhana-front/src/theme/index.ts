import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';

/**
 * Палитры. Все компоненты берут цвета из useThemeColors().
 */

export interface AppColors {
  primary: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  error: string;
  success: string;
  muted: string;
  /** Цвет иконки/текста поверх primary */
  onPrimary: string;
  /** Полупрозрачный overlay для модалок */
  backdrop: string;
  /** Дополнительные оттенки для бейджей статусов */
  warningBg: string;
  warningFg: string;
  successBg: string;
  successFg: string;
  errorBg: string;
  errorFg: string;
  mutedBg: string;
}

export const lightColors: AppColors = {
  primary: '#1F7A4F',
  primaryContainer: '#D8EDE2',
  secondary: '#F2A03C',
  secondaryContainer: '#FFF0DC',
  background: '#FAF6F0',
  surface: '#FFFFFF',
  surfaceVariant: '#F2EDE4',
  onBackground: '#1A1A1A',
  onSurface: '#1A1A1A',
  onSurfaceVariant: '#5A5A5A',
  outline: '#D8D0C1',
  error: '#C63D3D',
  success: '#2E7D32',
  muted: '#9A8F7A',
  onPrimary: '#FFFFFF',
  backdrop: 'rgba(30, 22, 10, 0.4)',
  warningBg: '#FFF3CC',
  warningFg: '#AD7A00',
  successBg: '#D4EFDC',
  successFg: '#2E7D32',
  errorBg: '#FFD6D6',
  errorFg: '#C63D3D',
  mutedBg: '#EFEAE0',
};

export const darkColors: AppColors = {
  primary: '#4CAF78',
  primaryContainer: '#1C3A2B',
  secondary: '#F2A03C',
  secondaryContainer: '#3A2C15',
  background: '#0F0F0F',
  surface: '#1E1E1E',
  surfaceVariant: '#2A2A2A',
  onBackground: '#F0F0F0',
  onSurface: '#F0F0F0',
  onSurfaceVariant: '#AAAAAA',
  outline: '#3A3A3A',
  error: '#FF6B6B',
  success: '#7CC993',
  muted: '#7A7A7A',
  onPrimary: '#FFFFFF',
  backdrop: 'rgba(0,0,0,0.6)',
  warningBg: '#3A2E10',
  warningFg: '#FFD27A',
  successBg: '#1C3A2B',
  successFg: '#7CC993',
  errorBg: '#3A1A1A',
  errorFg: '#FF8A8A',
  mutedBg: '#252525',
};

/**
 * Для обратной совместимости со старым кодом, который импортирует { colors } —
 * здесь оставляем ссылку на светлую палитру. Новые места используют useThemeColors().
 */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
};

const fontConfig = {
  fontFamily: undefined,
};

export function buildPaperTheme(c: AppColors, dark: boolean) {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: c.primary,
      primaryContainer: c.primaryContainer,
      secondary: c.secondary,
      secondaryContainer: c.secondaryContainer,
      background: c.background,
      surface: c.surface,
      surfaceVariant: c.surfaceVariant,
      error: c.error,
      onBackground: c.onBackground,
      onSurface: c.onSurface,
      onSurfaceVariant: c.onSurfaceVariant,
      outline: c.outline,
      onPrimary: c.onPrimary,
    },
    fonts: configureFonts({ config: fontConfig }),
  };
}

/** Для обратной совместимости — дефолтная (светлая) тема Paper. */
export const paperTheme = buildPaperTheme(lightColors, false);
export type AppTheme = typeof paperTheme;
