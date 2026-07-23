'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTable } from '../api';
import { createTableSchema, type CreateTableFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppError } from '@/lib/utils';

interface CreateTableDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateTableDialog({ open, onClose }: CreateTableDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const createTable = useCreateTable();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTableFormData>({
    resolver: zodResolver(createTableSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ tableNumber: '', capacity: null });
      setError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: CreateTableFormData) {
    try {
      setError(null);
      await createTable.mutateAsync(data);
      onClose();
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Failed to create table');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add Table" size="sm">
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
          <Button type="submit" disabled={createTable.isPending}>
            {createTable.isPending ? 'Adding...' : 'Add Table'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
