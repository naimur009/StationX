import { z } from 'zod';
import { DATE_RANGES } from '../../lib/date-range';
import { paginationSchema } from '../../lib/pagination';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  date: z.coerce.date({ required_error: 'Date is required' }),
  description: z.string().min(1, 'Description is required').max(500).trim(),
  category: z.string().min(1, 'Category is required').max(100).trim(),
  vendorId: z.string().regex(objectIdRegex, 'Invalid vendor ID format').optional().nullable(),
  paidBy: z.string().regex(objectIdRegex, 'Invalid paidBy ID format'),
  paidTo: z.string().min(1, 'Paid to is required').max(200).trim(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']),
}).strict();

export const updateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').multipleOf(0.01).optional(),
  date: z.coerce.date().optional(),
  description: z.string().max(500).trim().optional(),
  category: z.string().min(1, 'Category is required').max(100).trim().optional(),
  vendorId: z.string().regex(objectIdRegex, 'Invalid vendor ID format').optional().nullable(),
  paidBy: z.string().regex(objectIdRegex, 'Invalid paidBy ID format').optional(),
  paidTo: z.string().min(1, 'Paid to is required').max(200).trim().optional(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const listExpensesQuerySchema = z.object({
  range: z.enum(DATE_RANGES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().max(100).trim().optional(),
  vendorId: z.string().regex(objectIdRegex, 'Invalid vendor ID format').optional(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
  paidBy: z.string().regex(objectIdRegex, 'Invalid paidBy ID format').optional(),
  ...paginationSchema.shape,
}).strict().refine(
  (data) => {
    if (data.range === 'custom') {
      return !!data.from && !!data.to;
    }
    return true;
  },
  { message: 'from and to are required when range is custom', path: ['from'] }
);

export const objectIdParam = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid expense ID format'),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
