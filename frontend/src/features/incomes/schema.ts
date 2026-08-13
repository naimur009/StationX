import { z } from 'zod';

export const createIncomeSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required').max(500),
  category: z.string().min(1, 'Category is required').max(100),
  receivedFrom: z.string().trim().min(1, 'Received from is required').max(200),
  receivedBy: z.string().min(1, 'Received by is required'),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']),
});

export const updateIncomeSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places').optional(),
  date: z.string().min(1, 'Date is required').optional(),
  description: z.string().min(1, 'Description is required').max(500).optional(),
  category: z.string().min(1, 'Category is required').max(100).optional(),
  receivedFrom: z.string().trim().min(1, 'Received from is required').max(200).optional(),
  receivedBy: z.string().min(1, 'Received by is required').optional(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
});

export type CreateIncomeFormData = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeFormData = z.infer<typeof updateIncomeSchema>;
