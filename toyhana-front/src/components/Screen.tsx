import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
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
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  withTopInset = false,
  withoutPattern = false,
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

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={edges}
    >
      {!withoutPattern ? <BackgroundPattern /> : null}
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
