import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

import { Screen } from '@/components/Screen';
import { Loader } from '@/components/Loader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { HallCard } from '@/components/HallCard';
import { FiltersBar, FiltersBarValue } from '@/components/FiltersBar';
import { CityPicker } from '@/components/CityPicker';
import { DatePickerSheet } from '@/components/DatePicker';
import { GuestsPicker } from '@/components/GuestsPicker';
import { FiltersSheet, SortOption } from '@/components/FiltersSheet';

import { dictsApi, searchApi, ApiError } from '@/api';
import type { Amenity, City, HallCardData } from '@/api/types';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useRequireAuth } from '@/store/useRequireAuth';
import { radii, spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import { useThemeColors } from '@/theme/useThemeColors';
import { findNearestCity } from '@/utils/cityCoords';
import { secureGet, secureSet } from '@/store/secureStorage';
import type { SearchStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

const PAGE_SIZE = 20;
const SAVED_CITY_KEY = 'toyhana.selectedCityId';

type CitySource = 'user' | 'geo' | 'none';

export default function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const styles = useStyles((cc) => ({
    list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
    count: { fontSize: 13, color: cc.muted, marginBottom: spacing.sm },
    banner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: cc.primaryContainer,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    bannerText: { flex: 1, fontSize: 13, color: cc.onSurface, marginLeft: spacing.sm },
    bannerClose: { padding: 4 },
  }));

  const [cities, setCities] = useState<City[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const [city, setCity] = useState<City | null>(null);
  const [citySource, setCitySource] = useState<CitySource>('none');
  const [showNoCityBanner, setShowNoCityBanner] = useState(false);

  const [date, setDate] = useState<string | null>(null);
  const [guests, setGuests] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [amenityIds, setAmenityIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortOption>('rating_desc');

  const [cityOpen, setCityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [items, setItems] = useState<HallCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Реактивная подписка: Set сам по себе не триггерит перерисовку, но
  // он заменяется целиком (new Set()) в store при каждом toggle, так что
  // ссылка на него меняется и компонент перерисовывается.
  const favGuids = useFavoritesStore((s) => s.guids);
  const isFav = useCallback((hallGuid: string) => favGuids.has(hallGuid), [favGuids]);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const requireAuth = useRequireAuth();

  // Флаг — определили ли мы город. Поиск ждёт этот флаг, чтобы не стартовать дважды.
  const citySettledRef = useRef(false);

  // Загрузка справочников + определение города.
  // Выполняется ОДИН РАЗ при монтировании экрана.
  useEffect(() => {
    (async () => {
      try {
        const [citiesResp, amenitiesResp] = await Promise.all([
          dictsApi.cities(),
          dictsApi.amenities(),
        ]);
        setCities(citiesResp.items);
        setAmenities(amenitiesResp.items);

        // Попытка 1: ранее сохранённый выбор
        const savedRaw = await secureGet(SAVED_CITY_KEY);
        if (savedRaw) {
          const savedId = parseInt(savedRaw, 10);
          const found = citiesResp.items.find((x) => x.id === savedId);
          if (found) {
            setCity(found);
            setCitySource('user');
            citySettledRef.current = true;
            return;
          }
        }

        // Попытка 2: геолокация
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.granted) {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const nearest = findNearestCity(citiesResp.items, point, 50);
            if (nearest) {
              setCity(nearest.city);
              setCitySource('geo');
              citySettledRef.current = true;
              return;
            } else {
              // GPS сработал, но мы не работаем рядом — баннер + все города
              setShowNoCityBanner(true);
            }
          }
        } catch { /* ignore геолокационные ошибки */ }
      } catch { /* покажем ошибку в баннере при поиске */ }
      // Флаг всё равно поднимаем — иначе поиск не стартует
      citySettledRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtersValue: FiltersBarValue = useMemo(() => ({
    city,
    date,
    guests,
    priceMax,
    amenityCount: amenityIds.length,
  }), [city, date, guests, priceMax, amenityIds]);

  const doSearch = useCallback(async (pageToLoad: number, replace: boolean) => {
    if (pageToLoad === 1) setLoading(true);
    setError(null);
    try {
      const resp = await searchApi.halls({
        city_id: city?.id,
        date: date ?? undefined,
        guests: guests ?? undefined,
        price_max: priceMax ?? undefined,
        amenity_ids: amenityIds.length ? amenityIds : undefined,
        sort,
        page: pageToLoad,
        page_size: PAGE_SIZE,
      });
      setTotal(resp.total);
      setPage(resp.page);
      setHasMore(resp.page * resp.page_size < resp.total);
      setItems((prev) => replace ? resp.items : [...prev, ...resp.items]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error_generic'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, date, guests, priceMax, amenityIds, sort, t]);

  // При изменении любого фильтра — обновляем с первой страницы.
  // Первый поиск стартует только когда определился initial city (или не определился, но попытка прошла).
  useEffect(() => {
    if (!citySettledRef.current) return;
    doSearch(1, true);
  }, [city, date, guests, priceMax, amenityIds, sort, doSearch]);

  const onRefresh = () => {
    setRefreshing(true);
    doSearch(1, true);
  };

  const onEndReached = () => {
    if (loading || !hasMore) return;
    doSearch(page + 1, false);
  };

  const handleSelectCity = async (next: City) => {
    setCity(next);
    setCitySource('user');
    setShowNoCityBanner(false);
    await secureSet(SAVED_CITY_KEY, String(next.id));
  };

  const openHall = (hallGuid: string) => navigation.navigate('HallDetails', { hallGuid });

  const listHeader = (
    <>
      {error ? <ErrorBanner message={error} /> : null}
      {showNoCityBanner ? (
        <View style={styles.banner}>
          <Icon name="information-outline" size={18} color={c.primary} />
          <Text style={styles.bannerText}>
            {t('search.no_city_nearby')}
          </Text>
          <Pressable
            onPress={() => setShowNoCityBanner(false)}
            hitSlop={8}
            style={styles.bannerClose}
          >
            <Icon name="close" size={18} color={c.muted} />
          </Pressable>
        </View>
      ) : null}
      {citySource === 'geo' && city ? (
        <View style={styles.banner}>
          <Icon name="crosshairs-gps" size={18} color={c.primary} />
          <Text style={styles.bannerText}>
            {t('search.city_detected', { city: city.name_ru })}
          </Text>
          <Pressable
            onPress={() => setCitySource('user')}
            hitSlop={8}
            style={styles.bannerClose}
          >
            <Icon name="close" size={18} color={c.muted} />
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.count}>{t('search.results_count', { count: total })}</Text>
    </>
  );

  return (
    <Screen padded={false}>
      <FiltersBar
        value={filtersValue}
        onCityPress={() => setCityOpen(true)}
        onDatePress={() => setDateOpen(true)}
        onGuestsPress={() => setGuestsOpen(true)}
        onExtraFilters={() => setFiltersOpen(true)}
      />

      {loading && items.length === 0 ? (
        <Loader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.hall.guid}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !loading && !error ? (
              <EmptyState title={t('search.no_results')} subtitle={t('search.no_results_hint')} />
            ) : null
          }
          renderItem={({ item }) => (
            <HallCard
              item={item}
              isFavorite={isFav(item.hall.guid)}
              onToggleFavorite={() =>
                requireAuth('favorite', () => toggleFav(item.hall.guid, !isFav(item.hall.guid)))
              }
              onPress={() => openHall(item.hall.guid)}
            />
          )}
        />
      )}

      <CityPicker
        visible={cityOpen}
        cities={cities}
        onSelect={handleSelectCity}
        onClose={() => setCityOpen(false)}
      />
      <DatePickerSheet
        visible={dateOpen}
        value={date}
        onChange={setDate}
        onClose={() => setDateOpen(false)}
      />
      <GuestsPicker
        visible={guestsOpen}
        value={guests}
        onChange={setGuests}
        onClose={() => setGuestsOpen(false)}
      />
      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        amenities={amenities}
        value={{ priceMax, amenityIds, sort }}
        onApply={(v) => {
          setPriceMax(v.priceMax);
          setAmenityIds(v.amenityIds);
          setSort(v.sort);
        }}
      />
    </Screen>
  );
}
