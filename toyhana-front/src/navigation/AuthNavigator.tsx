import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PhoneScreen from '@/screens/auth/A01_PhoneScreen';
import OtpScreen from '@/screens/auth/A02_OtpScreen';
import CompleteProfileScreen from '@/screens/auth/A03_CompleteProfileScreen';
import { useAuthStore } from '@/store/authStore';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  // Если у юзера уже есть токен (новый юзер), но профиль не заполнен —
  // сразу открываем экран CompleteProfile, минуя Phone/Otp.
  const token = useAuthStore((s) => s.token);
  const initialRoute: keyof AuthStackParamList = token ? 'CompleteProfile' : 'Phone';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}
