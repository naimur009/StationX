'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus } from 'lucide-react';
import { useCreateVendor, useUpdateVendor, type VendorResponse } from '../api';
import { createVendorSchema, updateVendorSchema } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface VendorFormProps {
  open: boolean;
  vendor: VendorResponse | null;
  onClose: () => void;
}

export default function VendorForm({ open, vendor, onClose }: VendorFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const isEdit = !!vendor;
  const schema = isEdit ? updateVendorSchema : createVendorSchema;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<{
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    itemsSupplied?: string[];
  }>({
    resolver: zodResolver(schema) as Resolver<{
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      itemsSupplied?: string[];
    }>,
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      itemsSupplied: [],
    },
  });

  const itemsSupplied = watch('itemsSupplied') ?? [];

  useEffect(() => {
    if (open) {
      if (vendor) {
        reset({
          name: vendor.name,
          contactPerson: vendor.contactPerson ?? '',
          phone: vendor.phone ?? '',
          email: vendor.email ?? '',
          address: vendor.address ?? '',
          itemsSupplied: vendor.itemsSupplied ?? [],
        });
      } else {
        reset({
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          itemsSupplied: [],
        });
      }
      setError(null);
    }
  }, [open, vendor, reset]);

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) return;
    if (itemsSupplied.length >= 50) return;
    if (itemsSupplied.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setValue('itemsSupplied', [...itemsSupplied, trimmed], { shouldValidate: true });
    setTagInput('');
    tagInputRef.current?.focus();
  }

  function removeTag(tag: string) {
    setValue('itemsSupplied', itemsSupplied.filter((t) => t !== tag), { shouldValidate: true });
  }

  async function onSubmit(data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    itemsSupplied?: string[];
  }) {
    setError(null);

    const payload = {
      ...data,
      contactPerson: data.contactPerson || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      itemsSupplied: data.itemsSupplied && data.itemsSupplied.length > 0 ? data.itemsSupplied : undefined,
    };

    try {
      if (isEdit && vendor) {
        await updateVendor.mutateAsync({ id: vendor.id, ...payload });
      } else {
        await createVendor.mutateAsync(payload as Parameters<typeof createVendor.mutateAsync>[0]);
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update vendor' : 'Failed to create vendor');
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

  const isPending = isEdit ? updateVendor.isPending : createVendor.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Vendor' : 'Create Vendor'}
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
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="vendor-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="vendor-name"
            type="text"
            placeholder="e.g. Fresh Farms Produce"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="vendor-contact" className="mb-1.5 block text-sm font-medium text-slate-700">
            Contact Person
          </label>
          <input
            id="vendor-contact"
            type="text"
            placeholder="e.g. Rahim Mia"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('contactPerson')}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="vendor-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              id="vendor-phone"
              type="tel"
              placeholder="e.g. +8801712345678"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('phone')}
            />
          </div>

          <div>
            <label htmlFor="vendor-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="vendor-email"
              type="email"
              placeholder="e.g. rahim@freshfarms.com"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.email ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="vendor-address" className="mb-1.5 block text-sm font-medium text-slate-700">
            Address
          </label>
          <textarea
            id="vendor-address"
            rows={3}
            placeholder="e.g. 123 Kawran Bazar, Dhaka"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('address')}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Items Supplied
          </label>
          <Controller
            control={control}
            name="itemsSupplied"
            render={() => (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {itemsSupplied.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-indigo-400 hover:text-indigo-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={tagInputRef}
                    type="text"
                    placeholder="Type and press Enter to add"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={100}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addTag}
                    disabled={!tagInput.trim() || itemsSupplied.length >= 50}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.itemsSupplied && (
                  <p className="mt-1 text-xs text-red-500">{errors.itemsSupplied.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {itemsSupplied.length}/50 items
                </p>
              </div>
            )}
          />
        </div>
      </form>
    </Dialog>
  );
}
