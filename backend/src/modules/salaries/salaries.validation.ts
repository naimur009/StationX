import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

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

export const listSalariesQuerySchema = paginationSchema.extend({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format').optional(),
  status: z.enum(['active', 'paid', 'cancelled']).optional(),
}).strict();

export const objectIdParam = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid salary ID format'),
});

export const deleteSalaryQuerySchema = z.object({
  force: z.enum(['true', 'false']).optional(),
}).strict();

export const createAdjustmentSchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format'),
  salaryId: z.string().regex(objectIdRegex, 'Invalid salary ID format').optional(),
  type: z.enum(['bonus', 'cut']),
  amount: z.number().positive('Amount must be positive').multipleOf(0.01),
  reason: z.string().min(1, 'Reason is required').max(300).trim(),
  date: z.coerce.date({ required_error: 'Date is required' }),
  month: z.number().int().min(1, 'Month must be 1-12').max(12, 'Month must be 1-12'),
  year: z.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year'),
}).strict();

export const listAdjustmentsQuerySchema = paginationSchema.extend({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format').optional(),
  salaryId: z.string().regex(objectIdRegex, 'Invalid salary ID format').optional(),
  type: z.enum(['bonus', 'cut']).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
}).strict();

export const salarySummaryQuerySchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
}).strict();

export const updateAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'cut']).optional(),
  amount: z.number().positive('Amount must be positive').multipleOf(0.01).optional(),
  reason: z.string().min(1, 'Reason is required').max(300).trim().optional(),
  date: z.coerce.date().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const salaryReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100),
}).strict();

export type CreateSalaryDto = z.infer<typeof createSalarySchema>;
export type AddAdvanceDto = z.infer<typeof addAdvanceSchema>;
export type UpdateSalaryStatusDto = z.infer<typeof updateSalaryStatusSchema>;
export type ListSalariesQuery = z.infer<typeof listSalariesQuerySchema>;
export type CreateAdjustmentDto = z.infer<typeof createAdjustmentSchema>;
export type ListAdjustmentsQuery = z.infer<typeof listAdjustmentsQuerySchema>;
export type UpdateAdjustmentDto = z.infer<typeof updateAdjustmentSchema>;
export type SalaryReportQuery = z.infer<typeof salaryReportQuerySchema>;
export type SalarySummaryQuery = z.infer<typeof salarySummaryQuerySchema>;

export const employeeReportParamsSchema = z.object({
  employeeId: z.string().regex(objectIdRegex, 'Invalid employee ID format'),
}).strict();

export const employeeReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
}).strict();

export type EmployeeReportParams = z.infer<typeof employeeReportParamsSchema>;
export type EmployeeReportQuery = z.infer<typeof employeeReportQuerySchema> & EmployeeReportParams;
