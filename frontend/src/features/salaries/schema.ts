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

export type CreateSalaryFormData = z.infer<typeof createSalarySchema>;
export type AddAdvanceFormData = z.infer<typeof addAdvanceSchema>;
