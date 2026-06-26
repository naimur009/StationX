'use client';

import { usePosStore } from '../store';
import type { PaymentMethod } from '../schema';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'split', label: 'Split' },
];

export default function PaymentMethodSelector() {
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const paymentSplits = usePosStore((s) => s.paymentSplits);
  const setPaymentMethod = usePosStore((s) => s.setPaymentMethod);
  const setPaymentSplits = usePosStore((s) => s.setPaymentSplits);
  const grandTotal = usePosStore((s) => {
    const subtotal = s.items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discount = s.couponType === 'percentage'
      ? subtotal * (s.couponDiscount / 100)
      : s.couponDiscount;
    return Math.round((subtotal - discount) * 100) / 100;
  });

  function handleSplitMethodChange(index: number, method: PaymentMethod) {
    const updated = paymentSplits.map((s, i) => (i === index ? { ...s, method } : s));
    setPaymentSplits(updated);
  }

  function handleSplitAmountChange(index: number, amount: string) {
    const value = parseFloat(amount) || 0;
    const updated = paymentSplits.map((s, i) => (i === index ? { ...s, amount: value } : s));
    setPaymentSplits(updated);
  }

  function addSplit() {
    const usedMethods = paymentSplits.map((s) => s.method);
    const nextMethod = METHODS.find((m) => m.value !== 'split' && !usedMethods.includes(m.value))?.value ?? 'cash';
    setPaymentSplits([...paymentSplits, { method: nextMethod, amount: 0 }]);
  }

  function removeSplit(index: number) {
    setPaymentSplits(paymentSplits.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
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

      {paymentMethod === 'split' && (
        <div className="space-y-2 rounded-xl border border-border bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Split Payments</p>
          {paymentSplits.map((split, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={split.method}
                onChange={(e) => handleSplitMethodChange(i, e.target.value as PaymentMethod)}
                className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs"
              >
                {METHODS.filter((m) => m.value !== 'split').map((m) => (
                  <option key={m.value} value={m.value} disabled={paymentSplits.some((s, si) => si !== i && s.method === m.value)}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={split.amount || ''}
                onChange={(e) => handleSplitAmountChange(i, e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              {paymentSplits.length > 2 && (
                <button onClick={() => removeSplit(i)} className="text-xs text-red-500 hover:text-red-700">
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSplit}
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            + Add another method
          </button>
          {paymentSplits.length >= 2 && (
            <p className="text-xs text-slate-500">
              Total: BDT {paymentSplits.reduce((sum, s) => sum + s.amount, 0).toFixed(2)} / BDT {grandTotal.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
