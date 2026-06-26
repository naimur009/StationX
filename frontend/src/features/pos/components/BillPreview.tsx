'use client';

import { usePosStore } from '../store';

export default function BillPreview() {
  const items = usePosStore((s) => s.items);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawDiscount = couponType === 'percentage' ? subtotal * (couponDiscount / 100) : couponDiscount;
  const discountAmount = Math.min(rawDiscount, subtotal);
  const taxAmount = 0;
  const grandTotal = Math.round((subtotal - discountAmount + taxAmount) * 100) / 100;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>Subtotal</span>
        <span>BDT {subtotal.toFixed(2)}</span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount</span>
          <span>-BDT {discountAmount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between text-slate-600">
        <span>Tax (VAT)</span>
        <span>BDT {taxAmount.toFixed(2)}</span>
      </div>

      <div className="border-t border-border pt-2">
        <div className="flex justify-between text-base font-bold text-slate-800">
          <span>Total</span>
          <span>BDT {grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
