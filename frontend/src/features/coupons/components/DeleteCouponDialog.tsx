'use client';

import { useState } from 'react';
import { useDeleteCoupon, useToggleCoupon, COUPON_STATUS_CONFIG, type CouponResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppError } from '@/lib/utils';

interface DeleteCouponDialogProps {
  coupon: CouponResponse | null;
  onClose: () => void;
}

export default function DeleteCouponDialog({ coupon, onClose }: DeleteCouponDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteCoupon = useDeleteCoupon();
  const toggleCoupon = useToggleCoupon();

  const isUsed = (coupon?.usageCount ?? 0) > 0;
  const isPending = isUsed ? toggleCoupon.isPending : deleteCoupon.isPending;

  async function handleConfirm() {
    if (!coupon) return;
    if (isPending) return;
    setError(null);

    try {
      if (isUsed) {
        await toggleCoupon.mutateAsync(coupon.id);
      } else {
        await deleteCoupon.mutateAsync(coupon.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isUsed ? 'Failed to disable coupon' : 'Failed to delete coupon');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!coupon) return null;

  const config = COUPON_STATUS_CONFIG[coupon.status] || COUPON_STATUS_CONFIG.disabled;

  return (
    <Dialog
      open={!!coupon}
      onClose={handleClose}
      title={isUsed ? 'Disable Coupon' : 'Delete Coupon'}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isUsed ? 'warning' : 'destructive'}
            size="md"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending
              ? (isUsed ? 'Disabling\u2026' : 'Deleting\u2026')
              : (isUsed ? 'Disable' : 'Delete')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {isUsed ? (
          <>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{coupon.code}</span> has been used{' '}
              <span className="font-semibold">{coupon.usageCount}</span> time{coupon.usageCount === 1 ? '' : 's'} and cannot be permanently deleted.
            </p>
            <p className="text-sm text-slate-600">
              Disable it instead to deactivate this coupon while keeping historical records intact.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{coupon.code}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <div className="mt-1 text-slate-500">
                {coupon.discountType === 'flat' ? `TK ${coupon.value.toFixed(2)} off` : `${coupon.value}% off`}
                {coupon.minOrderAmount ? ` — Min. TK ${coupon.minOrderAmount.toFixed(2)}` : ''}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-800">{coupon.code}</span>?
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{coupon.code}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <div className="mt-1 text-slate-500">
                {coupon.discountType === 'flat' ? `TK ${coupon.value.toFixed(2)} off` : `${coupon.value}% off`}
                {coupon.minOrderAmount ? ` — Min. TK ${coupon.minOrderAmount.toFixed(2)}` : ''}
              </div>
            </div>
            <p className="text-xs text-red-600">
              This action cannot be undone. The coupon will be permanently removed.
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
}
