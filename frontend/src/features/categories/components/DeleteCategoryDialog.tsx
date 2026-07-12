'use client';

import { useState } from 'react';
import { useDeleteCategory, type CategoryResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface DeleteCategoryDialogProps {
  category: CategoryResponse | null;
  onClose: () => void;
}

export default function DeleteCategoryDialog({ category, onClose }: DeleteCategoryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteCategory = useDeleteCategory();

  async function handleConfirm() {
    if (!category) return;
    setError(null);

    try {
      await deleteCategory.mutateAsync(category.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete category');
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
      title="Delete Category"
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
            disabled={deleteCategory.isPending}
          >
            {deleteCategory.isPending ? 'Deleting\u2026' : 'Delete'}
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
          <span className="font-semibold text-slate-800">{category.name}</span>?
        </p>

        <p className="text-xs text-red-600">
          This action cannot be undone. The category will be permanently removed from the system.
        </p>
      </div>
    </Dialog>
  );
}
