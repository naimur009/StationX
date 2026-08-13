import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required').max(500),
  category: z.string().min(1, 'Category is required').max(100),
  vendorId: z.string().optional().default(''),
  paidBy: z.string().min(1, 'Paid by is required'),
  paidTo: z.string().min(1, 'Paid to is required').max(200),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']),
});

export const updateExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places').optional(),
  date: z.string().min(1, 'Date is required').optional(),
  description: z.string().min(1, 'Description is required').max(500).optional(),
  category: z.string().min(1, 'Category is required').max(100).optional(),
  vendorId: z.string().optional().nullable(),
  paidBy: z.string().min(1, 'Paid by is required').optional(),
  paidTo: z.string().min(1, 'Paid to is required').max(200).optional(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
});

export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseFormData = z.infer<typeof updateExpenseSchema>;
