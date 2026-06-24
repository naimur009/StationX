'use client';

import { useState } from 'react';
import { useDeleteProduct, usePermanentDeleteProduct, type ProductResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DeleteProductDialogProps {
  product: ProductResponse | null;
  permanent?: boolean;
  onClose: () => void;
}

export default function DeleteProductDialog({ product, permanent = false, onClose }: DeleteProductDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteProduct = useDeleteProduct();
  const permanentDeleteProduct = usePermanentDeleteProduct();

  const isPending = permanent ? permanentDeleteProduct.isPending : deleteProduct.isPending;

  async function handleConfirm() {
    if (!product) return;
    if (isPending) return;
    setError(null);

    try {
      if (permanent) {
        await permanentDeleteProduct.mutateAsync(product.id);
      } else {
        await deleteProduct.mutateAsync(product.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(permanent ? 'Failed to delete product' : 'Failed to deactivate product');
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
      title={permanent ? 'Delete Product Permanently' : 'Deactivate Product'}
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
            disabled={isPending}
          >
            {isPending
              ? (permanent ? 'Deleting\u2026' : 'Deactivating\u2026')
              : (permanent ? 'Delete Permanently' : 'Deactivate')}
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
          {permanent
            ? 'Are you sure you want to permanently delete'
            : 'Are you sure you want to deactivate'}{' '}
          <span className="font-semibold text-slate-800">{product.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{product.name}</span>
            <Badge variant={product.isActive ? 'green' : 'slate'}>
              {product.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="mt-1 text-slate-500">
            TK {product.price.toFixed(2)} — {product.categoryName || 'No category'}
          </div>
        </div>

        {permanent ? (
          <p className="text-xs text-red-600">
            This action cannot be undone. The product will be permanently removed from the system.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            This product will be soft-deleted and hidden from active lists. You can
            reactivate it later.
          </p>
        )}
      </div>
    </Dialog>
  );
}
