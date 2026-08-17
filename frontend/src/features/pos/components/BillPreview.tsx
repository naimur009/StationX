'use client';

import type { PosTotals } from '../totals';

interface BillPreviewProps {
  totals: PosTotals;
  discountPercent: number;
}

export default function BillPreview({ totals, discountPercent }: BillPreviewProps) {
  const { subtotal, taxAmount, totalDiscount, grandTotal } = totals;

  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between text-slate-600">
        <span>Subtotal</span>
        <span>৳{subtotal.toFixed(2)}</span>
      </div>

      {taxAmount > 0 && (
        <div className="flex justify-between text-slate-600">
          <span>VAT</span>
          <span>৳{taxAmount.toFixed(2)}</span>
        </div>
      )}

      {totalDiscount > 0 && (
        <div className="flex justify-between font-semibold text-green-600">
          <span>Discount {discountPercent > 0 ? `(${discountPercent}%)` : ''}</span>
          <span>-৳{totalDiscount.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 text-sm font-bold text-slate-800">
        <span>Total</span>
        <span>৳{grandTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}