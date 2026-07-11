import { z } from 'zod';

const PAYMENT_METHODS = ['cash', 'card', 'bkash', 'nagad'] as const;
const ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'] as const;

const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  transactionId: z.string().max(20).optional(),
});

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  orderType: z.enum(ORDER_TYPES).optional(),
  tableNumber: z.string().max(20).optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  servedBy: z.string().nullable().optional(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  couponCode: z.string().max(50).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  cashTendered: z.number().min(0).optional(),
  payment: paymentSchema.optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  phone: z.string().min(1, 'Phone is required').max(20).trim(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
}).strict();

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  subtotal: z.number().nonnegative().multipleOf(0.01),
  customerId: z.string().optional(),
}).strict();

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type ValidateCouponDto = z.infer<typeof validateCouponSchema>;
