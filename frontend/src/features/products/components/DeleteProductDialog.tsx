'use client';

import { useState } from 'react';
import { useDeleteProduct, type ProductResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface DeleteProductDialogProps {
  product: ProductResponse | null;
  onClose: () => void;
}

export default function DeleteProductDialog({ product, onClose }: DeleteProductDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteProduct = useDeleteProduct();

  async function handleConfirm() {
    if (!product) return;
    if (deleteProduct.isPending) return;
    setError(null);

    try {
      await deleteProduct.mutateAsync(product.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete product');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!product) return null;

  return (
    <Dialog
      open={!!product}
      onClose={handleClose}
      title="Delete Product"
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
            disabled={deleteProduct.isPending}
          >
            {deleteProduct.isPending ? 'Deleting\u2026' : 'Delete'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-slate-800">{product.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{product.name}</span>
          <div className="mt-1 text-slate-500">
            {formatCurrency(product.price)} — {product.categoryName || 'No category'}
          </div>
        </div>

        <p className="text-xs text-red-600">
          This action cannot be undone. The product will be permanently removed from the system.
        </p>
      </div>
    </Dialog>
  );
}
