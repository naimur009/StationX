import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  contactPerson: z.string().max(100).trim().optional(),
  phone: z.string().max(30).trim().optional(),
  email: z.string().max(100).email('Invalid email').trim().optional(),
  address: z.string().max(500).trim().optional(),
  itemsSupplied: z.array(z.string().max(100).trim()).max(50).optional(),
}).strict();

export const updateVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim().optional(),
  contactPerson: z.string().max(100).trim().optional(),
  phone: z.string().max(30).trim().optional(),
  email: z.string().max(100).email('Invalid email').trim().optional(),
  address: z.string().max(500).trim().optional(),
  itemsSupplied: z.array(z.string().max(100).trim()).max(50).optional(),
}).strict();

export const listVendorsSchema = z.object({
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
  search: z.string().max(100).optional(),
}).strict();

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateVendorDto = z.infer<typeof createVendorSchema>;
export type UpdateVendorDto = z.infer<typeof updateVendorSchema>;
export type ListVendorsDto = z.infer<typeof listVendorsSchema>;
