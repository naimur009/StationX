'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useMe } from '@/features/auth/api';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { data: meData, isLoading } = useMe();

  const sessionUser = meData?.data;
  const hasToken = isAuthenticated || accessToken != null;
  const hasSession = hasToken || sessionUser != null;

  useEffect(() => {
    if (sessionUser) {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        setAuth(sessionUser, token);
      }
    }
  }, [sessionUser, setAuth]);

  useEffect(() => {
    if (hasSession) {
      router.replace('/overview');
    }
  }, [hasSession, pathname, router]);

  if (hasSession) {
    return null;
  }

  if (isLoading && !hasSession) {
    return null;
  }

  return <>{children}</>;
}
