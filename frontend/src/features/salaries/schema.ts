import { z } from 'zod';

export const addAdvanceSchema = z.object({
  amount: z.coerce
    .number()
    .positive('Payment amount must be positive')
    .multipleOf(0.01, 'Amount must be a valid 2-decimal amount'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().max(300).optional(),
});

export const createAdjustmentSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type: z.enum(['bonus', 'cut']),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount must be a valid 2-decimal amount'),
  reason: z.string().min(1, 'Reason is required').max(300),
  date: z.string().min(1, 'Date is required'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const updateAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'cut']).optional(),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount must be a valid 2-decimal amount')
    .optional(),
  reason: z.string().min(1, 'Reason is required').max(300).optional(),
  date: z.string().min(1, 'Date is required').optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type AddAdvanceFormData = z.infer<typeof addAdvanceSchema>;
export type CreateAdjustmentFormData = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentFormData = z.infer<typeof updateAdjustmentSchema>;
