'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useMe } from '@/features/auth/api';
import { useLogout } from '@/features/auth/api';

const NAV_ITEMS = [
  { href: '/overview', label: 'Dashboard', module: 'dashboard' },
  { href: '/pos', label: 'POS', module: 'pos' },
  { href: '/orders', label: 'Orders', module: 'orders' },
  { href: '/coupons', label: 'Coupons', module: 'coupons' },
  { href: '/tasks', label: 'Tasks', module: 'tasks' },
  { href: '/attendance', label: 'Attendance', module: 'attendance' },
  { href: '/expenses', label: 'Expenses', module: 'expenses' },
  { href: '/vendors', label: 'Vendors', module: 'vendors' },
  { href: '/products', label: 'Products', module: 'products' },
  { href: '/categories', label: 'Categories', module: 'categories' },
  { href: '/customers', label: 'Customers', module: 'customers' },
  { href: '/users', label: 'Users', module: 'users' },
  { href: '/settings', label: 'Settings', module: 'settings' },
  { href: '/reports', label: 'Reports', module: 'reports' },
  { href: '/activity-log', label: 'Activity Log', module: 'activity-log' },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, setAuth, clearAuth, user } = useAuthStore();
  const { data: meData, isLoading, isError } = useMe();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (!isAuthenticated && !meData && !isLoading) {
      router.replace('/login');
      return;
    }

    if (meData && !isAuthenticated) {
      const userData = meData.data;
      const token = useAuthStore.getState().accessToken || '';
      setAuth(
        {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions,
        },
        token
      );
    }
  }, [isAuthenticated, meData, isLoading, setAuth, clearAuth, router]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      clearAuth();
    }
  }, [isAuthenticated, user, clearAuth]);

  useEffect(() => {
    if (isError) {
      clearAuth();
      router.replace('/login');
    }
  }, [isError, clearAuth, router]);

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // proceed with local logout regardless
    }
    clearAuth();
    router.replace('/login');
  }

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sidebar-transition fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="flex min-h-[64px] items-center gap-3 border-b border-white/10 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <span className="text-sm font-bold text-white">W</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Whatta Cup</div>
            <div className="text-xs text-slate-400">Management</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.filter((item) => {
            if (!user) return false;
            if (user.role === 'admin') return true;
            return user.permissions.some(
              (p) => p.module === item.module && p.actions.includes('view')
            );
          }).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {user && (
            <div className="mb-2 px-3 py-2">
              <div className="text-sm font-semibold text-white">{user.name}</div>
              <div className="text-xs capitalize text-slate-400">{user.role}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 pl-64 pt-16">{children}</main>
    </div>
  );
}
