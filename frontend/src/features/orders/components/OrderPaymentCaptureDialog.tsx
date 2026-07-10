'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-slate-800">Capture Payment</h2>
        <p className="mt-1 text-sm text-slate-500">
          {order.orderNumber} &mdash; BDT {order.grandTotal.toFixed(2)}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payment Method
            </label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    method === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {method !== 'cash' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
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

        <div className="mt-6 flex justify-end gap-3">
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
        </div>
      </div>
    </div>
  );
}
