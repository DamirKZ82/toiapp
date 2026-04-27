import React from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';

import { BottomModal } from './BottomModal';
import { spacing } from '@/theme';
import { useThemeColors } from '@/theme/useThemeColors';
import { useStyles } from '@/theme/useStyles';
import { todayIso } from '@/utils/format';
import type { CalendarDay } from '@/api/types';

interface MarkedConfig {
  selected?: boolean;
  selectedColor?: string;
  disabled?: boolean;
  disableTouchEvent?: boolean;
  customStyles?: {
    container?: { backgroundColor?: string };
    text?: { color?: string; fontWeight?: '600' | '700' };
  };
  marked?: boolean;
  dotColor?: string;
}

interface Props {
  visible: boolean;
  value: string | null;
  onChange: (date: string | null) => void;
  onClose: () => void;
  calendar?: CalendarDay[];
  blockPending?: boolean;
  title?: string;
}

export function DatePickerSheet({
  visible, value, onChange, onClose, calendar, blockPending, title = 'Выберите дату',
}: Props) {
  const c = useThemeColors();
  const styles = useStyles((cc) => ({
    title: { fontSize: 18, fontWeight: '700' as const, color: cc.onSurface, marginBottom: spacing.sm },
    legend: { flexDirection: 'row' as const, marginTop: spacing.sm, marginBottom: spacing.sm },
    legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, marginRight: spacing.md },
    legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 4 },
    legendText: { fontSize: 12, color: cc.muted },
    actions: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginTop: spacing.sm,
    },
  }));
  const today = todayIso();

  const marked: Record<string, MarkedConfig> = {};

  if (calendar) {
    for (const day of calendar) {
      const isPast = day.status === 'past';
      const isConfirmed = day.status === 'confirmed';
      const isPending = day.status === 'pending';

      let bg: string | undefined;
      let textColor: string | undefined;
      let disabled = false;

      if (isPast) {
        disabled = true;
        textColor = c.muted;
      } else if (isConfirmed) {
        disabled = true;
        bg = c.errorBg;
        textColor = c.errorFg;
      } else if (isPending) {
        if (!blockPending) {
          bg = c.warningBg;
          textColor = c.warningFg;
        }
      }

      marked[day.date] = {
        disabled,
        disableTouchEvent: disabled,
        customStyles: {
          container: bg ? { backgroundColor: bg } : undefined,
          text: textColor ? { color: textColor } : undefined,
        },
      };
    }
  }

  if (value) {
    marked[value] = {
      ...marked[value],
      selected: true,
      selectedColor: c.primary,
      customStyles: {
        container: { backgroundColor: c.primary },
        text: { color: c.onPrimary, fontWeight: '600' },
      },
    };
  }

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>

      <Calendar
        minDate={today}
        onDayPress={(d: DateData) => onChange(d.dateString)}
        markingType="custom"
        markedDates={marked}
        theme={{
          todayTextColor: c.primary,
          arrowColor: c.primary,
          selectedDayBackgroundColor: c.primary,
          selectedDayTextColor: c.onPrimary,
          monthTextColor: c.onSurface,
          dayTextColor: c.onSurface,
          textDisabledColor: c.muted,
          calendarBackground: c.surface,
          textSectionTitleColor: c.muted,
        }}
      />

      {calendar ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.errorBg }]} />
            <Text style={styles.legendText}>Занято</Text>
          </View>
          {!blockPending && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.warningBg }]} />
              <Text style={styles.legendText}>Ждёт ответа</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        {value ? (
          <Button mode="text" onPress={() => onChange(null)}>Сбросить</Button>
        ) : <View />}
        <Button mode="contained" onPress={onClose} disabled={!value}>Готово</Button>
      </View>
    </BottomModal>
  );
}
