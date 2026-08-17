'use client';

import { useState } from 'react';
import { usePosStore } from '../store';
import { useCheckCoupon } from '../api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X } from 'lucide-react';

const COUPON_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Coupon not found',
  DISABLED: 'This coupon is disabled',
  NOT_YET_VALID: 'Coupon is not yet valid',
  EXPIRED: 'Coupon has expired',
  BELOW_MIN_ORDER: 'Order does not meet minimum amount',
  USAGE_LIMIT_REACHED: 'Coupon usage limit reached',
};

export default function CouponInput() {
  const couponCode = usePosStore((s) => s.couponCode);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const items = usePosStore((s) => s.items);
  const setCoupon = usePosStore((s) => s.setCoupon);
  const clearCoupon = usePosStore((s) => s.clearCoupon);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { mutateAsync, isPending } = useCheckCoupon();

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  async function handleApply() {
    setError('');
    if (!code.trim()) return;
    try {
      const result = await mutateAsync({ code: code.trim(), subtotal });

      if (!result.data.valid) {
        setError(COUPON_ERROR_MESSAGES[result.data.reason || ''] || 'Invalid coupon');
        return;
      }

      setCoupon(code.trim(), result.data.value ?? 0, result.data.discountType || 'flat', result.data.maxDiscountAmount ?? null);
      setCode('');
    } catch {
      setError('Failed to validate coupon');
    }
  }

  if (couponCode) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 shrink-0 text-green-600" />
          <span className="truncate font-semibold text-green-700">{couponCode}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-medium text-green-600">
            {couponType === 'percentage' ? `${couponDiscount}% off` : `৳${couponDiscount.toFixed(2)} off`}
          </span>
          <button
            onClick={clearCoupon}
            className="rounded p-0.5 text-green-500 transition-colors hover:bg-green-100 hover:text-green-700"
            aria-label="Remove coupon"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          placeholder="Coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          className="h-9 flex-1 text-[13px]"
        />
        <Button
          onClick={handleApply}
          disabled={isPending || !code.trim()}
          className="h-9 px-3.5 text-xs font-semibold sm:px-4"
        >
          {isPending ? '...' : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}