import React from 'react';

import { useAuthStore } from '@/store/authStore';
import { AppNavigator } from './AppNavigator';
import { Loader } from '@/components/Loader';

/**
 * Этап 11: гость может пользоваться приложением без логина.
 * Auth-flow открывается модалкой (AuthGateSheet) поверх App-а только когда
 * юзер пытается выполнить защищённое действие.
 *
 * Раньше здесь было переключение AuthNavigator <-> AppNavigator, теперь всегда App.
 */
export function RootNavigator() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return <Loader />;
  return <AppNavigator />;
}
