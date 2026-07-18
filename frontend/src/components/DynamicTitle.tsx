'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const TITLE_MAP: Record<string, string> = {
  '/overview': 'Dashboard',
  '/pos': 'POS',
  '/orders': 'Orders',
  '/coupons': 'Coupons',
  '/tasks': 'Tasks',
  '/attendance': 'Attendance',
  '/expenses': 'Expenses',
  '/salaries': 'Salaries',
  '/vendors': 'Vendors',
  '/products': 'Products',
  '/categories': 'Categories',
  '/customers': 'Customers',
  '/employees': 'Employees',
  '/users': 'Users',
  '/settings': 'Settings',
  '/reports': 'Reports',
  '/activity-log': 'Activity Log',
  '/login': 'Sign In',
  '/redirect': 'Redirecting',
};

function matchTitle(pathname: string): string {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];
  const base = '/' + pathname.split('/')[1];
  if (TITLE_MAP[base]) return TITLE_MAP[base];
  return 'StationX';
}

export default function DynamicTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = `${matchTitle(pathname)} · StationX`;
  }, [pathname]);

  return null;
}
