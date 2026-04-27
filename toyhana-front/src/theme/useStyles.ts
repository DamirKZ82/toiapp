import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { AppColors } from './index';
import { useThemeColors } from './useThemeColors';

/**
 * Хелпер для тематических стилей. Вызывается в компоненте:
 *
 *   const styles = useStyles((c) => ({
 *     wrap: { backgroundColor: c.surface },
 *     text: { color: c.onSurface },
 *   }));
 *
 * Стили пересчитываются, только когда меняется палитра (тема).
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: AppColors) => T,
): T {
  const colors = useThemeColors();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
