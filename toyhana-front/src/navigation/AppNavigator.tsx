import React, { useCallback, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { SearchStack } from './SearchStack';
import { FavoritesStack } from './FavoritesStack';
import { MessagesStack } from './MessagesStack';
import { ProfileStack } from './ProfileStack';
import { useThemeColors } from '@/theme/useThemeColors';
import { chatsApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

const UNREAD_POLL_MS = 15000;

export function AppNavigator() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const token = useAuthStore((s) => s.token);

  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!token) return;
    try {
      const r = await chatsApi.unreadCount();
      setUnread(r.unread_count);
    } catch { /* тихо */ }
  }, [token]);

  // Глобальный polling счётчика непрочитанных
  useEffect(() => {
    if (!token) { setUnread(0); return; }
    loadUnread();
    const id = setInterval(loadUnread, UNREAD_POLL_MS);
    return () => clearInterval(id);
  }, [token, loadUnread]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.outline },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
      }}
    >
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => <Icon name="magnify" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesStack}
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, size }) => <Icon name="heart-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          title: t('tabs.messages'),
          tabBarIcon: ({ color, size }) => <Icon name="chat-outline" color={color} size={size} />,
          // Точечный индикатор без числа — достаточно знать, что есть непрочитанное.
          // Детали (сколько / от кого) — в самом списке через галочки и жирный шрифт.
          tabBarBadge: unread > 0 ? '' : undefined,
          tabBarBadgeStyle: { backgroundColor: c.primary, minWidth: 8, maxHeight: 8 },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Icon name="account-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
