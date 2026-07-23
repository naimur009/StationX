'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateTable, type TableResponse } from '../api';
import { updateTableSchema, type UpdateTableFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppError } from '@/lib/utils';

interface EditTableDialogProps {
  open: boolean;
  table: TableResponse | null;
  onClose: () => void;
}

export default function EditTableDialog({ open, table, onClose }: EditTableDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const updateTable = useUpdateTable();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateTableFormData>({
    resolver: zodResolver(updateTableSchema),
  });

  useEffect(() => {
    if (open && table) {
      reset({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
      });
      setError(null);
    }
  }, [open, table, reset]);

  async function onSubmit(data: UpdateTableFormData) {
    if (!table) return;
    try {
      setError(null);
      await updateTable.mutateAsync({ id: table.id, ...data });
      onClose();
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Failed to update table');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Table" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Table Number
          </label>
          <Input
            {...register('tableNumber')}
            placeholder="e.g. 12, VIP-2"
            error={!!errors.tableNumber}
          />
          {errors.tableNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.tableNumber.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Capacity <span className="text-slate-400">(optional)</span>
          </label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 4"
            {...register('capacity')}
            error={!!errors.capacity}
          />
          {errors.capacity && (
            <p className="mt-1 text-xs text-red-500">{errors.capacity.message}</p>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateTable.isPending}>
            {updateTable.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
