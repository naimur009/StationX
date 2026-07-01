import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  address: z.string().max(200).optional(),
  baseSalary: z.number().min(0).multipleOf(0.01).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional(),
  address: z.string().max(200).optional(),
  baseSalary: z.number().min(0).multipleOf(0.01).optional(),
}).strict();

export const listEmployeesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
});

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesDto = z.infer<typeof listEmployeesSchema>;
