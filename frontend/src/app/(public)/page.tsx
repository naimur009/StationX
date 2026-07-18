'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePublicSettings } from '@/features/homepage/api';
import { useAuthStore } from '@/stores/auth-store';

interface HealthStatus {
  connected: boolean;
}

function HealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>({ connected: false });

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);
        if (res.ok) {
          setStatus({ connected: true });
        }
      } catch {
        setStatus({ connected: false });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
      <span
        className={`inline-block h-2 w-2 rounded-full ${status.connected ? 'bg-green-500' : 'bg-red-500'}`}
      />
      <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}

export default function HomePage() {
  const { data: settingsData, isError } = usePublicSettings();
  const settings = settingsData?.data;
  const logoSrc = !isError ? settings?.logo?.url : undefined;
  const brandName = settings?.restaurantName || 'StationX';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginHref = isAuthenticated ? '/redirect?to=/overview' : '/login';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <span className="flex h-16 items-center">
            {logoSrc && (
              <img
                src={logoSrc}
                alt={brandName}
                className="h-full w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </span>
          <Link
            href={loginHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-primary/25 transition-all hover:bg-primary/90 active:translate-y-px"
          >
            Staff Login
          </Link>
        </nav>
      </header>

      <main className="relative flex-1">
        <div className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-indigo-50" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-50/50" />

          <section className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-28 text-center md:pt-40">
            <div className="mb-8 h-1 w-20 rounded-full bg-primary/60" aria-hidden="true" />

            <h1 className="text-5xl font-bold tracking-tight text-slate-800 max-md:text-4xl">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-red-800 via-red-600 to-indigo-700 bg-clip-text text-transparent">
                {brandName}
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-500 md:text-lg">
              Where great food meets exceptional service. From our kitchen to your table,
              every moment is crafted with care.
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-medium text-white shadow-primary/25 transition-all hover:bg-primary/90 active:translate-y-px"
              >
                Explore Our Menu
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-8 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:translate-y-px"
              >
                Make a Reservation
              </Link>
            </div>
          </section>
        </div>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="grid gap-12 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 shadow-sm">
                  <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12m12 0a48.517 48.517 0 01-12 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Fresh Ingredients</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Sourced daily from local suppliers. Every dish starts with the finest produce.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 shadow-sm">
                  <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Exceptional Service</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Our team is dedicated to making every visit memorable. Warm smiles, prompt service.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 shadow-sm">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Amazing Flavors</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  A menu crafted with passion. Every recipe tells a story of tradition and innovation.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <p className="text-xs font-medium text-slate-400">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={loginHref}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              Staff Login
            </Link>
            <span className="text-slate-200">|</span>
            <HealthIndicator />
          </div>
        </div>
      </footer>
    </div>
  );
}
