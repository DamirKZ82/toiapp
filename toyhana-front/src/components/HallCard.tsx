import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { radii, spacing } from '@/theme';
import { useThemeColors, useIsDark } from '@/theme/useThemeColors';
import { useStyles } from '@/theme/useStyles';
import { formatPrice } from '@/utils/format';
import { dictName } from '@/utils/i18nDict';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import type { HallCardData } from '@/api/types';

interface Props {
  item: HallCardData;
  onPress: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export function HallCard({ item, onPress, onToggleFavorite, isFavorite }: Props) {
  const lang = useAuthStore((s) => s.user?.language ?? 'ru');
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = useStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      overflow: 'hidden' as const,
      // На светлой теме — тонкая граница вместо тени (с бежевым фоном тень почти не видна).
      // На тёмной — мягкая тень для отделения от фона.
      borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: c.outline,
      elevation: isDark ? 2 : 0,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.3 : 0,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    photoWrap: {
      width: '100%' as const,
      aspectRatio: 16 / 10,
      backgroundColor: c.surfaceVariant,
    },
    photo: { width: '100%' as const, height: '100%' as const },
    noPhoto: { alignItems: 'center' as const, justifyContent: 'center' as const },
    favBtn: {
      position: 'absolute' as const,
      top: spacing.sm,
      right: spacing.sm,
      padding: 6,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: radii.pill,
    },
    busyBadge: {
      position: 'absolute' as const,
      bottom: spacing.sm,
      left: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: 'rgba(0,0,0,0.75)',
      borderRadius: radii.sm,
    },
    busyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
    body: { padding: spacing.md },
    name: { fontSize: 17, fontWeight: '700' as const, color: c.onSurface },
    venue: { fontSize: 13, color: c.muted, marginTop: 2 },
    metaRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginTop: spacing.sm },
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: c.surfaceVariant,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      marginRight: spacing.sm,
      marginBottom: 4,
    },
    chipText: { fontSize: 12, color: c.onSurface, marginLeft: 4 },
    priceRow: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      marginTop: spacing.sm,
    },
    price: { fontSize: 18, fontWeight: '700' as const, color: c.primary },
    priceHint: { fontSize: 12, color: c.muted, marginLeft: spacing.sm },
  }));

  const photo = item.main_photo ? `${API_BASE_URL}${item.main_photo}` : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.photoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Icon name="image-off-outline" size={48} color={colors.muted} />
          </View>
        )}
        {onToggleFavorite ? (
          <Pressable style={styles.favBtn} onPress={onToggleFavorite} hitSlop={8}>
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? colors.primary : '#FFFFFF'}
            />
          </Pressable>
        ) : null}
        {item.is_busy_on_date ? (
          <View style={styles.busyBadge}>
            <Text style={styles.busyText}>Занято</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.hall.name}</Text>
        <Text style={styles.venue} numberOfLines={1}>
          {item.venue.name} · {dictName(item.city, lang)}
        </Text>

        <View style={styles.metaRow}>
          {item.hall.capacity_min != null || item.hall.capacity_max != null ? (
            <View style={styles.chip}>
              <Icon name="account-group-outline" size={14} color={colors.muted} />
              <Text style={styles.chipText}>
                {item.hall.capacity_min ?? '?'}–{item.hall.capacity_max ?? '?'}
              </Text>
            </View>
          ) : null}
          {item.rating.count > 0 ? (
            <View style={styles.chip}>
              <Icon name="star" size={14} color={colors.secondary} />
              <Text style={styles.chipText}>
                {item.rating.avg.toFixed(1)} · {item.rating.count}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(item.price_on_date)}</Text>
          {item.price_is_estimate ? (
            <Text style={styles.priceHint}>от · за вечер</Text>
          ) : (
            <Text style={styles.priceHint}>за вечер</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
