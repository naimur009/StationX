import mongoose from 'mongoose';
import Coupon, { ICoupon } from '../../models/Coupon';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import type {
  CreateCouponDto,
  UpdateCouponDto,
  ListCouponsDto,
} from './coupons.validation';

type CouponStatus = 'active' | 'scheduled' | 'expired' | 'disabled';

interface CouponResponse {
  id: string;
  code: string;
  discountType: 'flat' | 'percentage';
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  validFrom: Date;
  validUntil: Date;
  isEnabled: boolean;
  usageLimit: number | null;
  usageCount: number;
  status: CouponStatus;
  createdAt: Date;
  updatedAt: Date;
}

function computeStatus(coupon: ICoupon): CouponStatus {
  if (!coupon.isEnabled) return 'disabled';

  const now = new Date();
  if (now < coupon.validFrom) return 'scheduled';
  if (now > coupon.validUntil) return 'expired';

  return 'active';
}

function toResponse(coupon: ICoupon): CouponResponse {
  return {
    id: coupon._id.toString(),
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    maxDiscountAmount: coupon.maxDiscountAmount ?? null,
    minOrderAmount: coupon.minOrderAmount ?? null,
    validFrom: coupon.validFrom,
    validUntil: coupon.validUntil,
    isEnabled: coupon.isEnabled,
    usageLimit: coupon.usageLimit ?? null,
    usageCount: coupon.usageCount,
    status: computeStatus(coupon),
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

export async function listCoupons(query: ListCouponsDto) {
  const filter: Record<string, unknown> = {};

  if (query.isEnabled === 'true') {
    filter.isEnabled = true;
  } else if (query.isEnabled === 'false') {
    filter.isEnabled = false;
  }

  if (query.search) {
    filter.code = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  if (query.discountType) {
    filter.discountType = query.discountType;
  }

  const skip = (query.page - 1) * query.limit;

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Coupon.countDocuments(filter),
  ]);

  const data = coupons.map(toResponse);

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getCouponById(id: string) {
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw createError(404, 'NOT_FOUND', 'Coupon not found');
  }

  return { data: toResponse(coupon) };
}

export async function createCoupon(dto: CreateCouponDto) {
  try {
    const coupon = await Coupon.create(dto);
    return { data: toResponse(coupon) };
  } catch (err) {
    if (err instanceof mongoose.Error && (err as any).code === 11000) {
      throw createError(400, 'COUPON_CODE_EXISTS', 'A coupon with this code already exists');
    }
    throw err;
  }
}

export async function updateCoupon(id: string, dto: UpdateCouponDto) {
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw createError(404, 'NOT_FOUND', 'Coupon not found');
  }

  if (dto.code !== undefined && dto.code !== coupon.code) {
    const existing = await Coupon.findOne({ code: dto.code, _id: { $ne: id } });
    if (existing) {
      throw createError(400, 'COUPON_CODE_EXISTS', 'A coupon with this code already exists');
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.code !== undefined) updates.code = dto.code;
  if (dto.discountType !== undefined) updates.discountType = dto.discountType;
  if (dto.value !== undefined) updates.value = dto.value;
  if (dto.maxDiscountAmount !== undefined) updates.maxDiscountAmount = dto.maxDiscountAmount;
  if (dto.minOrderAmount !== undefined) updates.minOrderAmount = dto.minOrderAmount;
  if (dto.validFrom !== undefined) updates.validFrom = dto.validFrom;
  if (dto.validUntil !== undefined) updates.validUntil = dto.validUntil;
  if (dto.isEnabled !== undefined) updates.isEnabled = dto.isEnabled;
  if (dto.usageLimit !== undefined) updates.usageLimit = dto.usageLimit;

  const updated = await Coupon.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Coupon not found');
  }

  return { data: toResponse(updated) };
}

export async function toggleCoupon(id: string) {
  const updated = await Coupon.findByIdAndUpdate(
    id,
    [{ $set: { isEnabled: { $not: '$isEnabled' } } }],
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Coupon not found');
  }

  return { data: toResponse(updated) };
}

export async function deleteCoupon(id: string) {
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw createError(404, 'NOT_FOUND', 'Coupon not found');
  }

  if (coupon.usageCount > 0) {
    throw createError(
      409,
      'COUPON_IN_USE',
      'Cannot delete a coupon that has been used in orders. Use PATCH /coupons/:id/toggle to disable it instead.'
    );
  }

  await Coupon.findByIdAndDelete(id);

  return { data: { success: true } };
}
