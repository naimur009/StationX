'use client';

import { useState } from 'react';
import { useDeleteTable, type TableResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import { AppError } from '@/lib/utils';

interface DeleteTableDialogProps {
  open: boolean;
  table: TableResponse | null;
  onClose: () => void;
}

export default function DeleteTableDialog({ open, table, onClose }: DeleteTableDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteTable = useDeleteTable();

  async function handleDelete() {
    if (!table) return;
    try {
      setError(null);
      await deleteTable.mutateAsync(table.id);
      onClose();
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Failed to delete table');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Table"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <PermissionGate module="tables" action="delete">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTable.isPending}
            >
              {deleteTable.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </PermissionGate>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Are you sure you want to delete table <strong>{table?.tableNumber}</strong>?
        This action cannot be undone.
      </p>
      {table?.status === 'booked' && (
        <p className="mt-2 text-xs text-amber-600">
          This table is currently booked. Deletion will be blocked if an active order references it.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </Dialog>
  );
}
