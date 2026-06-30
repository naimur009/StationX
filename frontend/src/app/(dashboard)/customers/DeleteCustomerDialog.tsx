'use client';

import { useState } from 'react';
import { useDeleteCustomer, type CustomerResponse } from '@/features/customers/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface DeleteCustomerDialogProps {
  customer: CustomerResponse | null;
  onClose: () => void;
}

export default function DeleteCustomerDialog({ customer, onClose }: DeleteCustomerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteCustomer = useDeleteCustomer();

  async function handleConfirm() {
    if (!customer) return;
    setError(null);

    try {
      await deleteCustomer.mutateAsync(customer.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete customer');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!customer) return null;

  return (
    <Dialog
      open={!!customer}
      onClose={handleClose}
      title="Delete Customer"
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
            disabled={deleteCustomer.isPending}
          >
            {deleteCustomer.isPending ? 'Deleting\u2026' : 'Delete'}
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
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-800">{customer.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{customer.name}</span>
            <span className="text-slate-400">{customer.phone}</span>
          </div>
        </div>

        <p className="text-xs text-red-500">
          This will permanently delete this customer and their data. This action cannot be undone.
        </p>
      </div>
    </Dialog>
  );
}
