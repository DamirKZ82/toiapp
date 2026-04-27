import React from 'react';
import { Text, View } from 'react-native';
import { spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';

interface Props {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: Props) {
  const styles = useStyles((c) => ({
    wrap: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: spacing.lg },
    title: { fontSize: 18, fontWeight: '600' as const, color: c.onSurface, textAlign: 'center' as const },
    subtitle: { marginTop: spacing.sm, fontSize: 14, color: c.muted, textAlign: 'center' as const },
  }));
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
