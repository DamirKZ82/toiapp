import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Loader } from '@/components/Loader';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PhotoGallery } from '@/components/PhotoGallery';
import { StarRating } from '@/components/StarRating';

import { hallsApi, reviewsApi, chatsApi, ApiError } from '@/api';
import type { PublicHallDetails } from '@/api';
import type { ReviewsResponse } from '@/api/types';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useRequireAuth } from '@/store/useRequireAuth';
import { useAuthStore } from '@/store/authStore';
import { CommonActions } from '@react-navigation/native';
import { radii, spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import { useThemeColors } from '@/theme/useThemeColors';
import { formatDateHuman, formatPrice } from '@/utils/format';
import { dictName } from '@/utils/i18nDict';
import type { SearchStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SearchStackParamList, 'HallDetails'>;

export default function HallDetailsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { hallGuid } = route.params;
  const lang = useAuthStore((s) => s.user?.language ?? 'ru');
  const c = useThemeColors();

  const styles = useStyles((cc) => ({
    photoRow: { position: 'relative' as const },
    favBtn: {
      position: 'absolute' as const,
      top: spacing.md,
      right: spacing.md,
      padding: 8,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: radii.pill,
    },
    body: { padding: spacing.md },
    title: { fontSize: 22, fontWeight: '700' as const, color: cc.onSurface },
    venue: { fontSize: 14, color: cc.muted, marginTop: 4 },
    metaRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginTop: spacing.md },
    chip: { marginRight: spacing.sm, marginBottom: spacing.sm },
    priceBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: cc.surfaceVariant,
      borderRadius: radii.md,
    },
    priceRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 4 },
    priceLabel: { fontSize: 14, color: cc.onSurface },
    priceValue: { fontSize: 16, fontWeight: '700' as const, color: cc.primary },
    sectionTitle: {
      fontSize: 13, fontWeight: '700' as const, color: cc.muted,
      textTransform: 'uppercase' as const,
      marginTop: spacing.lg, marginBottom: spacing.sm,
    },
    paragraph: { fontSize: 14, color: cc.onSurface, lineHeight: 20 },
    amenityWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
    amenityChip: { marginRight: spacing.sm, marginBottom: spacing.sm },
    mapBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' as const },
    muted: { fontSize: 14, color: cc.muted },
    reviewItem: { marginBottom: spacing.sm },
    reviewHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    reviewName: { fontWeight: '600' as const, color: cc.onSurface },
    reviewText: { fontSize: 14, color: cc.onSurface, marginTop: 4 },
    reviewDate: { fontSize: 12, color: cc.muted, marginTop: 4 },
    reply: {
      marginTop: spacing.sm, padding: spacing.sm,
      backgroundColor: cc.surfaceVariant, borderRadius: radii.sm,
    },
    replyLabel: { fontSize: 12, fontWeight: '600' as const, color: cc.muted, marginBottom: 2 },
    replyText: { fontSize: 13, color: cc.onSurface },
    footer: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: cc.outline,
      backgroundColor: cc.background,
    },
    bookBtn: { flex: 2, paddingVertical: spacing.xs },
    chatBtn: { flex: 1, paddingVertical: spacing.xs },
  }));

  const [hall, setHall] = useState<PublicHallDetails | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFav = useFavoritesStore((s) => s.guids.has(hallGuid));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const requireAuth = useRequireAuth();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [hResp, rResp] = await Promise.all([
          hallsApi.getPublic(hallGuid),
          reviewsApi.list(hallGuid),
        ]);
        setHall(hResp.hall);
        setReviews(rResp);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('common.error_generic'));
      } finally {
        setLoading(false);
      }
    })();
  }, [hallGuid, t]);

  const openIn2Gis = () => {
    if (!hall?.venue) return;
    const { latitude, longitude, address } = hall.venue;
    const url = latitude && longitude
      ? `dgis://2gis.ru/routeSearch/rsType/car/to/${longitude},${latitude}`
      : `https://2gis.kz/search/${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {});
  };

  if (loading) return <Screen><Loader /></Screen>;
  if (error || !hall) {
    return (
      <Screen>
        <ErrorBanner message={error ?? t('common.error_generic')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll>
      <View style={styles.photoRow}>
        <PhotoGallery photos={hall.photos} />
        <Pressable
          style={styles.favBtn}
          onPress={() => requireAuth('favorite', () => toggleFav(hall.guid, !isFav))}
          hitSlop={8}
        >
          <Icon
            name={isFav ? 'heart' : 'heart-outline'}
            size={26}
            color={isFav ? c.primary : '#FFFFFF'}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{hall.name}</Text>
        <Text style={styles.venue}>{hall.venue.name} · {dictName(hall.city, lang)}</Text>

        <View style={styles.metaRow}>
          {hall.capacity_min != null || hall.capacity_max != null ? (
            <Chip icon="account-group-outline" style={styles.chip}>
              {t('hall.capacity', {
                min: hall.capacity_min ?? '?',
                max: hall.capacity_max ?? '?',
              })}
            </Chip>
          ) : null}
          {hall.area_sqm != null ? (
            <Chip icon="ruler-square" style={styles.chip}>
              {t('hall.area_sqm', { n: hall.area_sqm })}
            </Chip>
          ) : null}
          {reviews && reviews.reviews_count > 0 ? (
            <Chip icon="star" style={styles.chip}>
              {reviews.avg_rating.toFixed(1)} · {reviews.reviews_count}
            </Chip>
          ) : null}
        </View>

        <View style={styles.priceBox}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('hall.price_weekday')}</Text>
            <Text style={styles.priceValue}>{formatPrice(hall.price_weekday)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('hall.price_weekend')}</Text>
            <Text style={styles.priceValue}>{formatPrice(hall.price_weekend)}</Text>
          </View>
        </View>

        {hall.description ? (
          <>
            <Text style={styles.sectionTitle}>{t('hall.description')}</Text>
            <Text style={styles.paragraph}>{hall.description}</Text>
          </>
        ) : null}

        {hall.amenities.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{t('hall.amenities')}</Text>
            <View style={styles.amenityWrap}>
              {hall.amenities.map((a) => (
                <Chip key={a.id} style={styles.amenityChip}>
                  {dictName(a, lang)}
                </Chip>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>{t('hall.location')}</Text>
        <Text style={styles.paragraph}>{hall.venue.address}</Text>
        <Button mode="outlined" icon="map" style={styles.mapBtn} onPress={openIn2Gis}>
          {t('hall.open_in_2gis')}
        </Button>

        <Text style={styles.sectionTitle}>{t('hall.reviews')}</Text>
        {reviews && reviews.items.length > 0 ? (
          reviews.items.map((r) => (
            <View key={r.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{r.client_name}</Text>
                <StarRating value={r.rating} readOnly size={14} />
              </View>
              {r.text ? <Text style={styles.reviewText}>{r.text}</Text> : null}
              {r.owner_reply ? (
                <View style={styles.reply}>
                  <Text style={styles.replyLabel}>Ответ владельца:</Text>
                  <Text style={styles.replyText}>{r.owner_reply}</Text>
                </View>
              ) : null}
              <Text style={styles.reviewDate}>
                {formatDateHuman(r.created_at.slice(0, 10), lang)}
              </Text>
              <Divider style={{ marginTop: spacing.md }} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>{t('hall.no_reviews')}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          icon="chat-outline"
          style={styles.chatBtn}
          onPress={() => requireAuth('message', async () => {
            try {
              const res = await chatsApi.openWithHall(hall.guid);
              // Переключаемся на таб "Сообщения" и открываем конкретный чат
              navigation.getParent()?.dispatch(
                CommonActions.navigate({
                  name: 'Messages',
                  params: { screen: 'Chat', params: { chatGuid: res.chat_guid } },
                }),
              );
            } catch { /* ошибку покажем если надо */ }
          })}
        >
          {t('hall.chat_button')}
        </Button>
        <Button
          mode="contained"
          style={styles.bookBtn}
          onPress={() => requireAuth('book', () => navigation.navigate('BookingForm', { hallGuid: hall.guid }))}
        >
          {t('hall.book_button')}
        </Button>
      </View>
    </Screen>
  );
}
