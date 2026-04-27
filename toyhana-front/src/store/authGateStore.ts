import { create } from 'zustand';

export type AuthGateReason =
  | 'book'
  | 'favorite'
  | 'review'
  | 'message'
  | 'create_venue'
  | 'my_bookings'
  | 'generic';

interface AuthGateState {
  visible: boolean;
  reason: AuthGateReason;
  /** Колбэк, который будет вызван после успешного входа */
  onSuccess: (() => void) | null;
  open: (reason: AuthGateReason, onSuccess?: () => void) => void;
  close: () => void;
  /** Вызывается изнутри auth-flow после успешного входа */
  fireSuccess: () => void;
}

/**
 * Центральное состояние "экрана входа", который открывается модально
 * из любой точки приложения. Вместо навигации — управляем через store.
 */
export const useAuthGateStore = create<AuthGateState>((set, get) => ({
  visible: false,
  reason: 'generic',
  onSuccess: null,

  open: (reason, onSuccess) =>
    set({ visible: true, reason, onSuccess: onSuccess ?? null }),

  close: () => set({ visible: false, onSuccess: null }),

  fireSuccess: () => {
    const cb = get().onSuccess;
    set({ visible: false, onSuccess: null });
    if (cb) {
      // Разрешим react закрыть модалку, потом выполнить действие
      setTimeout(cb, 100);
    }
  },
}));
