'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { usePublicSettings, useHealthCheck } from '@/features/homepage/api';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Contact', href: '#contact' },
] as const;

function HealthStatus() {
  const { data, isSuccess } = useHealthCheck();
  const connected = isSuccess && data?.connected !== false;

  return (
    <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden="true"
      />
      {connected ? 'Online' : 'Offline'}
    </span>
  );
}

export default function HomeNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: settingsData, isError } = usePublicSettings();
  const settings = settingsData?.data;
  const logoSrc = !isError ? settings?.logo?.url : undefined;
  const brandName = settings?.restaurantName || 'StationX';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginHref = isAuthenticated ? '/redirect?to=/overview' : '/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  function handleLoginClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    router.push(loginHref);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link href="#home" className="flex min-w-0 items-center">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${brandName} logo`}
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-lg font-bold tracking-tight text-slate-900">
              {brandName}
            </span>
          )}
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-4">
          <HealthStatus />

          <Link
            href={loginHref}
            onClick={handleLoginClick}
            aria-busy={pending}
            className="hidden h-9 min-w-[7.5rem] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-primary/25 transition-all hover:bg-primary/90 active:translate-y-px md:inline-flex"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading
              </>
            ) : (
              'Staff Login'
            )}
          </Link>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={loginHref}
            onClick={() => setMenuOpen(false)}
            className="mt-3 flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Staff Login
          </Link>
        </div>
      )}
    </header>
  );
}