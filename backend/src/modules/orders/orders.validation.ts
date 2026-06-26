import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const listOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  createdBy: z.string().regex(objectIdPattern, 'Invalid user ID format').optional(),
  customerId: z.string().regex(objectIdPattern, 'Invalid customer ID format').optional(),
  search: z.string().max(50).optional(),
  sort: z.enum(['createdAt', '-createdAt']).optional().default('-createdAt'),
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
}).strict();

export const orderIdParamSchema = z.object({
  id: z.string().regex(objectIdPattern, 'Invalid order ID format'),
});

const updateOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

const updatePaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
}).optional();

export const updateOrderSchema = z.object({
  tableNumber: z.string().max(20).trim().optional(),
  customerId: z.string().regex(objectIdPattern, 'Invalid customer ID format').nullable().optional(),
  items: z.array(updateOrderItemSchema).min(1, 'Order must have at least one item').optional(),
  payment: updatePaymentSchema,
}).strict();

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']),
  cancelReason: z.string().max(500).trim().optional(),
}).strict().refine(
  (data) => data.status !== 'cancelled' || (data.cancelReason && data.cancelReason.length > 0),
  { message: 'Cancel reason is required when cancelling an order', path: ['cancelReason'] }
);

export const billQuerySchema = z.object({
  format: z.enum(['pdf', 'html']).optional().default('html'),
}).strict();

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
