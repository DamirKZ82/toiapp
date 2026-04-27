import { create } from 'zustand';
import { favoritesApi } from '@/api';

interface FavoritesState {
  guids: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (hallGuid: string, isNowFav: boolean) => Promise<void>;
  isFav: (hallGuid: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  guids: new Set<string>(),
  loaded: false,

  load: async () => {
    try {
      const { items } = await favoritesApi.list();
      set({ guids: new Set(items.map((i) => i.hall.guid)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  toggle: async (hallGuid, isNowFav) => {
    // Оптимистичное обновление
    const next = new Set(get().guids);
    if (isNowFav) next.add(hallGuid); else next.delete(hallGuid);
    set({ guids: next });
    try {
      if (isNowFav) await favoritesApi.add(hallGuid);
      else await favoritesApi.remove(hallGuid);
    } catch {
      // Откатываем
      const rollback = new Set(get().guids);
      if (isNowFav) rollback.delete(hallGuid); else rollback.add(hallGuid);
      set({ guids: rollback });
    }
  },

  isFav: (hallGuid) => get().guids.has(hallGuid),

  clear: () => set({ guids: new Set(), loaded: false }),
}));
