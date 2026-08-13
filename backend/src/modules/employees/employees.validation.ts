import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  nid: z.string().trim().max(30).optional(),
  address: z.string().max(200).optional(),
  baseSalary: z.number().min(0).multipleOf(0.01).optional(),
}).strict();

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  nid: z.string().trim().max(30).optional(),
  address: z.string().max(200).optional(),
  baseSalary: z.number().min(0).multipleOf(0.01).optional(),
}).strict();

export const listEmployeesSchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
});

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesDto = z.infer<typeof listEmployeesSchema>;
