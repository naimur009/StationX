'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCustomer, useUpdateCustomer, type CustomerResponse } from '../api';
import { createCustomerSchema } from '../schema';
import type { CreateCustomerFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface CustomerFormProps {
  open: boolean;
  customer: CustomerResponse | null;
  onClose: () => void;
}

export default function CustomerForm({ open, customer, onClose }: CustomerFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
  });

  useEffect(() => {
    if (open) {
      if (customer) {
        reset({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
        });
      } else {
        reset({ name: '', phone: '', email: '', address: '' });
      }
      setError(null);
    }
  }, [open, customer, reset]);

  async function onSubmit(data: CreateCustomerFormData) {
    setError(null);

    try {
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...data });
      } else {
        await createCustomer.mutateAsync(data);
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update customer' : 'Failed to create customer');
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

  const isPending = isEdit ? updateCustomer.isPending : createCustomer.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Customer' : 'Create Customer'}
      size="sm"
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
          <label htmlFor="customer-name" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Name
          </label>
          <input
            id="customer-name"
            type="text"
            placeholder="e.g. John Doe"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="customer-phone" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Phone
          </label>
          <input
            id="customer-phone"
            type="text"
            placeholder="e.g. +8801712345678"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.phone ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('phone')}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="customer-email" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Email <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="customer-email"
            type="email"
            placeholder="e.g. john@example.com"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.email ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="customer-address" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Address <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="customer-address"
            placeholder="e.g. 123 Main Street, Dhaka"
            rows={3}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.address ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('address')}
          />
          {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
        </div>
      </form>
    </Dialog>
  );
}
