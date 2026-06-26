'use client';

import { usePosStore } from '../store';
import type { PaymentMethod } from '../schema';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
];

export default function PaymentMethodSelector() {
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const setPaymentMethod = usePosStore((s) => s.setPaymentMethod);

  return (
    <div className="flex flex-wrap gap-2">
      {METHODS.map((m) => (
        <button
          key={m.value}
          onClick={() => setPaymentMethod(m.value)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
            paymentMethod === m.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
