'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import type { OrderDetail } from '../api';

const METHODS = ['cash', 'card', 'bkash', 'nagad'] as const;

interface Props {
  open: boolean;
  order: OrderDetail;
  onClose: () => void;
  onCapture: (data: {
    paymentStatus: 'paid';
    status: 'completed';
    payment: { method: string; transactionId?: string };
    cashTendered?: number;
    changeAmount?: number;
  }) => void;
  isLoading: boolean;
}

export default function OrderPaymentCaptureDialog({ open, order, onClose, onCapture, isLoading }: Props) {
  const [method, setMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [cashTendered, setCashTendered] = useState('');

  if (!open) return null;

  const tendered = parseFloat(cashTendered) || 0;
  const changeAmount = tendered >= order.grandTotal ? Math.round((tendered - order.grandTotal) * 100) / 100 : 0;

  const handleCapture = () => {
    const payload: {
      paymentStatus: 'paid';
      status: 'completed';
      payment: { method: string; transactionId?: string };
      cashTendered?: number;
      changeAmount?: number;
    } = {
      paymentStatus: 'paid',
      status: 'completed',
      payment: { method },
    };

    if (transactionId) {
      payload.payment.transactionId = transactionId;
    }

    if (method === 'cash' && tendered > 0) {
      payload.cashTendered = tendered;
      if (changeAmount > 0) {
        payload.changeAmount = changeAmount;
      }
    }

    onCapture(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Capture Payment"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            disabled={
              isLoading ||
              (method === 'cash' && (!cashTendered || parseFloat(cashTendered) < order.grandTotal))
            }
            onClick={handleCapture}
          >
            {isLoading ? 'Capturing...' : 'Capture Payment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{order.orderNumber}</span>
          <span className="mx-2 text-slate-300">&mdash;</span>
          Due amount <span className="font-bold text-slate-800">BDT {order.grandTotal.toFixed(2)}</span>
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                  method === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {method !== 'cash' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Transaction ID
            </label>
            <Input
              placeholder="Transaction ID (last 3-4 digits)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              maxLength={20}
            />
          </div>
        )}

        {method === 'cash' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash Tendered
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Amount received"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
            />
            {tendered > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm">
                <span className="font-medium text-green-700">Change</span>
                <span className="font-bold text-green-700">BDT {changeAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}