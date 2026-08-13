import { z } from 'zod';

const ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'] as const;

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  orderType: z.enum(ORDER_TYPES).optional(),
  tableId: z.string().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  servedBy: z.string().nullable().optional(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  couponCode: z.string().max(50).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  subtotal: z.number().nonnegative().multipleOf(0.01),
  customerId: z.string().optional(),
}).strict();

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(10000).optional(),
  categoryId: z.string().optional(),
  search: z.string().max(100).optional(),
}).strict();

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type ValidateCouponDto = z.infer<typeof validateCouponSchema>;
