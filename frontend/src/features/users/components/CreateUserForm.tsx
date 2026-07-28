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
    watch,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'employee' },
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
            {createUser.isPending ? 'Creating\u2026' : 'Create User'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="create-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="create-name"
            type="text"
            placeholder="John Doe"
            className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-destructive' : 'border-input'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="create-email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="create-email"
            type="email"
            placeholder="user@restaurant.com"
            className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.email ? 'border-destructive' : 'border-input'
            }`}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="create-password" className="mb-1.5 block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="create-password"
            type="password"
            placeholder="At least 8 characters"
            className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.password ? 'border-destructive' : 'border-input'
            }`}
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="create-role" className="mb-1.5 block text-sm font-medium text-foreground">
            Role
          </label>
          <select
            id="create-role"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('role')}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          {errors.role && <p className="mt-1 text-xs text-destructive">{errors.role.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Permissions
          </label>
          <PermissionsEditor value={permissions} onChange={setPermissions} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Grant module-level permissions for this user. Admin accounts bypass all permission checks.
          </p>
        </div>
      </form>
    </Dialog>
  );
}
