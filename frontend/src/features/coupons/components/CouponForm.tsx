'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCoupon, useUpdateCoupon, type CouponResponse } from '../api';
import { createCouponSchema, type CreateCouponFormData } from '../schema';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/utils';

interface CouponFormProps {
  open: boolean;
  coupon: CouponResponse | null;
  onClose: () => void;
}

export default function CouponForm({ open, coupon, onClose }: CouponFormProps) {
  const [error, setError] = useState<string | null>(null);
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();

  const isEdit = !!coupon;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateCouponFormData>({
    resolver: zodResolver(createCouponSchema),
  });

  const discountType = watch('discountType');

  useEffect(() => {
    if (open) {
      if (coupon) {
        reset({
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
          validFrom: coupon.validFrom.slice(0, 10),
          validUntil: coupon.validUntil.slice(0, 10),
          usageLimit: coupon.usageLimit ?? undefined,
        });
      } else {
        reset({
          code: '',
          discountType: 'flat',
          value: '' as unknown as number,
          validFrom: '',
          validUntil: '',
          usageLimit: undefined,
        });
      }
      setError(null);
    }
  }, [open, coupon, reset]);

  function toNumber(v: number | undefined): number | undefined {
    return v !== undefined && !isNaN(v) ? v : undefined;
  }

  async function onSubmit(data: CreateCouponFormData) {
    if (isPending) return;
    setError(null);

    if (data.value === '' as unknown as number || isNaN(Number(data.value))) {
      setError('Value is required');
      return;
    }

    const payload: Record<string, unknown> = {
      code: data.code,
      discountType: data.discountType,
      value: Number(data.value),
      validFrom: data.validFrom,
      validUntil: data.validUntil,
    };

    const usageLimit = toNumber(data.usageLimit);
    if (usageLimit !== undefined) payload.usageLimit = usageLimit;

    try {
      if (isEdit && coupon) {
        await updateCoupon.mutateAsync({ id: coupon.id, ...payload });
      } else {
        await createCoupon.mutateAsync(payload as Parameters<typeof createCoupon.mutateAsync>[0]);
      }
      reset();
      onClose();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError(isEdit ? 'Failed to update coupon' : 'Failed to create coupon');
      }
    }
  }

  function handleClose() {
    reset();
    setError(null);
    onClose();
  }

  function handleFormSubmit() {
    handleSubmit(onSubmit)();
  }

  const isPending = isEdit ? updateCoupon.isPending : createCoupon.isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Coupon' : 'Create Coupon'}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isPending}
            onClick={handleFormSubmit}
          >
            {isPending ? 'Saving\u2026' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="coupon-code" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Code
          </label>
          <input
            id="coupon-code"
            type="text"
            placeholder="e.g. SUMMER20"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase ${
              errors.code ? 'border-red-400' : 'border-slate-300'
            }`}
            {...register('code')}
          />
          {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="coupon-discount-type" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
              Discount Type
            </label>
            <select
              id="coupon-discount-type"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              {...register('discountType')}
            >
              <option value="flat">Flat (TK)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          <div>
            <label htmlFor="coupon-value" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
              {discountType === 'flat' ? 'Amount (TK)' : 'Percentage (%)'}
            </label>
            <input
              id="coupon-value"
              type="number"
              step={discountType === 'flat' ? '0.01' : '1'}
              inputMode="decimal"
              placeholder={discountType === 'flat' ? '0.00' : '0'}
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                errors.value ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('value', { setValueAs: (v) => (v === '' ? '' : Number(v)) })}
            />
            {errors.value && <p className="mt-1 text-xs text-red-500">{errors.value.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="coupon-valid-from" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
              Valid From
            </label>
            <input
              id="coupon-valid-from"
              type="date"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                errors.validFrom ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('validFrom')}
            />
            {errors.validFrom && <p className="mt-1 text-xs text-red-500">{errors.validFrom.message}</p>}
          </div>

          <div>
            <label htmlFor="coupon-valid-until" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
              Valid Until
            </label>
            <input
              id="coupon-valid-until"
              type="date"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                errors.validUntil ? 'border-red-400' : 'border-slate-300'
              }`}
              {...register('validUntil')}
            />
            {errors.validUntil && <p className="mt-1 text-xs text-red-500">{errors.validUntil.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="coupon-usage-limit" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Usage Limit (optional)
          </label>
          <input
            id="coupon-usage-limit"
            type="number"
            step="1"
            inputMode="numeric"
            placeholder="Unlimited"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 ring-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            {...register('usageLimit', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
          />
          {errors.usageLimit && <p className="mt-1 text-xs text-red-500">{errors.usageLimit.message}</p>}
          <p className="mt-1 text-xs text-slate-400">
            Leave empty for unlimited redemptions
          </p>
        </div>
      </form>
    </Dialog>
  );
}
