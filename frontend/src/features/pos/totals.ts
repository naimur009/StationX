import type { CartItem } from './schema';

export interface PosTotals {
  subtotal: number;
  couponDiscountAmount: number;
  manualDiscountAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalWithVat: number;
  totalDiscount: number;
  grandTotal: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computePosTotals(
  items: CartItem[],
  couponDiscount: number,
  couponType: 'flat' | 'percentage' | null,
  couponMaxDiscount: number | null,
  discountPercent: number
): PosTotals {
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const rawCouponDiscount = couponType === 'percentage' ? subtotal * (couponDiscount / 100) : couponDiscount;
  const couponDiscountAmount = couponMaxDiscount != null ? Math.min(rawCouponDiscount, couponMaxDiscount) : rawCouponDiscount;
  const manualDiscountAmount = discountPercent > 0 ? round2(subtotal * (discountPercent / 100)) : 0;
  const discountAmount = round2(couponDiscountAmount + manualDiscountAmount);
  const taxAmount = round2(items.reduce((sum, i) => sum + round2(i.lineTotal * ((i.vatRate || 0) / 100)), 0));
  const totalWithVat = round2(subtotal + taxAmount);
  const totalDiscount = round2(discountAmount + taxAmount);
  const grandTotal = round2(totalWithVat - totalDiscount);

  return {
    subtotal,
    couponDiscountAmount,
    manualDiscountAmount,
    discountAmount,
    taxAmount,
    totalWithVat,
    totalDiscount,
    grandTotal,
  };
}
