import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Базовый URL API.
 *
 * Приоритет:
 * 1) extra.apiBaseUrl из app.json (если задан)
 * 2) умолчание: Android эмулятор -> 10.0.2.2, iOS симулятор / web -> localhost
 *
 * Для реального устройства по Wi-Fi — подставь IP компьютера в app.json,
 * например "http://192.168.0.42:4000".
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

const defaultBaseUrl = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

export const API_BASE_URL = extra.apiBaseUrl || defaultBaseUrl!;
