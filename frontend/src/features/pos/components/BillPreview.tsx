'use client';

import { usePosStore } from '../store';

export default function BillPreview() {
  const items = usePosStore((s) => s.items);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const discountPercent = usePosStore((s) => s.discountPercent);
  const cashTendered = usePosStore((s) => s.cashTendered);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawDiscount = couponType === 'percentage' ? subtotal * (couponDiscount / 100) : couponDiscount;
  const couponDiscountAmount = Math.min(rawDiscount, subtotal);
  const manualDiscountAmount = discountPercent > 0 ? Math.round((subtotal * (discountPercent / 100)) * 100) / 100 : 0;
  const totalDiscount = Math.min(couponDiscountAmount + manualDiscountAmount, subtotal);
  const taxAmount = items.reduce((sum, i) => sum + Math.round(i.lineTotal * (i.vatRate / 100) * 100) / 100, 0);
  const grandTotal = Math.round((subtotal - totalDiscount) * 100) / 100;
  const tendered = parseFloat(cashTendered) || 0;
  const changeAmount = tendered >= grandTotal ? Math.round((tendered - grandTotal) * 100) / 100 : 0;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>Subtotal</span>
        <span>BDT {subtotal.toFixed(2)}</span>
      </div>

      {couponDiscountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Coupon</span>
          <span>-BDT {couponDiscountAmount.toFixed(2)}</span>
        </div>
      )}

      {manualDiscountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount ({discountPercent}%)</span>
          <span>-BDT {manualDiscountAmount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between text-slate-600">
        <span>VAT</span>
        <span>BDT {taxAmount.toFixed(2)}</span>
      </div>

      {tendered > 0 && (
        <div className="flex justify-between text-slate-600">
          <span>Cash Tendered</span>
          <span>BDT {tendered.toFixed(2)}</span>
        </div>
      )}

      {changeAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Change</span>
          <span>BDT {changeAmount.toFixed(2)}</span>
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
