'use client';

import { usePermission } from '@/hooks/usePermission';
import { ShieldOff } from 'lucide-react';

interface PermissionGateProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({
  module,
  action,
  children,
  fallback,
}: PermissionGateProps) {
  const allowed = usePermission(module, action);

  if (!allowed) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldOff className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          You don&apos;t have permission to view this section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
