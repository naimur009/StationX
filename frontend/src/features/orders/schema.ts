'use client';

import { z } from 'zod';

export const ordersFilterSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(50).optional(),
  customerSearch: z.string().max(50).optional(),
});

export const updateOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const updatePaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'bkash', 'nagad', 'split']).optional(),
  splits: z.array(z.object({
    method: z.enum(['cash', 'card', 'bkash', 'nagad']),
    amount: z.number().min(0),
  })).optional(),
});

export const updateOrderSchema = z.object({
  tableNumber: z.string().max(20).optional(),
  customerId: z.string().nullable().optional(),
  items: z.array(updateOrderItemSchema).min(1).optional(),
  payment: updatePaymentSchema.optional(),
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
