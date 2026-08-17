'use client';

import { useState } from 'react';
import { useDeleteCoupon, type CouponResponse } from '../api';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';
import PermissionGate from '@/components/shared/PermissionGate';

interface DeleteCouponDialogProps {
  coupon: CouponResponse | null;
  onClose: () => void;
}

export default function DeleteCouponDialog({ coupon, onClose }: DeleteCouponDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const deleteCoupon = useDeleteCoupon();

  async function handleConfirm() {
    if (!coupon) return;
    if (deleteCoupon.isPending) return;
    setError(null);

    try {
      await deleteCoupon.mutateAsync(coupon.id);
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to delete coupon');
      }
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!coupon) return null;

  return (
    <Dialog
      open={!!coupon}
      onClose={handleClose}
      title="Delete Coupon"
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <PermissionGate module="coupons" action="delete">
            <Button
              type="button"
              variant="destructive"
              size="md"
              onClick={handleConfirm}
              disabled={deleteCoupon.isPending}
            >
              {deleteCoupon.isPending ? 'Deleting\u2026' : 'Delete'}
            </Button>
          </PermissionGate>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-slate-800">{coupon.code}</span>? This action cannot be undone.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{coupon.code}</span>
            <span className="text-xs text-slate-400">
              Used {coupon.usageCount} time{coupon.usageCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-1 text-slate-500">
            {coupon.discountType === 'flat' ? `৳${coupon.value.toFixed(2)} off` : `${coupon.value}% off`}
          </div>
        </div>
      </div>
    </Dialog>
  );
}