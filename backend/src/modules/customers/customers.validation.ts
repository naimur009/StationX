import { z } from 'zod';

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
  isActive: z.boolean().optional(),
}).strict();

export const listCustomersSchema = z.object({
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
  isActive: z.enum(['true', 'false']).optional(),
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
