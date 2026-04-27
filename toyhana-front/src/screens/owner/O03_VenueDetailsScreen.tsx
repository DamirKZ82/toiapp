import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '@/components/Screen';
import { Loader } from '@/components/Loader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';

import { venuesApi, ApiError } from '@/api';
import type { VenueDetails } from '@/api';
import { API_BASE_URL } from '@/config';
import { formatPrice } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { ProfileStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'VenueDetails'>;

export default function VenueDetailsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { venueGuid } = route.params;

  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await venuesApi.get(venueGuid);
      setVenue(res.venue);
      navigation.setOptions({ title: res.venue.name });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error_generic'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [venueGuid, navigation, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><Loader /></Screen>;
  if (!venue) return <Screen><ErrorBanner message={error ?? t('common.error_generic')} /></Screen>;

  return (
    <Screen padded={false}>
      <FlatList
        data={venue.halls}
        keyExtractor={(h) => h.guid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.name}>{venue.name}</Text>
              <Text style={styles.address}>{venue.address}</Text>
              <Button
                mode="outlined"
                icon="pencil"
                style={styles.editBtn}
                onPress={() => navigation.navigate('VenueForm', { venueGuid: venue.guid })}
              >
                {t('common.edit')}
              </Button>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('owner.venue_details_halls')}</Text>
              <IconButton
                icon="plus"
                iconColor={colors.primary}
                onPress={() => navigation.navigate('HallForm', { venueGuid: venue.guid })}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState title={t('owner.no_halls')} subtitle={t('owner.add_hall')} />
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate('HallForm', { venueGuid: venue.guid })}
              style={styles.emptyBtn}
            >
              {t('owner.add_hall')}
            </Button>
          </View>
        }
        renderItem={({ item: hall }) => {
          const thumb = hall.photos[0]?.thumb_path
            ? `${API_BASE_URL}${hall.photos[0].thumb_path}`
            : null;
          return (
            <Pressable
              style={styles.hallCard}
              onPress={() => navigation.navigate('HallForm', { venueGuid: venue.guid, hallGuid: hall.guid })}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.hallThumb} />
              ) : (
                <View style={[styles.hallThumb, styles.hallThumbEmpty]}>
                  <Icon name="image-outline" size={28} color={colors.muted} />
                </View>
              )}
              <View style={styles.hallBody}>
                <Text style={styles.hallName} numberOfLines={1}>{hall.name}</Text>
                <Text style={styles.hallMeta}>
                  {hall.capacity_min ?? '?'}–{hall.capacity_max ?? '?'} гостей
                </Text>
                <Text style={styles.hallPrice}>
                  {formatPrice(hall.price_weekday)} / {formatPrice(hall.price_weekend)}
                </Text>
                {!hall.is_active ? (
                  <Text style={styles.inactive}>Скрыт из поиска</Text>
                ) : null}
              </View>
              <View style={styles.hallActions}>
                <IconButton
                  icon="calendar-check-outline"
                  size={24}
                  onPress={() => navigation.navigate('HallCalendar', {
                    hallGuid: hall.guid, hallName: hall.name,
                  })}
                />
                <Icon name="chevron-right" size={24} color={colors.muted} />
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  header: { marginBottom: spacing.md },
  name: { fontSize: 22, fontWeight: '700', color: colors.onSurface },
  address: { fontSize: 14, color: colors.muted, marginTop: 4 },
  editBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm, marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase',
  },
  emptyWrap: { marginTop: spacing.xl },
  emptyBtn: { marginHorizontal: spacing.xl, marginTop: spacing.md },
  hallCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.sm, marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.outline,
  },
  hallThumb: { width: 68, height: 68, borderRadius: radii.md, backgroundColor: colors.surfaceVariant },
  hallThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  hallBody: { flex: 1, marginLeft: spacing.sm },
  hallName: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  hallMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  hallPrice: { fontSize: 12, color: colors.primary, marginTop: 2 },
  inactive: { fontSize: 11, color: colors.error, marginTop: 2 },
  hallActions: { flexDirection: 'row', alignItems: 'center' },
});
