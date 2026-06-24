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
}).strict();

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim().optional(),
  price: z.number().positive('Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places').optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  image: z.object({
    url: z.string(),
    publicId: z.string(),
  }).optional(),
  description: z.string().max(1000).trim().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const listProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
});

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ListProductsDto = z.infer<typeof listProductsSchema>;
