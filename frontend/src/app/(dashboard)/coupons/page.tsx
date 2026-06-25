'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PermissionGate from '@/components/shared/PermissionGate';
import CouponList from '@/features/coupons/components/CouponList';
import CouponForm from '@/features/coupons/components/CouponForm';
import DeleteCouponDialog from '@/features/coupons/components/DeleteCouponDialog';
import type { CouponResponse } from '@/features/coupons/api';

export default function CouponsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<CouponResponse | null>(null);
  const [deleteCoupon, setDeleteCoupon] = useState<CouponResponse | null>(null);

  return (
    <PermissionGate module="coupons" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">Coupons</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage promotional discounts and offers
            </p>
          </div>
          <PermissionGate module="coupons" action="create">
            <Button variant="primary" size="md" className="w-full xs:w-auto" onClick={() => setCreateOpen(true)}>
              Create Coupon
            </Button>
          </PermissionGate>
        </div>

        <CouponList
          onEdit={(coupon) => setEditCoupon(coupon)}
          onDelete={(coupon) => setDeleteCoupon(coupon)}
        />

        <CouponForm
          open={createOpen}
          coupon={null}
          onClose={() => setCreateOpen(false)}
        />
        <CouponForm
          open={!!editCoupon}
          coupon={editCoupon}
          onClose={() => setEditCoupon(null)}
        />
        <DeleteCouponDialog
          coupon={deleteCoupon}
          onClose={() => setDeleteCoupon(null)}
        />
      </div>
    </PermissionGate>
  );
}
