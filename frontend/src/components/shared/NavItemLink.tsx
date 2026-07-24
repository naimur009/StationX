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

  const linkClasses = cn(
    'flex min-h-[44px] items-center rounded-xl text-sm font-medium transition-colors',
    collapsed
      ? 'justify-center px-0 py-2.5'
      : 'gap-3 py-2.5 pr-3',
    isActive && collapsed && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30',
    isActive && !collapsed && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 pl-[9px]',
    !isActive && collapsed && 'text-slate-400 hover:bg-white/10 hover:text-white',
    !isActive && !collapsed && 'text-slate-400 hover:bg-white/10 hover:text-white pl-3',
  );

  return (
    <div className={cn('relative', isActive && !collapsed && 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-warning')}>
      <Link
        href={item.href}
        onClick={onClick}
        className={linkClasses}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    </div>
  );
}
