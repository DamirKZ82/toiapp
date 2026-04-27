import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import MyBookingsScreen from '@/screens/client/C04_MyBookingsScreen';
import ReviewFormScreen from '@/screens/client/C06_ReviewFormScreen';
import HallDetailsScreen from '@/screens/client/C02_HallDetailsScreen';
import type { BookingsStackParamList } from './types';
import { useThemeColors } from '@/theme/useThemeColors';

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export function BookingsStack() {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.onSurface,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="BookingsHome"
        component={MyBookingsScreen}
        options={{ title: t('bookings.title') }}
      />
      <Stack.Screen
        name="ReviewForm"
        component={ReviewFormScreen}
        options={{ title: t('review_form.title') }}
      />
      <Stack.Screen name="HallDetails" component={HallDetailsScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
