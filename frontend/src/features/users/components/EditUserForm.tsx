'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateUser, useUpdatePermissions, type UserResponse } from '../api';
import { updateUserSchema, type UpdateUserFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import PermissionsEditor from './PermissionsEditor';

interface EditUserFormProps {
  user: UserResponse | null;
  onClose: () => void;
}

export default function EditUserForm({ user, onClose }: EditUserFormProps) {
  const [permissions, setPermissions] = useState<{ module: string; actions: string[] }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const updateUser = useUpdateUser();
  const updatePermissions = useUpdatePermissions();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    if (user) {
      const formData: UpdateUserFormData = {
        name: user.name,
        email: user.email,
      };
      if (user.role !== 'admin') {
        formData.role = user.role as 'manager' | 'employee';
      }
      reset(formData);
      setPermissions(user.permissions);
      setError(null);
    }
  }, [user, reset]);

  async function onSubmit(data: UpdateUserFormData) {
    if (!user) return;
    setError(null);

    const updatePayload: { name: string; email: string; role?: string } = {
      name: data.name,
      email: data.email,
    };
    if (data.role) {
      updatePayload.role = data.role;
    }

    try {
      await updateUser.mutateAsync({ id: user.id, ...updatePayload });
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Failed to update user';
      setError(msg);
      return;
    }

    try {
      await updatePermissions.mutateAsync({ id: user.id, permissions });
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Permissions save failed. Please try again.';
      console.error('[EditUserForm] Permissions update failed for user:', user.id, err);
      setError(msg);
      return;
    }

    onClose();
  }

  function handleClose() {
    reset();
    setPermissions([]);
    setError(null);
    onClose();
  }

  if (!user) return null;

  function handleFormSubmit() {
    handleSubmit(onSubmit)();
  }

  return (
    <Dialog
      open={!!user}
      onClose={handleClose}
      title="Edit User"
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
            disabled={updateUser.isPending || updatePermissions.isPending}
            onClick={handleFormSubmit}
          >
            {updateUser.isPending || updatePermissions.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="edit-email"
            type="email"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.email ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-role" className="mb-1.5 block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="edit-role"
            disabled={user.role === 'admin'}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-ring ${
              user.role === 'admin' ? 'cursor-not-allowed opacity-60' : ''
            } ${errors.role ? 'border-red-400' : 'border-slate-300'}`}
            {...register('role')}
          >
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
            {user.role === 'admin' && <option value="admin">Admin</option>}
          </select>
          {user.role === 'admin' && (
            <p className="mt-1 text-xs text-slate-400">
              Admin role is read-only and cannot be changed through this form.
            </p>
          )}
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Passwords cannot be changed through this form. Use the Forgot Password flow or create a new account.
        </div>
      </form>
    </Dialog>
  );
}
