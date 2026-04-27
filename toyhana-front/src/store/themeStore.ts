import { create } from 'zustand';
import { secureGet, secureSet } from './secureStorage';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'toyhana.themeMode';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,

  hydrate: async () => {
    const saved = await secureGet(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      set({ mode: saved, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },

  setMode: async (mode) => {
    await secureSet(THEME_KEY, mode);
    set({ mode });
  },
}));
