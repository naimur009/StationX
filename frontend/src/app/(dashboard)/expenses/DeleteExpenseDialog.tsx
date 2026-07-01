'use client';

import { useState } from 'react';
import { useDeleteExpense, type ExpenseResponse } from '@/features/expenses/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface DeleteExpenseDialogProps {
  expense: ExpenseResponse | null;
  onClose: () => void;
}

export default function DeleteExpenseDialog({ expense, onClose }: DeleteExpenseDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteExpense = useDeleteExpense();

  async function handleConfirm() {
    if (!expense) return;
    setError(null);

    try {
      await deleteExpense.mutateAsync(expense.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete expense');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!expense) return null;

  function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <Dialog
      open={!!expense}
      onClose={handleClose}
      title="Delete Expense"
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="md"
            onClick={handleConfirm}
            disabled={deleteExpense.isPending}
          >
            {deleteExpense.isPending ? 'Deleting\u2026' : 'Delete'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          Are you sure you want to delete this expense of{' '}
          <span className="font-semibold text-slate-800">{formatCurrency(expense.amount)}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{expense.description}</span>
            <span className="text-slate-400">{expense.category}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {expense.paidTo} &middot; {expense.paymentMethod}
          </div>
        </div>

        <p className="text-xs text-red-500">
          This will permanently delete this expense record. This action cannot be undone.
        </p>
      </div>
    </Dialog>
  );
}
