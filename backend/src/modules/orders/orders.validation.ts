import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const listOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid']).optional(),
  range: z.enum(['today', 'week', 'month', 'custom']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  createdBy: z.string().regex(objectIdPattern, 'Invalid user ID format').optional(),
  customerId: z.string().regex(objectIdPattern, 'Invalid customer ID format').optional(),
  customerPhone: z.string().max(30).optional(),
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
  transactionId: z.string().max(20).optional(),
}).optional();

export const updateOrderSchema = z.object({
  tableId: z.string().regex(objectIdPattern, 'Invalid table ID format').nullable().optional(),
  customerId: z.string().regex(objectIdPattern, 'Invalid customer ID format').nullable().optional(),
  items: z.array(updateOrderItemSchema).min(1, 'Order must have at least one item').optional(),
  payment: updatePaymentSchema,
  cashTendered: z.number().nonnegative().multipleOf(0.01).optional(),
  changeAmount: z.number().nonnegative().multipleOf(0.01).optional(),
  discountPercent: z.number().min(0).max(100).multipleOf(0.01).optional(),
}).strict().refine(
  (data) => {
    if (data.payment?.method && data.payment.method !== 'cash' && !data.payment.transactionId) {
      return false;
    }
    return true;
  },
  { message: 'Transaction ID is required for non-cash payments', path: ['payment', 'transactionId'] }
);

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  cancelReason: z.string().max(500).trim().optional(),
  paymentStatus: z.enum(['paid']).optional(),
  payment: z.object({
    method: z.enum(['cash', 'card', 'bkash', 'nagad']),
    transactionId: z.string().max(20).optional(),
  }).optional(),
  cashTendered: z.number().nonnegative().multipleOf(0.01).optional(),
  changeAmount: z.number().nonnegative().multipleOf(0.01).optional(),
}).strict().refine(
  (data) => {
    if (data.paymentStatus === 'paid' && data.payment) {
      if (data.payment.method === 'cash' && (data.cashTendered === undefined || data.cashTendered <= 0)) {
        return false;
      }
    }
    return true;
  },
  { message: 'Cash tendered is required and must be > 0 for cash payments', path: ['cashTendered'] }
).refine(
  (data) => {
    if (data.payment?.method && data.payment.method !== 'cash' && !data.payment.transactionId) {
      return false;
    }
    return true;
  },
  { message: 'Transaction ID is required for non-cash payments', path: ['payment', 'transactionId'] }
).refine(
  (data) => {
    if (data.status === 'cancelled' && !data.cancelReason) {
      return false;
    }
    return true;
  },
  { message: 'Cancel reason is required when cancelling an order', path: ['cancelReason'] }
).refine(
  (data) => data.status || data.paymentStatus,
  { message: 'Either status or paymentStatus must be provided', path: ['status'] }
);

export const billQuerySchema = z.object({
  format: z.enum(['pdf', 'html']).optional().default('html'),
}).strict();

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
