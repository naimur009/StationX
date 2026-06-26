'use client';

import { useState } from 'react';
import { usePosStore } from '../store';
import { useCheckCoupon } from '../api';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { AppError } from '@/lib/utils';

export default function CouponInput() {
  const couponCode = usePosStore((s) => s.couponCode);
  const couponDiscount = usePosStore((s) => s.couponDiscount);
  const couponType = usePosStore((s) => s.couponType);
  const setCoupon = usePosStore((s) => s.setCoupon);
  const clearCoupon = usePosStore((s) => s.clearCoupon);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { mutateAsync, isPending } = useCheckCoupon();

  async function handleApply() {
    setError('');
    if (!code.trim()) return;
    try {
      const result = await mutateAsync(code.trim());
      setCoupon(code.trim(), result.data.value, result.data.type);
      setCode('');
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Invalid coupon');
    }
  }

  if (couponCode) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm">
        <span className="font-medium text-green-700">{couponCode}</span>
        <span className="text-green-600">
          {couponType === 'percentage' ? `${couponDiscount}% off` : `BDT ${couponDiscount.toFixed(2)} off`}
        </span>
        <button onClick={clearCoupon} className="text-green-500 hover:text-green-700">
          <X className="h-4 w-4" />
        </button>
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
          className="flex-1"
        />
        <button
          onClick={handleApply}
          disabled={isPending || !code.trim()}
          className="rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? '...' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
