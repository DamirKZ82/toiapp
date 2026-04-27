import React from 'react';
import { Text, View } from 'react-native';
import { radii, spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';

export function ErrorBanner({ message }: { message: string | null | undefined }) {
  const styles = useStyles((c) => ({
    wrap: {
      backgroundColor: c.errorBg,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    text: { color: c.errorFg, fontSize: 14 },
  }));
  if (!message) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
