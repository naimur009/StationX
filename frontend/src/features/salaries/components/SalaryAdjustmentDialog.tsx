'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAdjustment, useUpdateAdjustment, type AdjustmentResponse } from '../api';
import { createAdjustmentSchema, updateAdjustmentSchema, type CreateAdjustmentFormData, type UpdateAdjustmentFormData } from '../schema';
import { useEmployeesList } from '@/features/employees/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { AppError } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];



interface SalaryAdjustmentDialogProps {
  open: boolean;
  defaultType?: 'bonus' | 'cut';
  defaultEmployeeId?: string;
  defaultMonth?: number;
  defaultYear?: number;
  editAdjustment?: AdjustmentResponse | null;
  onClose: () => void;
}

export default function SalaryAdjustmentDialog({
  open,
  defaultType = 'bonus',
  defaultEmployeeId,
  defaultMonth,
  defaultYear,
  editAdjustment,
  onClose,
}: SalaryAdjustmentDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const createAdjustment = useCreateAdjustment();
  const updateAdjustment = useUpdateAdjustment();
  const isEdit = !!editAdjustment;

  const now = useMemo(() => new Date(), []);

  const { data: employeesData } = useEmployeesList({ page: 1, limit: 100 });
  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const isCreateMode = !isEdit;
  const formSchema = isEdit ? updateAdjustmentSchema : createAdjustmentSchema;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateAdjustmentFormData | UpdateAdjustmentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit ? {
      type: editAdjustment!.type,
      amount: editAdjustment!.amount,
      reason: editAdjustment!.reason,
      date: editAdjustment!.date,
    } : {
      employeeId: defaultEmployeeId ?? '',
      type: defaultType,
      amount: 0,
      reason: '',
      date: new Date().toISOString().split('T')[0],
      month: defaultMonth ?? now.getMonth() + 1,
      year: defaultYear ?? now.getFullYear(),
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (open) {
      if (editAdjustment) {
        reset({
          type: editAdjustment.type,
          amount: editAdjustment.amount,
          reason: editAdjustment.reason,
          date: editAdjustment.date,
        });
      } else {
        reset({
          employeeId: defaultEmployeeId ?? '',
          type: defaultType,
          amount: 0,
          reason: '',
          date: new Date().toISOString().split('T')[0],
          month: defaultMonth ?? now.getMonth() + 1,
          year: defaultYear ?? now.getFullYear(),
        });
      }
      setError(null);
    }
  }, [open, editAdjustment, defaultEmployeeId, defaultType, defaultMonth, defaultYear, now, reset]);

  useEffect(() => {
    setValue('reason', '');
  }, [selectedType, setValue]);

  async function onSubmit(data: CreateAdjustmentFormData | UpdateAdjustmentFormData) {
    setError(null);

    try {
      if (isEdit && editAdjustment) {
        await updateAdjustment.mutateAsync({
          id: editAdjustment.id,
          type: 'type' in data ? data.type : undefined,
          amount: 'amount' in data ? data.amount : undefined,
          reason: 'reason' in data ? data.reason : undefined,
          date: 'date' in data ? data.date : undefined,
        });
      } else {
        const d = data as CreateAdjustmentFormData;
        await createAdjustment.mutateAsync({
          employeeId: d.employeeId,
          type: d.type,
          amount: d.amount,
          reason: d.reason,
          date: d.date,
          month: d.month,
          year: d.year,
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
        setError(`Failed to ${isEdit ? 'update' : 'add'} ${editAdjustment ? (editAdjustment.type === 'bonus' ? 'bonus' : 'salary cut') : 'adjustment'}`);
      }
    }
  }

  function handleClose() {
    reset();
    setError(null);
    onClose();
  }

  const title = isEdit
    ? `Edit ${editAdjustment!.type === 'bonus' ? 'Bonus' : 'Salary Cut'}`
    : selectedType === 'bonus' ? 'Add Bonus' : 'Add Salary Cut';
  const isPending = isEdit ? updateAdjustment.isPending : createAdjustment.isPending;
  const submitLabel = isPending
    ? 'Saving\u2026'
    : isEdit ? 'Update' : selectedType === 'bonus' ? 'Add Bonus' : 'Add Cut';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isEdit ? 'primary' : selectedType === 'bonus' ? 'success' : 'destructive'}
            size="md"
            disabled={isPending}
            onClick={() => handleSubmit(onSubmit)()}
          >
            {submitLabel}
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
        {isCreateMode && (
          <div>
            <label htmlFor="adj-employee" className="mb-1.5 block text-sm font-medium text-slate-700">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              id="adj-employee"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                (errors as Record<string, unknown>).employeeId ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('employeeId')}
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {formatCurrency(emp.baseSalary)}/mo
                </option>
              ))}
            </select>
            {(errors as Record<string, { message?: string }>).employeeId && <p className="mt-1 text-xs text-red-500">{(errors as Record<string, { message?: string }>).employeeId?.message}</p>}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setValue('type', 'bonus')}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedType === 'bonus'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Bonus
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'cut')}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedType === 'cut'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Salary Cut
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="adj-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="adj-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="e.g. 1000"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.amount ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>

        <div>
          <label htmlFor="adj-reason" className="mb-1.5 block text-sm font-medium text-slate-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <input
            id="adj-reason"
            type="text"
            placeholder="Enter reason"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.reason ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('reason')}
          />
          {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>}
        </div>

        <div>
          <label htmlFor="adj-date" className="mb-1.5 block text-sm font-medium text-slate-700">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="adj-date"
            type="date"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.date ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('date')}
          />
          {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>}
        </div>

        {isCreateMode && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="adj-month" className="mb-1.5 block text-sm font-medium text-slate-700">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                id="adj-month"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('month', { valueAsNumber: true })}
              >
                {MONTHS.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="adj-year" className="mb-1.5 block text-sm font-medium text-slate-700">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                id="adj-year"
                type="number"
                inputMode="numeric"
                min="2000"
                max="2100"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                  (errors as Record<string, unknown>).year ? 'border-red-400' : 'border-slate-300'
                }`}
                {...register('year', { valueAsNumber: true })}
              />
              {(errors as Record<string, { message?: string }>).year && <p className="mt-1 text-xs text-red-500">{(errors as Record<string, { message?: string }>).year?.message}</p>}
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}
