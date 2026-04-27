import React, { useCallback, useState, useMemo } from 'react';
import { Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '@/components/Screen';
import { ErrorBanner } from '@/components/ErrorBanner';

import { hallsApi, bookingsApi, ApiError } from '@/api';
import type { CalendarDay } from '@/api/types';
import { radii, spacing } from '@/theme';
import { useThemeColors, useIsDark } from '@/theme/useThemeColors';
import { useStyles } from '@/theme/useStyles';
import { monthOf, todayIso } from '@/utils/format';
import type { ProfileStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HallCalendar'>;

export default function HallCalendarScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { hallGuid, hallName } = route.params;
  const colors = useThemeColors();
  const isDark = useIsDark();

  const [month, setMonth] = useState(monthOf(todayIso()));
  const [items, setItems] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useStyles((c) => ({
    legend: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.sm,
    },
    legendItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginRight: spacing.md,
      marginBottom: spacing.sm,
    },
    dot: {
      width: 14, height: 14, borderRadius: radii.sm,
      marginRight: 6,
    },
    legendLabel: { fontSize: 13, color: c.onSurface },
  }));

  const load = useCallback(async () => {
    setError(null);
    try {
      const resp = await hallsApi.calendar(hallGuid, month);
      setItems(resp.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [hallGuid, month, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: t('owner.calendar_title', { hall: hallName }) });
  }, [navigation, t, hallName]);

  // marked dates для react-native-calendars — в палитре темы
  const marked = useMemo(() => {
    const m: Record<string, {
      customStyles?: {
        container?: { backgroundColor?: string };
        text?: { color?: string; fontWeight?: '600' | '700' };
      };
    }> = {};
    for (const d of items) {
      if (d.status === 'confirmed') {
        m[d.date] = { customStyles: { container: { backgroundColor: colors.errorBg }, text: { color: colors.errorFg } } };
      } else if (d.status === 'pending') {
        m[d.date] = { customStyles: { container: { backgroundColor: colors.warningBg }, text: { color: colors.warningFg } } };
      }
    }
    return m;
  }, [items, colors]);

  const onDayPress = async (d: DateData) => {
    const day = items.find((x) => x.date === d.dateString);
    if (!day || day.status === 'free' || day.status === 'past') return;
    try {
      const resp = await bookingsApi.incoming();
      const match = resp.items.find(
        (b) => b.event_date === d.dateString && b.hall?.guid === hallGuid && (b.status === 'pending' || b.status === 'confirmed'),
      );
      if (match) {
        navigation.navigate('BookingDetails', { bookingGuid: match.guid });
      }
    } catch { /* игнор */ }
  };

  return (
    <Screen>
      <ErrorBanner message={error} />
      <Calendar
        current={`${month}-01`}
        minDate={todayIso()}
        markingType="custom"
        markedDates={marked}
        onMonthChange={(m: DateData) => setMonth(`${m.year}-${String(m.month).padStart(2, '0')}`)}
        onDayPress={onDayPress}
        theme={{
          // Адаптация календаря под тему приложения
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          dayTextColor: colors.onSurface,
          monthTextColor: colors.onSurface,
          textSectionTitleColor: colors.muted,
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.onPrimary,
          textDisabledColor: colors.muted,
          dotColor: colors.primary,
          indicatorColor: colors.primary,
        }}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline }]} />
          <Text style={styles.legendLabel}>{t('owner.legend_free')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.warningBg }]} />
          <Text style={styles.legendLabel}>{t('owner.legend_pending')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.errorBg }]} />
          <Text style={styles.legendLabel}>{t('owner.legend_confirmed')}</Text>
        </View>
      </View>
    </Screen>
  );
}
