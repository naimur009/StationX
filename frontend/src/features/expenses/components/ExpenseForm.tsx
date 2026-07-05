'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateExpense, useUpdateExpense, useExpenseReferenceData, type ExpenseResponse } from '../api';
import { createExpenseSchema, updateExpenseSchema } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface ExpenseFormProps {
  open: boolean;
  expense: ExpenseResponse | null;
  onClose: () => void;
}

export default function ExpenseForm({ open, expense, onClose }: ExpenseFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const isEdit = !!expense;
  const schema = isEdit ? updateExpenseSchema : createExpenseSchema;

  const { data: refData, isError: refError } = useExpenseReferenceData();

  const vendors = refData?.data.vendors ?? [];
  const users = refData?.data.users ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<{
    amount: number;
    date: string;
    description: string;
    category: string;
    vendorId?: string;
    paidBy: string;
    paidTo: string;
    paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad' | '';
  }>({
    resolver: zodResolver(schema as never),
    defaultValues: {
      amount: 0,
      date: '',
      description: '',
      category: '',
      vendorId: '',
      paidBy: '',
      paidTo: '',
      paymentMethod: '',
    },
  });

  const selectedVendorId = watch('vendorId');

  useEffect(() => {
    if (open) {
      if (expense) {
        reset({
          amount: expense.amount,
          date: expense.date ? expense.date.split('T')[0] : '',
          description: expense.description,
          category: expense.category,
          vendorId: expense.vendorId?._id ?? '',
          paidBy: expense.paidBy._id,
          paidTo: expense.paidTo,
          paymentMethod: expense.paymentMethod,
        });
      } else {
        reset({
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          description: '',
          category: '',
          vendorId: '',
          paidBy: '',
          paidTo: '',
          paymentMethod: '',
        });
      }
      setError(null);
    }
  }, [open, expense, reset]);

  const autoFillPaidTo = useCallback(
    (vendorId: string) => {
      if (!isEdit) {
        const vendor = vendors.find((v) => v.id === vendorId);
        if (vendor) {
          setValue('paidTo', vendor.name);
        }
      }
    },
    [vendors, setValue, isEdit]
  );

  useEffect(() => {
    if (selectedVendorId) {
      autoFillPaidTo(selectedVendorId);
    }
  }, [selectedVendorId, autoFillPaidTo]);

  async function onSubmit(data: {
    amount: number;
    date: string;
    description: string;
    category: string;
    vendorId?: string;
    paidBy: string;
    paidTo: string;
    paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad' | '';
  }) {
    setError(null);

    const payload = {
      amount: data.amount,
      date: data.date,
      description: data.description,
      category: data.category,
      vendorId: data.vendorId || undefined,
      paidBy: data.paidBy,
      paidTo: data.paidTo,
      paymentMethod: data.paymentMethod as 'cash' | 'card' | 'bkash' | 'nagad',
    };

    try {
      if (isEdit && expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...payload });
      } else {
        await createExpense.mutateAsync(payload);
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update expense' : 'Failed to create expense');
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

  const isPending = isEdit ? updateExpense.isPending : createExpense.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Expense' : 'Create Expense'}
      size="lg"
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
      {refError && (
        <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Could not load vendor and staff lists. You may not have permission to create expenses.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="expense-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 4500"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.amount ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div>
            <label htmlFor="expense-date" className="mb-1.5 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="expense-date"
              type="date"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.date ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('date')}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="expense-description" className="mb-1.5 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="expense-description"
            rows={3}
            placeholder="e.g. Weekly vegetable supply from Fresh Farms"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.description ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div>
          <label htmlFor="expense-category" className="mb-1.5 block text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </label>
          <input
            id="expense-category"
            type="text"
            placeholder="e.g. Ingredients, Utilities, Maintenance"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.category ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('category')}
          />
          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="expense-vendor" className="mb-1.5 block text-sm font-medium text-slate-700">
              Vendor
            </label>
            <select
              id="expense-vendor"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('vendorId')}
            >
              <option value="">-- None (ad-hoc) --</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expense-paid-to" className="mb-1.5 block text-sm font-medium text-slate-700">
              Paid To <span className="text-red-500">*</span>
            </label>
            <input
              id="expense-paid-to"
              type="text"
              placeholder="e.g. Fresh Farms Co."
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.paidTo ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('paidTo')}
            />
            {errors.paidTo && <p className="mt-1 text-xs text-red-500">{errors.paidTo.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="expense-paid-by" className="mb-1.5 block text-sm font-medium text-slate-700">
              Paid By <span className="text-red-500">*</span>
            </label>
            <select
              id="expense-paid-by"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.paidBy ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('paidBy')}
            >
              <option value="">Select a staff member</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            {errors.paidBy && <p className="mt-1 text-xs text-red-500">{errors.paidBy.message}</p>}
          </div>

          <div>
            <label htmlFor="expense-payment" className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="expense-payment"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.paymentMethod ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('paymentMethod')}
            >
              <option value="">Select payment method</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </select>
            {errors.paymentMethod && <p className="mt-1 text-xs text-red-500">{errors.paymentMethod.message}</p>}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
