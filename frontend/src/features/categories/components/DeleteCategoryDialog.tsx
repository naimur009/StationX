'use client';

import { useState } from 'react';
import { useDeleteCategory, usePermanentDeleteCategory, type CategoryResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DeleteCategoryDialogProps {
  category: CategoryResponse | null;
  permanent?: boolean;
  onClose: () => void;
}

export default function DeleteCategoryDialog({ category, permanent = false, onClose }: DeleteCategoryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteCategory = useDeleteCategory();
  const permanentDeleteCategory = usePermanentDeleteCategory();

  const isPending = permanent ? permanentDeleteCategory.isPending : deleteCategory.isPending;

  async function handleConfirm() {
    if (!category) return;
    setError(null);

    try {
      if (permanent) {
        await permanentDeleteCategory.mutateAsync(category.id);
      } else {
        await deleteCategory.mutateAsync(category.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(permanent ? 'Failed to delete category' : 'Failed to deactivate category');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!category) return null;

  return (
    <Dialog
      open={!!category}
      onClose={handleClose}
      title={permanent ? 'Delete Category Permanently' : 'Deactivate Category'}
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
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          {permanent
            ? 'Are you sure you want to permanently delete'
            : 'Are you sure you want to deactivate'}{' '}
          <span className="font-semibold text-slate-800">{category.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>{category.name}</span>
            <Badge variant={category.isActive ? 'green' : 'slate'}>
              {category.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {permanent ? (
          <p className="text-xs text-red-600">
            This action cannot be undone. The category will be permanently removed from the system.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            This will soft-delete this category. Products assigned to it will retain their
            reference but the category will be hidden from active lists.
          </p>
        )}
      </div>
    </Dialog>
  );
}
