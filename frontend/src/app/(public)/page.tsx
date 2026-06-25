'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
        className={`inline-block h-2 w-2 rounded-full ${
          status.connected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}

const features = [
  {
    title: 'Order Management',
    description: 'Track orders from counter to kitchen in real time. Modify, split, or cancel with a tap.',
    iconBg: 'bg-blue-50 text-blue-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    title: 'POS System',
    description: 'Fast, tablet-first checkout designed for the speed of service. Works offline, syncs when connected.',
    iconBg: 'bg-indigo-50 text-indigo-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    title: 'Reports & Analytics',
    description: 'Understand your numbers — daily sales, popular items, and shift summaries at a glance.',
    iconBg: 'bg-green-50 text-green-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-slate-800">StationX</span>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white shadow-blue-500/25 transition-all hover:bg-blue-700 active:translate-y-px"
          >
            Admin Login
          </Link>
        </nav>
      </header>

      <main className="relative flex-1">
        <div className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-blue-50" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-slate-100" />

          <section className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-16 pt-24 text-center md:pt-32">
            <div className="mb-8 h-1 w-16 rounded-full bg-blue-600/60" aria-hidden="true" />
            <h1 className="bg-gradient-to-r from-blue-800 via-blue-600 to-indigo-700 bg-clip-text text-5xl font-bold tracking-tight text-transparent max-md:text-4xl">
              Your Restaurant, Streamlined.
            </h1>
            <p className="mt-6 max-w-xl text-base text-slate-500">
              Manage orders, track sales, and run your day-to-day operations from a single dashboard.
              Built for the counter, designed for speed.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-sm font-medium text-white shadow-blue-500/25 transition-all hover:bg-blue-700 active:translate-y-px"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-8 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:translate-y-px"
              >
                Sign In
              </Link>
            </div>
          </section>
        </div>

        <section className="mx-auto max-w-7xl px-6 pb-24 pt-16">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${feature.iconBg}`}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-slate-800">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <p className="text-xs font-medium text-slate-400">
            &copy; {new Date().getFullYear()} StationX. All rights reserved.
          </p>
          <HealthIndicator />
        </div>
      </footer>
    </div>
  );
}
