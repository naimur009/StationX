'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateSalary } from '../api';
import { createSalarySchema, type CreateSalaryFormData } from '../schema';
import { useEmployeesList } from '@/features/employees/api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SalaryFormProps {
  open: boolean;
  onClose: () => void;
  preSelectedEmployeeId?: string;
}

export default function SalaryForm({ open, onClose, preSelectedEmployeeId }: SalaryFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createSalary = useCreateSalary();

  const now = new Date();

  const { data: employeesData } = useEmployeesList({ page: 1, limit: 100 });
  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateSalaryFormData>({
    resolver: zodResolver(createSalarySchema),
    defaultValues: {
      employeeId: '',
      paidAmount: 0,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  });

  const selectedEmployeeId = watch('employeeId');
  const paidAmount = watch('paidAmount');

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const baseSalary = selectedEmployee?.baseSalary ?? 0;
  const remaining = Math.max(0, baseSalary - (paidAmount || 0));

  useEffect(() => {
    if (selectedEmployee) {
      setValue('paidAmount', 0);
    }
  }, [selectedEmployeeId, selectedEmployee, setValue]);

  useEffect(() => {
    if (open) {
      reset({
        employeeId: preSelectedEmployeeId ?? '',
        paidAmount: 0,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      setError(null);
    }
  }, [open, preSelectedEmployeeId, reset]);

  function formatCurrency(amount: number): string {
    return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function onSubmit(data: CreateSalaryFormData) {
    setError(null);

    try {
      await createSalary.mutateAsync({
        employeeId: data.employeeId,
        paidAmount: data.paidAmount,
        month: data.month,
        year: data.year,
      });
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError(String((err as { message: string }).message));
      } else {
        setError('Failed to create salary record');
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
      title="Create Salary Record"
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
            disabled={createSalary.isPending}
            onClick={() => handleSubmit(onSubmit)()}
          >
            {createSalary.isPending ? 'Creating\u2026' : 'Create'}
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
          <label htmlFor="salary-employee" className="mb-1.5 block text-sm font-medium text-slate-700">
            Employee <span className="text-red-500">*</span>
          </label>
          <select
            id="salary-employee"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.employeeId ? 'border-red-400' : 'border-slate-300'
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
          {errors.employeeId && <p className="mt-1 text-xs text-red-500">{errors.employeeId.message}</p>}
        </div>

        {selectedEmployee && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500">Base Salary (Fixed)</span>
                <p className="font-semibold text-slate-800">{formatCurrency(baseSalary)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Remaining after payment</span>
                <p className={`font-semibold ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="salary-paid" className="mb-1.5 block text-sm font-medium text-slate-700">
            Paid Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="salary-paid"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 10000"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.paidAmount ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('paidAmount', { valueAsNumber: true })}
          />
          {errors.paidAmount && <p className="mt-1 text-xs text-red-500">{errors.paidAmount.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="salary-month" className="mb-1.5 block text-sm font-medium text-slate-700">
              Month <span className="text-red-500">*</span>
            </label>
            <select
              id="salary-month"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('month', { valueAsNumber: true })}
            >
              {MONTHS.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="salary-year" className="mb-1.5 block text-sm font-medium text-slate-700">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              id="salary-year"
              type="number"
              min="2000"
              max="2100"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.year ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('year', { valueAsNumber: true })}
            />
            {errors.year && <p className="mt-1 text-xs text-red-500">{errors.year.message}</p>}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
