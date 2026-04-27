import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { AuthGateSheet } from '@/components/AuthGateSheet';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useThemeStore } from '@/store/themeStore';
import { useAppPaperTheme, useIsDark, useThemeColors } from '@/theme/useThemeColors';
// import { registerForPush } from '@/utils/push';
import '@/i18n';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const token = useAuthStore((s) => s.token);
  const favsLoaded = useFavoritesStore((s) => s.loaded);
  const loadFavs = useFavoritesStore((s) => s.load);
  const clearFavs = useFavoritesStore((s) => s.clear);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  // Избранное грузим только для залогиненного юзера.
  // Если токена нет — ничего не делаем (guids и так пустые).
  // При logout — guids чистятся внутри logout() через обнуление токена + наш эффект ниже.
  useEffect(() => {
    if (token && !favsLoaded) {
      loadFavs();
    }
  }, [token, favsLoaded, loadFavs]);

  // При logout (token стал null после того как был не-null) — чистим избранное.
  // Используем ref, чтобы не срабатывать при самом первом рендере с token=null.
  const prevTokenRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (prevTokenRef.current && !token) {
      clearFavs();
    }
    prevTokenRef.current = token;
  }, [token, clearFavs]);

  const paperTheme = useAppPaperTheme();
  const palette = useThemeColors();
  const isDark = useIsDark();

  const navTheme = {
    ...(isDark ? NavDarkTheme : NavDefaultTheme),
    colors: {
      ...(isDark ? NavDarkTheme.colors : NavDefaultTheme.colors),
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.onSurface,
      border: palette.outline,
      notification: palette.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
          <AuthGateSheet />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
