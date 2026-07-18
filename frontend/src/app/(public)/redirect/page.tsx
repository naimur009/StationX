'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePublicSettings } from '@/features/homepage/api';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const to = searchParams.get('to') || '/';
  const { data: settingsData } = usePublicSettings();
  const brandName = settingsData?.data?.restaurantName || 'StationX';

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(to);
    }, 2200);

    return () => clearTimeout(timer);
  }, [router, to]);

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-blue-600 to-blue-800">
      <div className="flex flex-col items-center px-6 text-center">
        <h1 className="animate-[redirect-zoom-in_0.8s_ease-out_forwards] text-5xl font-bold tracking-tight text-white md:text-7xl">
          {brandName}
        </h1>
        <div className="mx-auto mt-4 h-1 animate-[redirect-line_1s_ease-out_0.5s_forwards] rounded-full bg-white/60" />
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-600 to-blue-800">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
