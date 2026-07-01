import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createSalarySchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format'),
  paidAmount: z.number().min(0, 'Paid amount must be 0 or more').multipleOf(0.01).default(0),
  month: z.number().int().min(1, 'Month must be 1-12').max(12, 'Month must be 1-12'),
  year: z.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
}).strict();

export const addAdvanceSchema = z.object({
  amount: z.number().positive('Advance amount must be positive').multipleOf(0.01),
  date: z.coerce.date({ required_error: 'Date is required' }),
  note: z.string().max(300).trim().optional(),
}).strict();

export const updateSalaryStatusSchema = z.object({
  status: z.enum(['active', 'paid', 'cancelled']),
}).strict();

export const listSalariesQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format').optional(),
  status: z.enum(['active', 'paid', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const objectIdParam = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid salary ID format'),
});

export type CreateSalaryDto = z.infer<typeof createSalarySchema>;
export type AddAdvanceDto = z.infer<typeof addAdvanceSchema>;
export type UpdateSalaryStatusDto = z.infer<typeof updateSalaryStatusSchema>;
export type ListSalariesQuery = z.infer<typeof listSalariesQuerySchema>;
