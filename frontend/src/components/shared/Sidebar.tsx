'use client';

import { useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  TicketPercent,
  CheckSquare,
  CalendarCheck,
  ArrowUpDown,
  DollarSign,
  Truck,
  Package,
  FolderTree,
  Users,
  UserCog,
  Briefcase,
  Settings,
  BarChart3,
  History,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import NavItemLink from './NavItemLink';

export interface NavItem {
  href: string;
  label: string;
  module: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/overview', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'POS', module: 'pos', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', module: 'orders', icon: ClipboardList },
  { href: '/coupons', label: 'Coupons', module: 'coupons', icon: TicketPercent },
  { href: '/tasks', label: 'Tasks', module: 'tasks', icon: CheckSquare },
  { href: '/attendance', label: 'Attendance', module: 'attendance', icon: CalendarCheck },
  { href: '/expenses', label: 'Expenses', module: 'expenses', icon: ArrowUpDown },
  { href: '/salaries', label: 'Salaries', module: 'salary', icon: DollarSign },
  { href: '/vendors', label: 'Vendors', module: 'vendors', icon: Truck },
  { href: '/products', label: 'Products', module: 'products', icon: Package },
  { href: '/categories', label: 'Categories', module: 'categories', icon: FolderTree },
  { href: '/customers', label: 'Customers', module: 'customers', icon: Users },
  { href: '/employees', label: 'Employees', module: 'employees', icon: Briefcase },
  { href: '/users', label: 'Users', module: 'users', icon: UserCog },
  { href: '/settings', label: 'Settings', module: 'settings', icon: Settings },
  { href: '/reports', label: 'Reports', module: 'reports', icon: BarChart3 },
  { href: '/activity-log', label: 'Activity Log', module: 'activity-log', icon: History },
];

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasPermission(user, item.module, 'view')),
    [user]
  );

  return (
    <aside
      className={cn(
        'sidebar-transition fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/10 bg-gradient-to-b from-slate-900 to-slate-800',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex min-h-[64px] items-center justify-center border-b border-white/10 px-4">
        <span className={cn('flex items-center', sidebarCollapsed && 'hidden')}><span className="text-lg font-bold text-[#F8C301]">Station</span><span className="text-2xl font-black italic text-[#D81B26]">X</span></span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => (
          <NavItemLink key={item.href} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            'flex w-full items-center rounded-xl text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400',
            sidebarCollapsed
              ? 'justify-center px-0 py-2.5'
              : 'gap-3 px-3 py-2.5'
          )}
          title={sidebarCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
