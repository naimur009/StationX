'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type NavItem } from './Sidebar';
import { cn } from '@/lib/utils';

interface NavItemLinkProps {
  item: NavItem;
  collapsed?: boolean;
  onClick?: () => void;
}

export default function NavItemLink({ item, collapsed, onClick }: NavItemLinkProps) {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center rounded-xl text-sm font-medium transition-colors',
        collapsed
          ? 'justify-center px-0 py-2.5'
          : 'gap-3 px-3 py-2.5',
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-400 hover:bg-white/10 hover:text-white'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}
