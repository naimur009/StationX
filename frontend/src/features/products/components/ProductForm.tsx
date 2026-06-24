'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateProduct, useUpdateProduct, type ProductResponse } from '../api';
import { useCategoriesList } from '@/features/categories/api';
import { createProductSchema, type CreateProductFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import ImageUpload from '@/components/shared/ImageUpload';

interface ProductFormProps {
  open: boolean;
  product: ProductResponse | null;
  onClose: () => void;
}

export default function ProductForm({ open, product, onClose }: ProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [imageValue, setImageValue] = useState<{ url: string; publicId: string } | null>(null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categoriesData } = useCategoriesList({ isActive: 'true', limit: 9999 });

  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
  });

  useEffect(() => {
    if (open) {
      if (product) {
        reset({
          name: product.name,
          price: product.price,
          categoryId: product.categoryId,
          description: product.description || '',
        });
        setImageValue(product.image);
      } else {
        reset({ name: '', price: 0, categoryId: '', description: '' });
        setImageValue(null);
      }
      setError(null);
    }
  }, [open, product, reset]);

  async function onSubmit(data: CreateProductFormData) {
    if (isPending) return;
    setError(null);

    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({
          id: product.id,
          name: data.name,
          price: data.price,
          categoryId: data.categoryId,
          description: data.description,
          image: imageValue || undefined,
        });
      } else {
        await createProduct.mutateAsync({
          name: data.name,
          price: data.price,
          categoryId: data.categoryId,
          description: data.description || undefined,
          image: imageValue || undefined,
        });
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update product' : 'Failed to create product');
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

  const isPending = isEdit ? updateProduct.isPending : createProduct.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Product' : 'Create Product'}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isPending}
            onClick={handleFormSubmit}
          >
            {isPending ? 'Saving\u2026' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Image
          </label>
          <ImageUpload
            value={imageValue}
            onChange={setImageValue}
            folder="products"
          />
        </div>

        <div>
          <label htmlFor="product-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="product-name"
            type="text"
            placeholder="e.g. Chicken Fry"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="product-price" className="mb-1.5 block text-sm font-medium text-slate-700">
              Price (TK)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">TK</span>
              <input
                id="product-price"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.price ? 'border-red-400' : 'border-slate-300'
                }`}
                {...register('price', { valueAsNumber: true })}
              />
            </div>
            {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
          </div>

          <div>
            <label htmlFor="product-category" className="mb-1.5 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              id="product-category"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.categoryId ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('categoryId')}
            >
              <option value="">Select a category</option>
              {categoriesData?.data.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>}
            {categoriesData && categoriesData.data.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                No categories available — create one in Categories first
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="product-description" className="mb-1.5 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="product-description"
            rows={3}
            placeholder="Optional description..."
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.description ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>
      </form>
    </Dialog>
  );
}
