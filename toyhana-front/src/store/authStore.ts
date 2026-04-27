import { create } from 'zustand';
import { secureDelete, secureGet, secureSet } from './secureStorage';
import { setAppLanguage } from '@/i18n';

const TOKEN_KEY = 'toyhana.jwt';
const USER_KEY = 'toyhana.user';

export interface User {
  id: number;
  guid: string;
  phone: string;
  full_name: string | null;
  language: 'ru' | 'kz';
}

export interface AuthState {
  /** null = идёт начальная загрузка из SecureStore; true/false — уже известно */
  isHydrated: boolean;
  token: string | null;
  user: User | null;

  hydrate: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isHydrated: false,
  token: null,
  user: null,

  hydrate: async () => {
    const [token, userJson] = await Promise.all([
      secureGet(TOKEN_KEY),
      secureGet(USER_KEY),
    ]);
    const user = userJson ? (JSON.parse(userJson) as User) : null;

    if (user?.language) {
      setAppLanguage(user.language);
    }
    set({ isHydrated: true, token: token ?? null, user });
  },

  setAuth: async (token, user) => {
    await secureSet(TOKEN_KEY, token);
    await secureSet(USER_KEY, JSON.stringify(user));
    if (user.language) setAppLanguage(user.language);
    set({ token, user });
  },

  setUser: async (user) => {
    await secureSet(USER_KEY, JSON.stringify(user));
    if (user.language) setAppLanguage(user.language);
    set({ user });
  },

  logout: async () => {
    await Promise.all([secureDelete(TOKEN_KEY), secureDelete(USER_KEY)]);
    set({ token: null, user: null });
  },
}));
