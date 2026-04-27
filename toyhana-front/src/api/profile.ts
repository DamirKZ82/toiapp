import { apiClient } from './client';
import type { User } from './types';

export const profileApi = {
  async get(): Promise<{ user: User }> {
    const { data } = await apiClient.get('/profile');
    return data;
  },

  async patch(patch: Partial<Pick<User, 'full_name' | 'language'>>): Promise<{ user: User }> {
    const { data } = await apiClient.patch('/profile', patch);
    return data;
  },
};
