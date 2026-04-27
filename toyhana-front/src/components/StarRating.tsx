import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 28, readOnly }: Props) {
  const c = useThemeColors();
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.wrap}>
      {stars.map((n) => {
        const filled = n <= value;
        const iconName = filled ? 'star' : 'star-outline';
        const color = filled ? c.secondary : c.muted;
        const handler = readOnly || !onChange ? undefined : () => onChange(n);
        return (
          <Pressable key={n} onPress={handler} hitSlop={4}>
            <Icon name={iconName} size={size} color={color} style={styles.star} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  star: { marginRight: 2 },
});
