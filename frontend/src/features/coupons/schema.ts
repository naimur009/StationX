import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).trim().transform((v) => v.toUpperCase()),
  discountType: z.enum(['flat', 'percentage']),
  value: z.number().positive('Value must be positive').multipleOf(0.01),
  maxDiscountAmount: z.number().positive('Max discount must be positive').multipleOf(0.01).optional().nullable(),
  minOrderAmount: z.number().nonnegative('Min order must not be negative').multipleOf(0.01).optional().nullable(),
  validFrom: z.string().min(1, 'Valid from is required'),
  validUntil: z.string().min(1, 'Valid until is required'),
  usageLimit: z.number().int('Usage limit must be a whole number').positive('Usage limit must be positive').optional(),
}).refine(
  (data) => {
    if (data.validFrom && data.validUntil) {
      return new Date(data.validUntil) > new Date(data.validFrom);
    }
    return true;
  },
  { message: 'Valid until must be after valid from', path: ['validUntil'] }
);

export type CreateCouponFormData = z.infer<typeof createCouponSchema>;
