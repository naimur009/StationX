'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useMe } from '@/features/auth/api';
import { useLogout } from '@/features/auth/api';
import Sidebar from '@/components/shared/Sidebar';
import TopBar from '@/components/shared/TopBar';
import MobileNav from '@/components/shared/MobileNav';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, setAuth, clearAuth, user } = useAuthStore();
  const { data: meData, isLoading, isError } = useMe();
  const logoutMutation = useLogout();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const mobileDrawerOpen = useUIStore((state) => state.mobileDrawerOpen);
  const closeMobileDrawer = useUIStore((state) => state.closeMobileDrawer);

  useEffect(() => {
    if (!isLoading && (isError || (meData && meData.data === null))) {
      clearAuth();
      router.replace('/login');
      return;
    }

    if (!isLoading && !meData && !isError) {
      clearAuth();
      router.replace('/login');
      return;
    }

    if (meData && meData.data && !isAuthenticated) {
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
  }, [isAuthenticated, isError, meData, isLoading, setAuth, clearAuth, router]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      clearAuth();
    }
  }, [isAuthenticated, user, clearAuth]);

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // proceed with local logout regardless
    }
    clearAuth();
    queryClient.removeQueries({ queryKey: ['auth', 'me'] });
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
      <TopBar onLogout={handleLogout} />

      <div className="hidden md:block">
        <Sidebar onLogout={handleLogout} />
      </div>

      <MobileNav
        open={mobileDrawerOpen}
        onClose={closeMobileDrawer}
        onLogout={handleLogout}
      />

      <main
        className={cn(
          'flex-1 pt-16 transition-all duration-300',
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        )}
      >
        <div className="p-3 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-screen-2xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
