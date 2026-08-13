'use client';

import { useState } from 'react';
import { useDeleteSalary, type SalaryResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DeleteSalaryDialogProps {
  salary: SalaryResponse | null;
  onClose: () => void;
}

export default function DeleteSalaryDialog({ salary, onClose }: DeleteSalaryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [forceConfirmed, setForceConfirmed] = useState(false);
  const deleteSalary = useDeleteSalary();

  const hasAdvances = (salary?.advances.length ?? 0) > 0;

  async function handleConfirm() {
    if (!salary) return;
    setError(null);

    try {
      await deleteSalary.mutateAsync({ id: salary.id, force: hasAdvances });
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete salary record');
      }
    }
  }

  function handleClose() {
    setError(null);
    setForceConfirmed(false);
    onClose();
  }

  if (!salary) return null;

  function formatCurrency(amount: number): string {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <Dialog
      open={!!salary}
      onClose={handleClose}
      title={hasAdvances ? 'Hard Delete Salary Record' : 'Delete Salary Record'}
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
            disabled={deleteSalary.isPending || (hasAdvances && !forceConfirmed)}
          >
            {deleteSalary.isPending ? 'Deleting\u2026' : hasAdvances ? 'Hard Delete' : 'Delete'}
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
          Are you sure you want to delete the salary record for{' '}
          <span className="font-semibold text-slate-800">{salary.employeeId.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{formatCurrency(salary.baseSalary)}</span>
            <span className="text-slate-400">
              {MONTHS[salary.month - 1]} {salary.year}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Status: {salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}
          </div>
        </div>

        {hasAdvances && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This record has {salary.advances.length} advance(s) totalling{' '}
            {formatCurrency(salary.advances.reduce((sum, a) => sum + a.amount, 0))}. Deletion is
            blocked by default — use the hard delete only to correct a mistaken entry (e.g. a wrong
            paid amount). The record and all its advances will be permanently removed.
          </div>
        )}

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={forceConfirmed}
            onChange={(e) => setForceConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span>
            I understand this will permanently delete the record{hasAdvances ? ' and its advances' : ''}. This action cannot be undone.
          </span>
        </label>

        <p className="text-xs text-red-500">
          This will permanently delete this salary record. This action cannot be undone.
        </p>
      </div>
    </Dialog>
  );
}