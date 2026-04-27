import { apiClient } from './client';
import type { AuthVerifyResponse, User } from './types';

export const authApi = {
  async requestOtp(phone: string): Promise<{ sent: boolean }> {
    const { data } = await apiClient.post('/auth/request-otp', { phone });
    return data;
  },

  async verifyOtp(phone: string, code: string): Promise<AuthVerifyResponse> {
    const { data } = await apiClient.post('/auth/verify-otp', { phone, code });
    return data;
  },

  async completeProfile(full_name: string, language: 'ru' | 'kz'): Promise<{ user: User }> {
    const { data } = await apiClient.post('/auth/complete-profile', { full_name, language });
    return data;
  },

  async setFcmToken(token: string): Promise<{ ok: true }> {
    const { data } = await apiClient.post('/auth/fcm-token', { token });
    return data;
  },
};
