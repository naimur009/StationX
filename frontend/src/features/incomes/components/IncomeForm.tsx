'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateIncome, useUpdateIncome, useIncomeReferenceData, type IncomeResponse } from '../api';
import { createIncomeSchema, updateIncomeSchema } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface IncomeFormProps {
  open: boolean;
  income: IncomeResponse | null;
  onClose: () => void;
}

export default function IncomeForm({ open, income, onClose }: IncomeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();

  const isEdit = !!income;
  const schema = isEdit ? updateIncomeSchema : createIncomeSchema;

  const { data: refData, isError: refError } = useIncomeReferenceData();

  const employees = refData?.data.employees ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{
    amount: number;
    date: string;
    description: string;
    category: string;
    receivedFrom: string;
    receivedBy: string;
    paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad' | '';
  }>({
    resolver: zodResolver(schema as never),
    defaultValues: {
      amount: 0,
      date: '',
      description: '',
      category: '',
      receivedFrom: '',
      receivedBy: '',
      paymentMethod: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (income) {
        reset({
          amount: income.amount,
          date: income.date ? income.date.split('T')[0] : '',
          description: income.description,
          category: income.category,
          receivedFrom: income.receivedFrom,
          receivedBy: income.receivedBy?._id ?? '',
          paymentMethod: income.paymentMethod,
        });
      } else {
        reset({
          amount: 0,
          date: new Date().toLocaleDateString('en-CA'),
          description: '',
          category: '',
          receivedFrom: '',
          receivedBy: '',
          paymentMethod: '',
        });
      }
      setError(null);
    }
  }, [open, income, reset]);

  async function onSubmit(data: {
    amount: number;
    date: string;
    description: string;
    category: string;
    receivedFrom: string;
    receivedBy: string;
    paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad' | '';
  }) {
    setError(null);

    const payload = {
      amount: data.amount,
      date: data.date,
      description: data.description,
      category: data.category,
      receivedFrom: data.receivedFrom,
      receivedBy: data.receivedBy,
      paymentMethod: data.paymentMethod as 'cash' | 'card' | 'bkash' | 'nagad',
    };

    try {
      if (isEdit && income) {
        await updateIncome.mutateAsync({ id: income.id, ...payload });
      } else {
        await createIncome.mutateAsync(payload);
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update income' : 'Failed to create income');
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

  const isPending = isEdit ? updateIncome.isPending : createIncome.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Income' : 'Record Income'}
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
          Could not load staff list. You may not have permission to record income.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="income-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="income-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 5000"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.amount ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div>
            <label htmlFor="income-date" className="mb-1.5 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="income-date"
              type="date"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.date ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('date')}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="income-description" className="mb-1.5 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="income-description"
            rows={3}
            placeholder="e.g. Sold scrap plastic bottles"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.description ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div>
          <label htmlFor="income-category" className="mb-1.5 block text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </label>
          <input
            id="income-category"
            type="text"
            placeholder="e.g. Scrap, Plastic, Other"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.category ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('category')}
          />
          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="income-received-from" className="mb-1.5 block text-sm font-medium text-slate-700">
              Received From <span className="text-red-500">*</span>
            </label>
            <input
              id="income-received-from"
              type="text"
              placeholder="e.g. Scrap Dealer, Customer"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.receivedFrom ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('receivedFrom')}
            />
            {errors.receivedFrom && <p className="mt-1 text-xs text-red-500">{errors.receivedFrom.message}</p>}
          </div>

          <div>
            <label htmlFor="income-received-by" className="mb-1.5 block text-sm font-medium text-slate-700">
              Received By <span className="text-red-500">*</span>
            </label>
            <select
              id="income-received-by"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.receivedBy ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('receivedBy')}
            >
              <option value="">Select a staff member</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {errors.receivedBy && <p className="mt-1 text-xs text-red-500">{errors.receivedBy.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="income-payment" className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            id="income-payment"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
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
      </form>
    </Dialog>
  );
}
