import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  nid: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  baseSalary: z.coerce.number().min(0).multipleOf(0.01).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  phone: z.string().min(1, 'Phone is required').max(20).optional(),
  nid: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  baseSalary: z.coerce.number().min(0).multipleOf(0.01).optional(),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;
