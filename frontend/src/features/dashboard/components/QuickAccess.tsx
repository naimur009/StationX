import Link from 'next/link';
import { ShoppingCart, ClipboardList, Package, Users } from 'lucide-react';

interface QuickLink {
  href: string;
  label: string;
  icon: typeof ShoppingCart;
}

const links: QuickLink[] = [
  { href: '/pos', label: 'New POS Order', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
];

export default function QuickAccess() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-slate-800">Quick Access</h2>
      <div className="grid grid-cols-2 gap-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
