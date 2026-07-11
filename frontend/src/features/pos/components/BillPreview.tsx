'use client';

import { usePosStore } from '../store';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function BillPreview() {
  const items = usePosStore((s) => s.items);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const discountPercent = usePosStore((s) => s.discountPercent);

  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const rawDiscount = couponType === 'percentage' ? round2(subtotal * (couponDiscount / 100)) : couponDiscount;
  const couponDiscountAmount = Math.min(rawDiscount, subtotal);
  const manualDiscountAmount = discountPercent > 0 ? round2(subtotal * (discountPercent / 100)) : 0;
  const discountAmount = Math.min(couponDiscountAmount + manualDiscountAmount, subtotal);
  const taxAmount = round2(items.reduce((sum, i) => sum + round2(i.lineTotal * ((i.vatRate || 0) / 100)), 0));
  
  const totalWithVat = round2(subtotal + taxAmount);
  const totalDiscount = round2(discountAmount + taxAmount);
  const grandTotal = round2(totalWithVat - totalDiscount);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>Subtotal</span>
        <span>BDT {subtotal.toFixed(2)}</span>
      </div>

      {taxAmount > 0 && (
        <div className="flex justify-between text-slate-600">
          <span>VAT</span>
          <span>BDT {taxAmount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between text-slate-800 font-bold">
        <span>Subtotal + VAT</span>
        <span>BDT {totalWithVat.toFixed(2)}</span>
      </div>

      {totalDiscount > 0 && (
        <div className="flex justify-between text-green-600 font-bold">
          <span>Discount</span>
          <span>-BDT {totalDiscount.toFixed(2)}</span>
        </div>
      )}

      <div className="border-t border-border pt-2">
        <div className="flex justify-between text-base font-bold text-slate-800">
          <span>Total</span>
          <span>BDT {grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
