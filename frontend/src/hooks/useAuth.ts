import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/permissions';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } =
    useAuthStore();

  const isAdmin = user?.role === 'admin';

  function can(module: string, action: string): boolean {
    return hasPermission(user, module, action);
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    can,
    setAuth,
    clearAuth,
  };
}
