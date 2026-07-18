'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEmployee, useUpdateEmployee, type EmployeeResponse } from '../api';
import { createEmployeeSchema, updateEmployeeSchema, type CreateEmployeeFormData, type UpdateEmployeeFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface EmployeeFormProps {
  open: boolean;
  employee: EmployeeResponse | null;
  onClose: () => void;
}

export default function EmployeeForm({ open, employee, onClose }: EmployeeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isEditing = !!employee;

  const createForm = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { name: '', phone: '', address: '', baseSalary: 0 },
  });

  const editForm = useForm<UpdateEmployeeFormData>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: { name: '', phone: '', address: '', baseSalary: 0 },
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (employee) {
      editForm.reset({
        name: employee.name,
        phone: employee.phone,
        address: employee.address || '',
        baseSalary: employee.baseSalary,
      });
    } else {
      createForm.reset({ name: '', phone: '', address: '', baseSalary: 0 });
    }
  }, [open, employee]);

  async function handleCreate(data: CreateEmployeeFormData) {
    setError(null);
    try {
      await createEmployee.mutateAsync({
        name: data.name,
        phone: data.phone,
        address: data.address || undefined,
        baseSalary: data.baseSalary || undefined,
      });
      createForm.reset();
      onClose();
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Failed to save employee');
    }
  }

  async function handleEdit(data: UpdateEmployeeFormData) {
    if (!employee) return;
    setError(null);
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        name: data.name,
        phone: data.phone,
        address: data.address || undefined,
        baseSalary: data.baseSalary || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'Failed to save employee');
    }
  }

  function handleClose() {
    createForm.reset();
    editForm.reset();
    setError(null);
    onClose();
  }

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  const fields = {
    name: isEditing ? editForm.register('name') : createForm.register('name'),
    phone: isEditing ? editForm.register('phone') : createForm.register('phone'),
    address: isEditing ? editForm.register('address') : createForm.register('address'),
    baseSalary: isEditing ? editForm.register('baseSalary', { valueAsNumber: true }) : createForm.register('baseSalary', { valueAsNumber: true }),
  };

  const fieldErrors = isEditing ? editForm.formState.errors : createForm.formState.errors;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Employee' : 'Create Employee'}
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
            onClick={() => (isEditing ? editForm.handleSubmit(handleEdit)() : createForm.handleSubmit(handleCreate)())}
          >
            {isPending ? 'Saving\u2026' : isEditing ? 'Save Changes' : 'Create Employee'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="emp-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="emp-name"
              type="text"
              placeholder="John Doe"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.name ? 'border-red-400' : 'border-slate-300'
              }`}
              {...fields.name}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="emp-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="emp-phone"
              type="text"
              placeholder="+8801XXXXXXXXX"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.phone ? 'border-red-400' : 'border-slate-300'
              }`}
              {...fields.phone}
            />
            {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="emp-base-salary" className="mb-1.5 block text-sm font-medium text-slate-700">
              Base Salary (Monthly)
            </label>
            <input
              id="emp-base-salary"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 10000"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.baseSalary ? 'border-red-400' : 'border-slate-300'
              }`}
              {...fields.baseSalary}
            />
            {fieldErrors.baseSalary && <p className="mt-1 text-xs text-red-500">{fieldErrors.baseSalary.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="emp-address" className="mb-1.5 block text-sm font-medium text-slate-700">
            Address
          </label>
          <input
            id="emp-address"
            type="text"
            placeholder="123 Main Street, Dhaka"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              fieldErrors.address ? 'border-red-400' : 'border-slate-300'
            }`}
            {...fields.address}
          />
          {fieldErrors.address && <p className="mt-1 text-xs text-red-500">{fieldErrors.address.message}</p>}
        </div>
      </form>
    </Dialog>
  );
}
