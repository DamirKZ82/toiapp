import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/theme';
import { useThemeColors } from '@/theme/useThemeColors';
import { BackgroundPattern } from './BackgroundPattern';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  withTopInset?: boolean;
  /** Отключить фоновый орнамент (например, на экранах поверх которых модалки). */
  withoutPattern?: boolean;
  /** Отключить умное поведение клавиатуры (если экран сам управляет). */
  withoutKeyboardHandling?: boolean;
}

/**
 * Универсальный экран:
 *  - Применяет safe-area inset'ы по бокам и (опционально) сверху
 *  - Рисует фоновый орнамент
 *  - При scroll=true оборачивает в ScrollView, который правильно ведёт себя
 *    с клавиатурой: поднимается над клавиатурой, закрывает её по тапу за
 *    пределами полей ввода.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  withTopInset = false,
  withoutPattern = false,
  withoutKeyboardHandling = false,
}: ScreenProps) {
  const colors = useThemeColors();

  const inner = (
    <View
      style={[
        styles.inner,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );

  const edges = withTopInset
    ? (['top', 'left', 'right'] as const)
    : (['left', 'right'] as const);

  // Содержимое (с учётом scroll/keyboard).
  // - Тап вне полей: закрывает клавиатуру (Pressable + Keyboard.dismiss).
  // - keyboardShouldPersistTaps="handled": клик по кнопке внутри ScrollView
  //   срабатывает, не закрывая клавиатуру первым тапом.
  let content: React.ReactNode;
  if (scroll) {
    content = (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {inner}
      </ScrollView>
    );
  } else {
    content = inner;
  }

  // Если экран обрабатывает клавиатуру сам — отдаём контент без оборачивания.
  if (withoutKeyboardHandling) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={edges}
      >
        {!withoutPattern ? <BackgroundPattern /> : null}
        {content}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={edges}
    >
      {!withoutPattern ? <BackgroundPattern /> : null}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // На Android KeyboardAvoidingView мешает (system insets уже учитываются),
        // поэтому behavior=undefined => компонент превращается в обычный View.
      >
        {/* Pressable-обёртка ловит тап вне полей ввода и закрывает клавиатуру.
            Не блокирует прокрутку и нажатия по кнопкам, потому что Pressable
            пропускает события вглубь, если они не были обработаны handler'ом. */}
        <Pressable
          style={styles.dismissArea}
          onPress={Keyboard.dismiss}
          // Не делаем визуального отклика — это просто прозрачный слой
          android_disableSound
          android_ripple={null}
        >
          {content}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  dismissArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
