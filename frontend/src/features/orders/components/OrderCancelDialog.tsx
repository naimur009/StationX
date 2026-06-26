'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OrderCancelDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isCompleted: boolean;
  isLoading: boolean;
}

export default function OrderCancelDialog({
  open,
  onClose,
  onConfirm,
  isCompleted,
  isLoading,
}: OrderCancelDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Please provide a reason (at least 3 characters).');
      return;
    }
    if (trimmed.length > 500) {
      setError('Reason must not exceed 500 characters.');
      return;
    }
    setReason('');
    setError('');
    onConfirm(trimmed);
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isCompleted ? 'Void / Refund Order' : 'Cancel Order'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={isLoading}>
            Go Back
          </Button>
          <Button
            variant={isCompleted ? 'destructive' : 'warning'}
            size="md"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? 'Processing...' : isCompleted ? 'Void Order' : 'Cancel Order'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {isCompleted
            ? 'This acknowledges a refund/void of a completed order. A reason is required.'
            : 'Cancel this pending order. A reason is required.'}
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Cancel reason <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. Customer changed their mind"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            error={!!error}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          <p className="mt-1 text-xs text-slate-400">{reason.length}/500</p>
        </div>
      </div>
    </Dialog>
  );
}
