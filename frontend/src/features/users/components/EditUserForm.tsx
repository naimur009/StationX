'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateUser, useUpdatePermissions, useAdminResetPassword, type UserResponse } from '../api';
import { updateUserSchema, type UpdateUserFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { KeyRound } from 'lucide-react';
import PermissionsEditor from './PermissionsEditor';

interface EditUserFormProps {
  user: UserResponse | null;
  onClose: () => void;
}

export default function EditUserForm({ user, onClose }: EditUserFormProps) {
  const [permissions, setPermissions] = useState<{ module: string; actions: string[]; impliedBy?: string }[]>([]);
  const [impliedPermissions, setImpliedPermissions] = useState<{ module: string; actions: string[]; impliedBy?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const updateUser = useUpdateUser();
  const updatePermissions = useUpdatePermissions();
  const adminResetPassword = useAdminResetPassword();

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
      reset(formData);
      const allPerms = Array.isArray(user.permissions) ? user.permissions : [];
      setPermissions(allPerms.filter((p) => p.impliedBy === undefined));
      setImpliedPermissions(allPerms.filter((p) => p.impliedBy !== undefined));
      setError(null);
      setShowPasswordInput(false);
      setNewPassword('');
      setPasswordError(null);
    }
  }, [user, reset]);

  async function onSubmit(data: UpdateUserFormData) {
    if (!user) return;
    setError(null);

    const updatePayload: { name?: string; email?: string } = {
      name: data.name || undefined,
      email: data.email ?? undefined,
    };

    try {
      await updateUser.mutateAsync({ id: user.id, ...updatePayload });
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Failed to update user';
      setError(msg);
      return;
    }

    const explicitPerms = permissions.map(({ module, actions }) => ({ module, actions }));
    try {
      await updatePermissions.mutateAsync({ id: user.id, permissions: explicitPerms });
    } catch (err) {
      const msg = err instanceof AppError ? err.message : 'Permissions save failed. Please try again.';
      console.error('[EditUserForm] Permissions update failed for user:', user.id, err);
      setError(msg);
      return;
    }

    if (newPassword) {
      try {
        await adminResetPassword.mutateAsync({ id: user.id, newPassword });
      } catch (err) {
        const msg = err instanceof AppError ? err.message : 'Failed to reset password';
        setError(msg);
        return;
      }
    }

    onClose();
  }

  function handleClose() {
    reset();
    setPermissions([]);
    setImpliedPermissions([]);
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
      size="xl"
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
            {updateUser.isPending || updatePermissions.isPending ? 'Saving\u2026' : 'Save Changes'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.name ? 'border-destructive' : 'border-input'
            }`}
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="edit-email"
            type="email"
            className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring ${
              errors.email ? 'border-destructive' : 'border-input'
            }`}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Permissions
          </label>
          <PermissionsEditor value={permissions} impliedPermissions={impliedPermissions} onChange={setPermissions} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Grant module-level permissions for this user. Admin accounts bypass all permission checks.
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Password</span>
            </div>
            {!showPasswordInput && (
              <Button type="button" variant="ghost" size="xs" onClick={() => setShowPasswordInput(true)}>
                Reset Password
              </Button>
            )}
          </div>
          {showPasswordInput && (
            <div className="mt-3">
              {passwordError && (
                <p className="mb-2 text-xs text-destructive">{passwordError}</p>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    if (newPassword.length < 8) {
                      setPasswordError('Password must be at least 8 characters');
                      return;
                    }
                    setShowPasswordInput(false);
                  }}
                >
                  Set
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                This will immediately change the user&rsquo;s password. No current password confirmation needed.
              </p>
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
