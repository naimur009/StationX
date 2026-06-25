'use client';

import { useMemo } from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './Sidebar';
import NavItemLink from './NavItemLink';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function MobileNav({ open, onClose, onLogout }: MobileNavProps) {
  const user = useAuthStore((state) => state.user);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasPermission(user, item.module, 'view')),
    [user]
  );

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'sidebar-transition fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-white/10 bg-gradient-to-b from-slate-900 to-slate-800',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex min-h-[64px] items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg">
              <span className="text-sm font-bold text-white">W</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white">StationX</div>
              <div className="text-xs text-slate-400">Management</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleItems.map((item) => (
            <NavItemLink key={item.href} item={item} onClick={onClose} />
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
