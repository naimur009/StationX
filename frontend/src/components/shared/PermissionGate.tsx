'use client';

import { usePermission } from '@/hooks/usePermission';
import { ShieldOff } from 'lucide-react';

interface PermissionGateProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideOnDenied?: boolean;
}

export default function PermissionGate({
  module,
  action,
  children,
  fallback,
  hideOnDenied,
}: PermissionGateProps) {
  const allowed = usePermission(module, action);

  const shouldHide = hideOnDenied ?? action !== 'view';

  if (!allowed) {
    if (shouldHide) {
      return <>{fallback ?? null}</>;
    }

    return fallback ?? (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <ShieldOff className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to view this section. Please contact your administrator if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
