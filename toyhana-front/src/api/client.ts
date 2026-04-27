import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import type { ApiErrorBody } from './types';

/**
 * Централизованный axios-клиент.
 *
 * Что делает:
 *  1) Подставляет Authorization: Bearer <token>, если есть в authStore.
 *  2) На 401 — выкидывает пользователя (logout), дальше навигация сама
 *     переключится на AuthStack, так как useAuthStore.token станет null.
 *  3) На 5xx — отправляет POST /front-error для записи в errors_front.
 *  4) Выпрямляет ошибки: бросает ApiError с message в стиле бэка.
 */

export class ApiError extends Error {
  status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- request interceptor: подставляем токен ----
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ---- response interceptor: 401 -> logout, 5xx -> /front-error ----
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Network error';

    if (status === 401) {
      // Токен невалиден — чистим. Но только если он был.
      // Если токена не было вовсе (юзер — гость), 401 — нормальная реакция
      // бэка на защищённый эндпоинт, не надо ничего "логаутить" и дёргать state.
      const hadToken = !!useAuthStore.getState().token;
      if (hadToken) {
        await useAuthStore.getState().logout();
      }
    }

    if (status && status >= 500) {
      // Тихо отправляем на бэк (не через apiClient, чтобы не уйти в рекурсию).
      const path = (error.config?.url ?? '') as string;
      const method = (error.config?.method ?? '').toUpperCase();
      axios
        .post(`${API_BASE_URL}/front-error`, {
          message: `[${status}] ${method} ${path}: ${message}`,
          stack: null,
          screen: 'api',
        })
        .catch(() => { /* swallow */ });
    }

    throw new ApiError(message, status);
  }
);
