'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import ExpenseList from '@/features/expenses/components/ExpenseList';
import ExpenseForm from '@/features/expenses/components/ExpenseForm';
import type { ExpenseResponse } from '@/features/expenses/api';

export default function ExpensesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseResponse | null>(null);

  return (
    <PermissionGate module="expenses" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Expenses</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track and manage business expenses
            </p>
          </div>
          <PermissionGate module="expenses" action="create">
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              Add Expense
            </Button>
          </PermissionGate>
        </div>

        <ExpenseList
          onEdit={(expense) => setEditExpense(expense)}
          onDelete={(expense) => setDeleteExpense(expense)}
        />

        <ExpenseForm
          open={createOpen}
          expense={null}
          onClose={() => setCreateOpen(false)}
        />
        <ExpenseForm
          open={!!editExpense}
          expense={editExpense}
          onClose={() => setEditExpense(null)}
        />
      </div>
    </PermissionGate>
  );
}
