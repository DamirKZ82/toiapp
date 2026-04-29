import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/theme/useThemeColors';

/**
 * Глобальный ID который должны указывать все TextInput с числовой клавиатурой.
 * iOS показывает над клавиатурой панель с кнопкой "Готово", закрывающей клавиатуру.
 *
 * Использование:
 *   <TextInput ... inputAccessoryViewID={KEYBOARD_TOOLBAR_ID} />
 *   <KeyboardToolbar />  // один раз в корне App
 */
export const KEYBOARD_TOOLBAR_ID = 'kb-toolbar-done';

/**
 * Невидимый компонент, монтируется один раз в корне приложения.
 * Реально рендерит панель только на iOS (InputAccessoryView недоступен на Android —
 * там пользователь закрывает клавиатуру системной кнопкой "назад"/жестом).
 */
export function KeyboardToolbar() {
  const c = useThemeColors();
  const { t } = useTranslation();

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_TOOLBAR_ID}>
      <View
        style={[
          styles.bar,
          { backgroundColor: c.surface, borderTopColor: c.outline },
        ]}
      >
        <Pressable
          onPress={() => Keyboard.dismiss()}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Text style={[styles.btnText, { color: c.primary }]}>
            {t('common.done', 'Готово')}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
