'use client';

import { z } from 'zod';

export const ordersFilterSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid']).optional(),
  range: z.enum(['today', 'week', 'month', 'custom']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(50).optional(),
  customerPhone: z.string().max(30).optional(),
});

export const updateOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const updatePaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
});

export const updateOrderSchema = z.object({
  tableId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  items: z.array(updateOrderItemSchema).min(1).optional(),
  payment: updatePaymentSchema.optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']),
  cancelReason: z.string().max(500).optional(),
}).refine(
  (data) => data.status !== 'cancelled' || (data.cancelReason && data.cancelReason.trim().length > 0),
  { message: 'Cancel reason is required when cancelling an order', path: ['cancelReason'] }
);

export type OrdersFilterFormData = z.infer<typeof ordersFilterSchema>;
export type UpdateOrderFormData = z.infer<typeof updateOrderSchema>;
export type UpdateStatusFormData = z.infer<typeof updateStatusSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
