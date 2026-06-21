import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } =
    useAuthStore();

  return {
    user,
    accessToken,
    isAuthenticated,
    setAuth,
    clearAuth,
  };
}
