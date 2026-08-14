'use client';

import { useState } from 'react';
import PermissionGate from '@/components/shared/PermissionGate';
import TableGrid from '@/features/tables/components/TableGrid';
import EditTableDialog from '@/features/tables/components/EditTableDialog';
import ManualOverrideDialog from '@/features/tables/components/ManualOverrideDialog';
import type { TableResponse } from '@/features/tables/api';

export default function TablesPage() {
  const [editTarget, setEditTarget] = useState<TableResponse | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<TableResponse | null>(null);

  return (
    <PermissionGate module="tables" action="view">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <h1 className="text-lg font-bold text-slate-800">Table Management</h1>

        <TableGrid
          onEdit={(table) => setEditTarget(table)}
          onOverride={(table) => setOverrideTarget(table)}
        />

        <EditTableDialog
          open={!!editTarget}
          table={editTarget}
          onClose={() => setEditTarget(null)}
        />
        <ManualOverrideDialog
          open={!!overrideTarget}
          table={overrideTarget}
          onClose={() => setOverrideTarget(null)}
        />
      </div>
    </PermissionGate>
  );
}
