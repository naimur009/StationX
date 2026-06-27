'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCategory, useUpdateCategory, type CategoryResponse } from '../api';
import { createCategorySchema, updateCategorySchema } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface CategoryFormProps {
  open: boolean;
  category: CategoryResponse | null;
  onClose: () => void;
}

export default function CategoryForm({ open, category, onClose }: CategoryFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  useEffect(() => {
    function check() {
      setIsCompact(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isEdit = !!category;
  const schema = isEdit ? updateCategorySchema : createCategorySchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ name: string }>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (category) {
        reset({ name: category.name });
      } else {
        reset({ name: '' });
      }
      setError(null);
    }
  }, [open, category, reset]);

  async function onSubmit(data: { name: string }) {
    setError(null);

    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({ id: category.id, name: data.name });
      } else {
        await createCategory.mutateAsync({ name: data.name });
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update category' : 'Failed to create category');
      }
    }
  }

  function handleClose() {
    reset();
    setError(null);
    onClose();
  }

  function handleFormSubmit() {
    handleSubmit(onSubmit)();
  }

  const isPending = isEdit ? updateCategory.isPending : createCategory.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Category' : 'Create Category'}
      size={isCompact ? 'full' : 'sm'}
      footer={
        <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="ghost" size="md" className="w-full sm:w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={handleFormSubmit}
          >
            {isPending ? 'Saving\u2026' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="category-name"
            type="text"
            placeholder="e.g. Beverages"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
      </form>
    </Dialog>
  );
}
