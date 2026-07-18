'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useMe } from '@/features/auth/api';
import { useLogout } from '@/features/auth/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isAuthenticated, setAuth, clearAuth, user } = useAuthStore();
  const { data: meData, isLoading, isError } = useMe();
  const logoutMutation = useLogout();
  const [navigating, setNavigating] = useState(false);
  const navigatingRef = useRef(false);
  const initializedRef = useRef(false);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const mobileDrawerOpen = useUIStore((state) => state.mobileDrawerOpen);
  const closeMobileDrawer = useUIStore((state) => state.closeMobileDrawer);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const isUnauthed = isError || !meData || meData.data === null;
      if (isUnauthed && !redirectedRef.current) {
        redirectedRef.current = true;
        clearAuth();
        router.replace('/login');
        return;
      }
    }

    if (meData && meData.data && !isAuthenticated) {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) {
        const userData = meData.data;
        setAuth(
          {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            permissions: userData.permissions,
            isActive: userData.isActive,
          },
          accessToken
        );
      }
    }
  }, [isAuthenticated, isError, meData, isLoading, setAuth, clearAuth, router]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      clearAuth();
    }
  }, [isAuthenticated, user, clearAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = useAuthStore.getState().accessToken;
    if (token) connectSocket(token);
    return () => { disconnectSocket(); };
  }, [isAuthenticated]);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width >= 768 && width < 1024) {
        setSidebarCollapsed(true);
      } else if (width >= 1024) {
        setSidebarCollapsed(false);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  const navStartTime = useRef(0);

  const triggerNav = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    navStartTime.current = Date.now();
    setNavigating(true);
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const elapsed = Date.now() - navStartTime.current;
    const remaining = Math.max(0, 400 - elapsed);
    const timer = setTimeout(() => {
      navigatingRef.current = false;
      setNavigating(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [pathname, navigating]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest('a');
      if (!link || !link.href) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      triggerNav();
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [triggerNav]);

  useEffect(() => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      if (!initializedRef.current) return;
      setTimeout(triggerNav, 0);
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      if (!initializedRef.current) return;
      setTimeout(triggerNav, 0);
    };

    initializedRef.current = true;

    function handlePopState() {
      triggerNav();
    }
    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [triggerNav]);

  async function handleLogout() {
    redirectedRef.current = true;
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Proceed with local logout even if the API call fails
    }
    clearAuth();
    queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    router.replace('/redirect?to=/');
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 spinner-smooth" />
      </div>
    );
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

      {navigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-[#D81B26]/20 via-[#F8C301]/20 to-[#D81B26]/20">
          <div className="h-full bg-gradient-to-r from-[#D81B26] via-[#F8C301] to-[#D81B26] animate-[nav-bar_0.6s_ease-in-out_forwards]" />
        </div>
      )}

      <main
        className={cn(
          'flex-1 pt-16 transition-all duration-300',
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        )}
      >
        <div
          className={cn(
            'p-3 sm:p-6 lg:p-8 transition-opacity duration-200',
            navigating ? 'opacity-50' : 'opacity-100'
          )}
        >
          <div className="mx-auto max-w-screen-2xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
