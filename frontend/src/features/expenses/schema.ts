import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.coerce.date({ required_error: 'Date is required' }),
  description: z.string().max(500).optional().default(''),
  category: z.string().min(1, 'Category is required').max(100),
  vendorId: z.string().optional().default(''),
  paidBy: z.string().min(1, 'Paid by is required'),
  paidTo: z.string().min(1, 'Paid to is required').max(200),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']),
});

export const updateExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  date: z.coerce.date().optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1, 'Category is required').max(100).optional(),
  vendorId: z.string().optional().nullable(),
  paidBy: z.string().min(1, 'Paid by is required').optional(),
  paidTo: z.string().min(1, 'Paid to is required').max(200).optional(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
});

export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseFormData = z.infer<typeof updateExpenseSchema>;
