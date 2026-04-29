import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Возвращает безопасный нижний отступ для bottom-листов.
 *
 * На Android с 3-кнопочной навигацией ОС не возвращает inset.bottom,
 * хотя кнопки физически перекрывают нижнюю часть экрана. Поэтому берём
 * максимум между inset и резервным значением.
 *
 * На iOS резервное не нужно — inset.bottom всегда корректный (home indicator).
 */
const ANDROID_NAV_BAR_FALLBACK = 24;

export function useSafeBottomInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'android') {
    return Math.max(insets.bottom, ANDROID_NAV_BAR_FALLBACK);
  }
  return insets.bottom;
}
