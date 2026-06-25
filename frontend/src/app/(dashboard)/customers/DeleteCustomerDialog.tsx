'use client';

import { useState } from 'react';
import { useDeleteCustomer, type CustomerResponse } from '@/features/customers/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
        setError('Failed to deactivate customer');
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
      title="Deactivate Customer"
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
            {deleteCustomer.isPending ? 'Deactivating\u2026' : 'Deactivate'}
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
          Are you sure you want to deactivate{' '}
          <span className="font-semibold text-slate-800">{customer.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="font-medium text-slate-800">{customer.name}</span>
              <span className="ml-2 text-slate-400">{customer.phone}</span>
            </div>
            <Badge variant={customer.isActive ? 'green' : 'slate'}>
              {customer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          This will soft-delete this customer. Their order history will be preserved.
        </p>
      </div>
    </Dialog>
  );
}
