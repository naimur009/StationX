'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateUser } from '../api';
import { createUserSchema, type CreateUserFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import PermissionsEditor from './PermissionsEditor';

interface CreateUserFormProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateUserForm({ open, onClose }: CreateUserFormProps) {
  const [permissions, setPermissions] = useState<{ module: string; actions: string[] }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  async function onSubmit(data: CreateUserFormData) {
    setError(null);

    try {
      await createUser.mutateAsync({
        ...data,
        permissions,
      });
      reset();
      setPermissions([]);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to create user');
      }
    }
  }

  function handleClose() {
    reset();
    setPermissions([]);
    setError(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Create User"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            variant="primary"
            size="md"
            disabled={createUser.isPending}
          >
            {createUser.isPending ? 'Creating…' : 'Create User'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="create-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="create-name"
            type="text"
            placeholder="John Doe"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="create-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="create-email"
            type="email"
            placeholder="user@restaurant.com"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.email ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="create-password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="create-password"
            type="password"
            placeholder="At least 8 characters"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.password ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="create-role" className="mb-1.5 block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="create-role"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.role ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('role')}
          >
            <option value="">Select a role</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
            <option value="chief">Chief</option>
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Permissions
          </label>
          <PermissionsEditor value={permissions} onChange={setPermissions} />
          <p className="mt-1.5 text-xs text-slate-400">
            Grant module-level permissions for this user. Admin accounts bypass all permission checks.
          </p>
        </div>
      </form>
    </Dialog>
  );
}
