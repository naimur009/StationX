import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  price: z.number().positive('Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places'),
  categoryId: z.string().min(1, 'Category is required'),
  image: z.object({
    url: z.string(),
    publicId: z.string(),
  }).optional(),
  description: z.string().max(1000).trim().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim().optional(),
  price: z.number().positive('Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places').optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  image: z.object({
    url: z.string(),
    publicId: z.string(),
  }).nullable().optional(),
  description: z.string().max(1000).trim().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
