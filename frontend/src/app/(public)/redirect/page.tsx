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

  let prefix = brandName;
  let suffix = '';
  if (brandName.toLowerCase().endsWith('x')) {
    prefix = brandName.slice(0, -1).toLowerCase();
    suffix = brandName.slice(-1).toUpperCase();
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(to);
    }, 2200);

    return () => clearTimeout(timer);
  }, [router, to]);

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f6f8]">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="animate-[redirect-zoom-in_0.8s_ease-out_forwards] flex items-center">
          {suffix ? (
            <div className="relative flex items-center">
              <div className="relative z-10 flex flex-col justify-center rounded-l-3xl rounded-r-lg border-[4px] border-[#F8C301] bg-[#111] pb-3 pl-8 pr-12 pt-1 shadow-2xl md:pb-5 md:pt-3 transform -skew-x-12">
                <span className="block text-5xl font-black lowercase tracking-widest text-[#F8C301] md:text-7xl">
                  {prefix}
                </span>
                <div className="absolute bottom-1.5 left-5 right-5 h-1.5 rounded-full bg-[#F8C301] md:bottom-2.5 md:h-2" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }} />
              </div>
              <div className="relative z-20 -ml-10 flex items-center justify-center md:-ml-14">
                {/* Outer Yellow Stroke */}
                <span
                  className="absolute text-[7rem] font-black italic drop-shadow-xl md:text-[10rem] text-[#D81B26]"
                  style={{
                    WebkitTextStroke: '16px #F8C301',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {suffix}
                </span>
                {/* Inner Black Stroke */}
                <span
                  className="absolute text-[7rem] font-black italic text-[#D81B26] md:text-[10rem]"
                  style={{ WebkitTextStroke: '10px #111' }}
                >
                  {suffix}
                </span>
                {/* Base Red Text */}
                <span className="relative z-10 text-[7rem] font-black italic text-[#D81B26] md:text-[10rem]">
                  {suffix}
                </span>
              </div>
            </div>
          ) : (
            <h1 className="text-5xl font-bold tracking-tight text-[#111] md:text-7xl">
              {brandName}
            </h1>
          )}
        </div>
        <div className="mx-auto mt-12 h-1.5 w-40 animate-[redirect-line_1s_ease-out_0.5s_forwards] rounded-full bg-[#D81B26]" />
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#F8C301]/20 border-t-[#D81B26]" />
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
