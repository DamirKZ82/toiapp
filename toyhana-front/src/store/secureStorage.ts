import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Обёртка над expo-secure-store.
 * На web SecureStore недоступен — откатываемся на localStorage
 * (хотя web мы не таргетим, это просто чтобы не падало при expo start --web).
 */

export async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
