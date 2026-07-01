'use client';

import { useState } from 'react';
import { useDeleteVendor, type VendorResponse } from '@/features/vendors/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface DeleteVendorDialogProps {
  vendor: VendorResponse | null;
  onClose: () => void;
}

export default function DeleteVendorDialog({ vendor, onClose }: DeleteVendorDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteVendor = useDeleteVendor();

  async function handleConfirm() {
    if (!vendor) return;
    setError(null);

    try {
      await deleteVendor.mutateAsync(vendor.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete vendor');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!vendor) return null;

  return (
    <Dialog
      open={!!vendor}
      onClose={handleClose}
      title="Delete Vendor"
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
            disabled={deleteVendor.isPending}
          >
            {deleteVendor.isPending ? 'Deleting\u2026' : 'Delete'}
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
          <span className="font-semibold text-slate-800">{vendor.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{vendor.name}</span>
            <span className="text-slate-400">{vendor.phone || '\u2014'}</span>
          </div>
        </div>

        <p className="text-xs text-red-500">
          This will permanently delete this vendor and their data. This action cannot be undone.
        </p>
      </div>
    </Dialog>
  );
}
