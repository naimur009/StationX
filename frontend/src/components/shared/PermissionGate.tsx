'use client';

import { usePermission } from '@/hooks/usePermission';

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
    return fallback ?? null;
  }

  return <>{children}</>;
}
