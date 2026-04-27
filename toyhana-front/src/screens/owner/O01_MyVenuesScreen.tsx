import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button, FAB } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '@/components/Screen';
import { Loader } from '@/components/Loader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';

import { venuesApi, dictsApi, ApiError } from '@/api';
import type { MyVenue } from '@/api';
import type { City } from '@/api/types';
import { API_BASE_URL } from '@/config';
import { dictName } from '@/utils/i18nDict';
import { useAuthStore } from '@/store/authStore';
import { radii, spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import { useThemeColors } from '@/theme/useThemeColors';
import type { ProfileStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyVenues'>;

export default function MyVenuesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const lang = useAuthStore((s) => s.user?.language ?? 'ru');
  const c = useThemeColors();

  const styles = useStyles((cc) => ({
    list: { padding: spacing.md, flexGrow: 1 },
    errWrap: { marginBottom: spacing.sm },
    emptyWrap: { flex: 1, justifyContent: 'center' as const, paddingHorizontal: spacing.lg },
    emptyBtn: { marginHorizontal: spacing.xl, marginTop: spacing.md },
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: cc.surface,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      padding: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: cc.outline,
    },
    thumb: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: cc.surfaceVariant },
    noThumb: { alignItems: 'center' as const, justifyContent: 'center' as const },
    body: { flex: 1, marginLeft: spacing.sm },
    name: { fontSize: 16, fontWeight: '700' as const, color: cc.onSurface },
    meta: { fontSize: 13, color: cc.muted, marginTop: 2 },
    hallsCount: { fontSize: 12, color: cc.muted, marginTop: 4 },
    fab: {
      position: 'absolute' as const,
      right: spacing.md,
      bottom: spacing.md,
      backgroundColor: cc.primary,
    },
  }));

  const [items, setItems] = useState<MyVenue[]>([]);
  const [cities, setCities] = useState<Record<number, City>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [venues, citiesResp] = await Promise.all([
        venuesApi.my(),
        dictsApi.cities(),
      ]);
      setItems(venues.items);
      const map: Record<number, City> = {};
      for (const cc of citiesResp.items) map[cc.id] = cc;
      setCities(map);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error_generic'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(v) => v.guid}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={error ? <View style={styles.errWrap}><ErrorBanner message={error} /></View> : null}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title={t('owner.venues_empty_title')}
                subtitle={t('owner.venues_empty_hint')}
              />
              <Button
                mode="contained"
                icon="plus"
                onPress={() => navigation.navigate('VenueForm', {})}
                style={styles.emptyBtn}
              >
                {t('owner.add_venue')}
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const firstHall = item.halls.find((h) => h.main_thumb);
          const thumb = firstHall?.main_thumb ? `${API_BASE_URL}${firstHall.main_thumb}` : null;
          const city = cities[item.city_id];
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('VenueDetails', { venueGuid: item.guid })}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.noThumb]}>
                  <Icon name="domain" size={32} color={c.muted} />
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {city ? dictName(city, lang) : ''} · {item.address}
                </Text>
                <Text style={styles.hallsCount}>
                  {item.halls.length > 0
                    ? `${item.halls.length} ${item.halls.length === 1 ? 'зал' : 'залов'}`
                    : t('owner.no_halls')}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={c.muted} />
            </Pressable>
          );
        }}
      />

      {items.length > 0 ? (
        <FAB
          icon="plus"
          style={styles.fab}
          color={c.onPrimary}
          onPress={() => navigation.navigate('VenueForm', {})}
          label={t('owner.add_venue')}
        />
      ) : null}
    </Screen>
  );
}
