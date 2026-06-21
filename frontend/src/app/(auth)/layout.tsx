'use client';

import { useEffect, useState } from 'react';
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
  const { isAuthenticated, setAuth } = useAuthStore();
  const { data: meData, isLoading, isError } = useMe();
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
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
        token,
      );
    }
  }, [meData, isAuthenticated, setAuth]);

  useEffect(() => {
    if (!isLoading || isError) {
      setAuthResolved(true);
    }
  }, [isLoading, isError]);

  useEffect(() => {
    const isResetPassword = pathname === '/reset-password';
    if (isAuthenticated && authResolved && !isResetPassword) {
      router.replace('/overview');
    }
  }, [isAuthenticated, authResolved, pathname, router]);

  if (!authResolved || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
