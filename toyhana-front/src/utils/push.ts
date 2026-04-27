import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { authApi } from '@/api';

/**
 * Настройка отображения уведомлений когда приложение на переднем плане.
 * По умолчанию Expo их скрывает, мы — показываем баннер.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Поля для старых версий Expo — дублируем, чтобы везде работало.
    shouldShowAlert: true,
  }),
});

/**
 * Регистрация для получения push.
 *
 * Вызывается после логина. Если пользователь уже давал разрешение,
 * просто возьмёт токен; если нет — спросит.
 *
 * Возвращает true, если токен получен и отправлен на бэк.
 */
export async function registerForPush(): Promise<boolean> {
  // На симуляторе/эмуляторе пуши не работают — просто выходим без ошибки.
  if (!Device.isDevice) {
    console.log('[push] skipped: not a real device');
    return false;
  }

  // Android-каналы (иначе на Android уведомления будут беззвучными).
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B1A5E',
    });
  }

  // Разрешение
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.log('[push] permission not granted');
    return false;
  }

  // Токен
  try {
    // В Expo Go это даст ExponentPushToken.
    // В EAS-сборке нужно будет передать projectId — добавим на этапе 11.
    const tokenResult = await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data;
    if (!token) {
      console.log('[push] empty token');
      return false;
    }
    await authApi.setFcmToken(token);
    console.log('[push] registered:', token);
    return true;
  } catch (err) {
    console.log('[push] error:', err);
    return false;
  }
}
