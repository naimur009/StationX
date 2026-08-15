'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAddAdvance, useCreateSalary, type SalaryResponse } from '../api';
import { addAdvanceSchema, type AddAdvanceFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface AddAdvanceDialogProps {
  open: boolean;
  salary: SalaryResponse | null;
  employeeId?: string;
  employeeName?: string;
  baseSalary?: number;
  month?: number;
  year?: number;
  onClose: () => void;
}

export default function AddAdvanceDialog({
  open,
  salary,
  employeeId,
  employeeName,
  baseSalary,
  month,
  year,
  onClose,
}: AddAdvanceDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const addAdvance = useAddAdvance();
  const createSalary = useCreateSalary();

  const isCreate = !salary;
  const effectiveName = salary?.employeeId.name ?? employeeName ?? '';
  const effectiveBase = salary?.baseSalary ?? baseSalary ?? 0;
  const isPending = addAdvance.isPending || createSalary.isPending;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<AddAdvanceFormData>({
    resolver: zodResolver(addAdvanceSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      note: '',
    },
  });

  const watchedAmount = watch('amount');

  useEffect(() => {
    if (open) {
      reset({
        amount: 0,
        date: new Date(),
        note: '',
      });
      setError(null);
    }
  }, [open, reset]);

  function formatCurrency(amount: number): string {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function onSubmit(data: AddAdvanceFormData) {
    setError(null);

    if (data.amount > effectiveBase) {
      setError(`Payment amount cannot exceed base salary of ${formatCurrency(effectiveBase)}`);
      return;
    }

    try {
      if (salary) {
        if (data.amount > salary.remainingBalance) {
          setError(`Payment amount exceeds remaining balance of ${formatCurrency(salary.remainingBalance)}`);
          return;
        }
        await addAdvance.mutateAsync({
          salaryId: salary.id,
          amount: data.amount,
          date: typeof data.date === 'string' ? data.date : data.date.toISOString().split('T')[0],
          note: data.note || undefined,
        });
      } else {
        if (!employeeId || !month || !year) return;
        await createSalary.mutateAsync({
          employeeId,
          paidAmount: data.amount,
          month,
          year,
        });
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError(String((err as { message: string }).message));
      } else {
        setError('Failed to record payment');
      }
    }
  }

  function handleClose() {
    reset();
    setError(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Payments — ${effectiveName}`}
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
            onClick={() => handleSubmit(onSubmit)()}
          >
            {isPending ? 'Saving\u2026' : 'Add Payment'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div>
          <span className="text-xs text-slate-500">Base Salary</span>
          <p className="font-semibold text-slate-800">{formatCurrency(effectiveBase)}</p>
        </div>
        {salary ? (
          <>
            <div>
              <span className="text-xs text-slate-500">Paid So Far</span>
              <p className="font-semibold text-green-600">{formatCurrency(salary.totalPaid)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Remaining</span>
              <p className="font-semibold text-amber-600">{formatCurrency(salary.remainingBalance)}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="text-xs text-slate-500">Remaining After Payment</span>
              <p className="font-semibold text-amber-600">
                {formatCurrency(Math.max(0, effectiveBase - (watchedAmount || 0)))}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Month / Year</span>
              <p className="font-semibold text-slate-800">
                {month ?? '—'} / {year ?? '—'}
              </p>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="advance-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="advance-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 3000"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.amount ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>

        {!isCreate && (
          <div>
            <label htmlFor="advance-date" className="mb-1.5 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="advance-date"
              type="date"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.date ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('date')}
            />
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
          </div>
        )}

        <div>
          <label htmlFor="advance-note" className="mb-1.5 block text-sm font-medium text-slate-700">
            Note
          </label>
          <input
            id="advance-note"
            type="text"
            placeholder="Optional note"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('note')}
          />
        </div>
      </form>
    </Dialog>
  );
}
