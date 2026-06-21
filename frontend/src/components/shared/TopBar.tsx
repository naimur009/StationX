'use client';

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onLogout?: () => void;
}

export default function TopBar({ onLogout }: TopBarProps) {
  const user = useAuthStore((state) => state.user);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const openMobileDrawer = useUIStore((state) => state.openMobileDrawer);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md',
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:flex"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>

        <span className="hidden text-sm font-bold text-slate-800 sm:inline">
          Whatta Cup
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
          <span className="text-xs font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
        </div>

        {user && (
          <div className="hidden md:block">
            <div className="text-sm font-semibold text-slate-700">
              {user.name}
            </div>
            <div className="text-right text-xs capitalize text-slate-400">
              {user.role}
            </div>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
