'use client';

import { useState } from 'react';
import { useDeleteEmployee, type EmployeeResponse } from '@/features/employees/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface DeleteEmployeeDialogProps {
  employee: EmployeeResponse | null;
  onClose: () => void;
}

export default function DeleteEmployeeDialog({ employee, onClose }: DeleteEmployeeDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteEmployee = useDeleteEmployee();

  async function handleConfirm() {
    if (!employee) return;
    setError(null);

    try {
      await deleteEmployee.mutateAsync(employee.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete employee');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!employee) return null;

  return (
    <Dialog
      open={!!employee}
      onClose={handleClose}
      title="Delete Employee"
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
            disabled={deleteEmployee.isPending}
          >
            {deleteEmployee.isPending ? 'Deleting\u2026' : 'Delete'}
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
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-slate-800">{employee.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{employee.name}</span>
            <span className="text-slate-400">{employee.phone || '\u2014'}</span>
          </div>
          {employee.address && (
            <p className="mt-1 text-xs text-slate-500">{employee.address}</p>
          )}
        </div>

        <p className="text-xs text-red-500">
          This will permanently delete this employee and all associated attendance, salary, and adjustment records. This action cannot be undone.
        </p>
      </div>
    </Dialog>
  );
}
