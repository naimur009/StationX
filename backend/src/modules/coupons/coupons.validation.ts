import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).trim().transform((v) => v.toUpperCase()),
  discountType: z.enum(['flat', 'percentage']),
  value: z.number().positive('Value must be positive').multipleOf(0.01),
  maxDiscountAmount: z.number().positive('Max discount must be positive').multipleOf(0.01).optional(),
  minOrderAmount: z.number().nonnegative('Min order must not be negative').multipleOf(0.01).optional(),
  validFrom: z.coerce.date({ required_error: 'Valid from is required' }),
  validUntil: z.coerce.date({ required_error: 'Valid until is required' }),
  isEnabled: z.boolean().optional(),
  usageLimit: z.number().int().positive('Usage limit must be a positive integer').optional(),
}).strict().refine(
  (data) => data.discountType === 'percentage' ? data.value <= 100 : true,
  { message: 'Percentage value must not exceed 100', path: ['value'] }
).refine(
  (data) => data.validUntil > data.validFrom,
  { message: 'Valid until must be after valid from', path: ['validUntil'] }
);

export const updateCouponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).trim().transform((v) => v.toUpperCase()).optional(),
  discountType: z.enum(['flat', 'percentage']).optional(),
  value: z.number().positive('Value must be positive').multipleOf(0.01).optional(),
  maxDiscountAmount: z.number().positive('Max discount must be positive').multipleOf(0.01).optional().nullable(),
  minOrderAmount: z.number().nonnegative('Min order must not be negative').multipleOf(0.01).optional().nullable(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isEnabled: z.boolean().optional(),
  usageLimit: z.number().int().positive('Usage limit must be a positive integer').optional().nullable(),
}).strict().refine(
  (data) => {
    if (data.validFrom && data.validUntil) {
      return data.validUntil > data.validFrom;
    }
    return true;
  },
  { message: 'Valid until must be after valid from', path: ['validUntil'] }
).refine(
  (data) => {
    if (data.discountType === 'percentage' && data.value !== undefined) {
      return data.value <= 100;
    }
    return true;
  },
  { message: 'Percentage value must not exceed 100', path: ['value'] }
);

export const listCouponsSchema = z.object({
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
  isEnabled: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
  discountType: z.enum(['flat', 'percentage']).optional(),
});

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export const toggleCouponSchema = z.object({
}).strict();

export type CreateCouponDto = z.infer<typeof createCouponSchema>;
export type UpdateCouponDto = z.infer<typeof updateCouponSchema>;
export type ListCouponsDto = z.infer<typeof listCouponsSchema>;
