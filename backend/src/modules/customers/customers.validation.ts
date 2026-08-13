import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  phone: z.string().min(1, 'Phone is required').max(20).trim(),
  email: z.string().email('Invalid email address').max(255).trim().optional().or(z.literal('')),
  address: z.string().max(500).trim().optional().or(z.literal('')),
}).strict();

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  phone: z.string().min(1, 'Phone is required').max(20).trim().optional(),
  email: z.string().email('Invalid email address').max(255).trim().optional().or(z.literal('')),
  address: z.string().max(500).trim().optional().or(z.literal('')),
}).strict();

export const listCustomersSchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
});

export const saveOrFindCustomerSchema = z.object({
  phone: z.string().min(1, 'Phone is required').max(20).trim(),
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  email: z.string().email('Invalid email address').max(255).trim().optional().or(z.literal('')),
  address: z.string().max(500).trim().optional().or(z.literal('')),
}).strict();

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
export type ListCustomersDto = z.infer<typeof listCustomersSchema>;
export type SaveOrFindCustomerDto = z.infer<typeof saveOrFindCustomerSchema>;
