'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import IncomeList from '@/features/incomes/components/IncomeList';
import IncomeForm from '@/features/incomes/components/IncomeForm';
import DeleteIncomeDialog from './DeleteIncomeDialog';
import type { IncomeResponse } from '@/features/incomes/api';

export default function IncomesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<IncomeResponse | null>(null);
  const [deleteIncome, setDeleteIncome] = useState<IncomeResponse | null>(null);

  return (
    <PermissionGate module="incomes" action="view">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Incomes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track miscellaneous income (scrap sales, recycling, etc.)
            </p>
          </div>
          <PermissionGate module="incomes" action="create">
            <Button variant="primary" size="md" className="self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Record Income
            </Button>
          </PermissionGate>
        </div>

        <IncomeList
          onEdit={(income) => setEditIncome(income)}
          onDelete={(income) => setDeleteIncome(income)}
        />

        <IncomeForm
          open={createOpen}
          income={null}
          onClose={() => setCreateOpen(false)}
        />
        <IncomeForm
          open={!!editIncome}
          income={editIncome}
          onClose={() => setEditIncome(null)}
        />
        <DeleteIncomeDialog
          income={deleteIncome}
          onClose={() => setDeleteIncome(null)}
        />
      </div>
    </PermissionGate>
  );
}
