'use client';

import { useState } from 'react';
import { useDeactivateUser, type UserResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DeactivateConfirmDialogProps {
  user: UserResponse | null;
  onClose: () => void;
}

export default function DeactivateConfirmDialog({ user, onClose }: DeactivateConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deactivateUser = useDeactivateUser();

  async function handleConfirm() {
    if (!user) return;
    setError(null);

    try {
      await deactivateUser.mutateAsync(user.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to deactivate user');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!user) return null;

  return (
    <Dialog
      open={!!user}
      onClose={handleClose}
      title="Deactivate User"
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="md"
            onClick={handleConfirm}
            disabled={deactivateUser.isPending}
          >
            {deactivateUser.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          Are you sure you want to deactivate{' '}
          <span className="font-semibold text-slate-800">{user.name}</span>?
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>{user.name}</span>
            <Badge variant={user.isActive ? 'green' : 'slate'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="mt-1 text-slate-500">{user.email}</p>
          <p className="text-xs capitalize text-slate-400">{user.role}</p>
        </div>

        <p className="text-xs text-slate-400">
          Deactivated users will not be able to log in and will be visually distinguished
          in the users list. They can be reactivated at any time.
        </p>
      </div>
    </Dialog>
  );
}
