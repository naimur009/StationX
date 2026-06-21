import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/permissions';

export function usePermission(module: string, action: string): boolean {
  const user = useAuthStore((state) => state.user);

  return hasPermission(user, module, action);
}
