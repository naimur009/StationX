import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(100).email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  itemsSupplied: z.array(z.string().max(100)).max(50).optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).optional(),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(100).email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  itemsSupplied: z.array(z.string().max(100)).max(50).optional(),
  isActive: z.boolean().optional(),
});

export type CreateVendorFormData = z.infer<typeof createVendorSchema>;
export type UpdateVendorFormData = z.infer<typeof updateVendorSchema>;
