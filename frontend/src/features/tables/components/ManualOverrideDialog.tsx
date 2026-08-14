'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateTableStatus, type TableResponse } from '../api';
import { manualOverrideSchema, type ManualOverrideFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface ManualOverrideDialogProps {
  open: boolean;
  table: TableResponse | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Available (free the table)',
  booked: 'Occupied (block the table)',
  maintenance: 'Out of Service (mark unavailable)',
};

const STATUS_STYLE: Record<string, { card: string; dot: string }> = {
  available: { card: 'border-green-400 bg-green-50 text-green-800', dot: 'border-green-500 bg-green-500' },
  booked: { card: 'border-red-400 bg-red-50 text-red-800', dot: 'border-red-500 bg-red-500' },
  maintenance: { card: 'border-slate-400 bg-slate-100 text-slate-800', dot: 'border-slate-500 bg-slate-500' },
};

export default function ManualOverrideDialog({ open, table, onClose }: ManualOverrideDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const updateStatus = useUpdateTableStatus();
  const isDecoupling = table?.status === 'booked' && table?.bookedBy === 'order' && table?.currentOrderId;

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ManualOverrideFormData>({
    resolver: zodResolver(manualOverrideSchema),
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (open && table) {
      const opposite = table.status === 'available' ? 'booked' : 'available';
      reset({ status: opposite });
      setError(null);
    }
  }, [open, table, reset]);

  async function onSubmit(data: ManualOverrideFormData) {
    if (!table) return;
    try {
      setError(null);
      await updateStatus.mutateAsync({ id: table.id, status: data.status });
      onClose();
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Failed to update table status');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Override Table ${table?.tableNumber}`} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isDecoupling && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This table is currently attached to an active order. Changing its status will
            decouple it from that order. The order will retain its reference for billing but
            the table will be freed for reuse.
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            New Status
          </label>
          <div className="flex flex-col gap-2">
            {(['available', 'booked', 'maintenance'] as const).map((s) => {
              const isCurrent = table?.status === s;
              const style = STATUS_STYLE[s];
              return (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    selectedStatus === s
                      ? style.card
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={s}
                    checked={selectedStatus === s}
                    onChange={() => setValue('status', s)}
                    className="sr-only"
                  />
                  <span
                    className={`inline-block h-4 w-4 rounded-full border-2 ${
                      selectedStatus === s ? style.dot : 'border-slate-300'
                    }`}
                  />
                  <span className="font-medium">{STATUS_LABELS[s]}</span>
                  {isCurrent && <span className="ml-auto text-xs text-slate-400">(current)</span>}
                </label>
              );
            })}
          </div>
          {errors.status && (
            <p className="mt-1 text-xs text-red-500">{errors.status.message}</p>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={selectedStatus === 'booked' ? 'warning' : selectedStatus === 'maintenance' ? 'secondary' : 'primary'}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? 'Updating...' : 'Confirm'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
