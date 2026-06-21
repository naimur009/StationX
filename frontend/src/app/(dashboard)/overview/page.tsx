'use client';

import PermissionGate from '@/components/shared/PermissionGate';

export default function OverviewPage() {
  return (
    <PermissionGate module="dashboard" action="view">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Key metrics and quick access to your modules will appear here.
        </p>
      </div>
    </PermissionGate>
  );
}
