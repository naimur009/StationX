import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  phone: z.string().min(1, 'Phone is required').max(20).optional(),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
});

export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;
