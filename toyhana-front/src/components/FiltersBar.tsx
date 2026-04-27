import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { radii, spacing } from '@/theme';
import { useThemeColors } from '@/theme/useThemeColors';
import { useStyles } from '@/theme/useStyles';
import { formatDateHuman } from '@/utils/format';
import { dictName } from '@/utils/i18nDict';
import { useAuthStore } from '@/store/authStore';
import type { City } from '@/api/types';

export interface FiltersBarValue {
  city: City | null;
  date: string | null;
  guests: number | null;
  priceMax: number | null;
  amenityCount: number;
}

interface Props {
  value: FiltersBarValue;
  onCityPress: () => void;
  onDatePress: () => void;
  onGuestsPress: () => void;
  onExtraFilters: () => void;
}

export function FiltersBar({
  value, onCityPress, onDatePress, onGuestsPress, onExtraFilters,
}: Props) {
  const lang = useAuthStore((s) => s.user?.language ?? 'ru');
  const colors = useThemeColors();
  const styles = useStyles((c) => ({
    wrap: {
      backgroundColor: c.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.outline,
    },
    row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      backgroundColor: c.surfaceVariant,
      marginRight: spacing.sm,
    },
    chipActive: {
      backgroundColor: c.primaryContainer,
    },
    chipText: {
      fontSize: 13,
      color: c.onSurface,
      marginLeft: spacing.xs,
      maxWidth: 180,
    },
    chipTextActive: { color: c.primary, fontWeight: '600' as const },
  }));

  const cityLabel = value.city ? dictName(value.city, lang) : 'Город';
  const dateLabel = value.date ? formatDateHuman(value.date, lang) : 'Дата';
  const guestsLabel = value.guests ? `${value.guests} гостей` : 'Гости';
  const extraCount = (value.priceMax ? 1 : 0) + value.amenityCount;

  const Chip = ({
    active, onPress, icon, label,
  }: {
    active: boolean;
    onPress: () => void;
    icon: keyof typeof import('@expo/vector-icons/build/MaterialCommunityIcons').default.glyphMap;
    label: string;
  }) => (
    <Pressable
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
    >
      <Icon name={icon} size={16} color={active ? colors.primary : colors.muted} />
      <Text
        style={[styles.chipText, active ? styles.chipTextActive : null]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip active={!!value.city} onPress={onCityPress} icon="map-marker" label={cityLabel} />
        <Chip active={!!value.date} onPress={onDatePress} icon="calendar" label={dateLabel} />
        <Chip active={!!value.guests} onPress={onGuestsPress} icon="account-group-outline" label={guestsLabel} />
        <Chip
          active={extraCount > 0}
          onPress={onExtraFilters}
          icon="tune-variant"
          label={extraCount > 0 ? `Фильтры · ${extraCount}` : 'Фильтры'}
        />
      </ScrollView>
    </View>
  );
}
