import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import ChatsListScreen from '@/screens/messages/M01_ChatsListScreen';
import ChatScreen from '@/screens/messages/M02_ChatScreen';
import type { MessagesStackParamList } from './types';
import { useThemeColors } from '@/theme/useThemeColors';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStack() {
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
        name="MessagesHome"
        component={ChatsListScreen}
        options={{ title: t('messages.title') }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: t('messages.chat_title') }}
      />
    </Stack.Navigator>
  );
}
