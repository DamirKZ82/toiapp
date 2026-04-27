import React, { useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '@/components/Screen';
import { Loader } from '@/components/Loader';
import { ErrorBanner } from '@/components/ErrorBanner';

import { hallsApi, bookingsApi, ApiError } from '@/api';
import type { CalendarDay } from '@/api/types';
import { colors, radii, spacing } from '@/theme';
import { monthOf, todayIso } from '@/utils/format';
import type { ProfileStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HallCalendar'>;

export default function HallCalendarScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { hallGuid, hallName } = route.params;

  const [month, setMonth] = useState(monthOf(todayIso()));
  const [items, setItems] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // marked dates для react-native-calendars
  const marked = useMemo(() => {
    const m: Record<string, {
      customStyles?: {
        container?: { backgroundColor?: string };
        text?: { color?: string; fontWeight?: '600' | '700' };
      };
    }> = {};
    for (const d of items) {
      if (d.status === 'confirmed') {
        m[d.date] = { customStyles: { container: { backgroundColor: '#FFD6D6' }, text: { color: colors.error } } };
      } else if (d.status === 'pending') {
        m[d.date] = { customStyles: { container: { backgroundColor: '#FFF3CC' }, text: { color: '#AD7A00' } } };
      }
    }
    return m;
  }, [items]);

  // Переход на заявку при тапе — нужна выборка заявок по дате.
  // Для простоты: тап по дате с pending/confirmed → открываем incoming c фильтром;
  // чтобы не усложнять, просто переходим на общий экран входящих.
  const onDayPress = async (d: DateData) => {
    const day = items.find((x) => x.date === d.dateString);
    if (!day || day.status === 'free' || day.status === 'past') return;
    try {
      // Ищем заявку по hall + дате через общий список
      const resp = await bookingsApi.incoming();
      const match = resp.items.find(
        (b) => b.event_date === d.dateString && b.hall?.guid === hallGuid && (b.status === 'pending' || b.status === 'confirmed'),
      );
      if (match) {
        navigation.navigate('BookingDetails', { bookingGuid: match.guid });
      }
    } catch {
      // молча
    }
  };

  if (loading) return <Screen><Loader /></Screen>;

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
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
        }}
      />

      <View style={styles.legend}>
        <LegendItem color="#FFFFFF" border label={t('owner.legend_free')} />
        <LegendItem color="#FFF3CC" label={t('owner.legend_pending')} />
        <LegendItem color="#FFD6D6" label={t('owner.legend_confirmed')} />
      </View>
    </Screen>
  );
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: colors.outline }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginTop: spacing.lg, paddingHorizontal: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginBottom: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: radii.sm, marginRight: 6 },
  legendLabel: { fontSize: 13, color: colors.onSurface },
});
