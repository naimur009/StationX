'use client';

import { useState } from 'react';
import { useDeactivateUser, usePermanentDeleteUser, type UserResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DeactivateConfirmDialogProps {
  user: UserResponse | null;
  permanent?: boolean;
  onClose: () => void;
}

export default function DeactivateConfirmDialog({ user, permanent = false, onClose }: DeactivateConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deactivateUser = useDeactivateUser();
  const permanentDeleteUser = usePermanentDeleteUser();

  const isPending = permanent ? permanentDeleteUser.isPending : deactivateUser.isPending;

  async function handleConfirm() {
    if (!user) return;
    setError(null);

    try {
      if (permanent) {
        await permanentDeleteUser.mutateAsync(user.id);
      } else {
        await deactivateUser.mutateAsync(user.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(permanent ? 'Failed to delete user' : 'Failed to deactivate user');
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
      title={permanent ? 'Delete User Permanently' : 'Deactivate User'}
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
            disabled={isPending}
          >
            {isPending
              ? (permanent ? 'Deleting\u2026' : 'Deactivating\u2026')
              : (permanent ? 'Delete Permanently' : 'Deactivate')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <p className="text-sm text-foreground">
          {permanent
            ? 'Are you sure you want to permanently delete'
            : 'Are you sure you want to deactivate'}{' '}
          <span className="font-semibold text-foreground">{user.name}</span>?
        </p>

        <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="text-foreground">{user.name}</span>
            <Badge variant={user.isActive ? 'green' : 'slate'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{user.email}</p>
          <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
        </div>

        {permanent ? (
          <p className="text-xs text-destructive">
            This action cannot be undone. The user will be permanently removed from the system.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Deactivated users will not be able to log in and will be visually distinguished
            in the users list. They can be reactivated at any time.
          </p>
        )}
      </div>
    </Dialog>
  );
}
