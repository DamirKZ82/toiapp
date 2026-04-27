import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/theme/useThemeColors';

export function Loader() {
  const c = useThemeColors();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
