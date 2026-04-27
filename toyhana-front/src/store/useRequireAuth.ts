import { useCallback } from 'react';
import { useAuthStore } from './authStore';
import { useAuthGateStore, AuthGateReason } from './authGateStore';

/**
 * Хук для защиты действий, требующих логина.
 *
 * Использование:
 *   const requireAuth = useRequireAuth();
 *   const onBook = () => requireAuth('book', () => doActualBooking());
 *
 * Если пользователь залогинен — сразу вызывает колбэк.
 * Если нет — открывает AuthGateSheet. После успешного логина колбэк вызовется.
 */
export function useRequireAuth() {
  const isAuthed = useAuthStore((s) => !!s.token && !!s.user?.full_name);
  const open = useAuthGateStore((s) => s.open);

  return useCallback(
    (reason: AuthGateReason, action: () => void) => {
      if (isAuthed) {
        action();
      } else {
        open(reason, action);
      }
    },
    [isAuthed, open],
  );
}
