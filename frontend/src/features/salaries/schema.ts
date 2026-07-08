import { z } from 'zod';

export const createSalarySchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  paidAmount: z.coerce.number().min(0, 'Paid amount must be 0 or more'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const addAdvanceSchema = z.object({
  amount: z.coerce.number().positive('Advance amount must be positive'),
  date: z.coerce.date({ required_error: 'Date is required' }),
  note: z.string().max(300).optional(),
});

export const createAdjustmentSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type: z.enum(['bonus', 'cut']),
  amount: z.coerce.number().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required').max(300),
  date: z.coerce.date({ required_error: 'Date is required' }),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const updateAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'cut']).optional(),
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  reason: z.string().min(1, 'Reason is required').max(300).optional(),
  date: z.coerce.date().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export type CreateSalaryFormData = z.infer<typeof createSalarySchema>;
export type AddAdvanceFormData = z.infer<typeof addAdvanceSchema>;
export type CreateAdjustmentFormData = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentFormData = z.infer<typeof updateAdjustmentSchema>;
