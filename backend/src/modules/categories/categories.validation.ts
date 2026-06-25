import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
}).strict();

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const listCategoriesSchema = z.object({
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
  createdAtFrom: z.coerce.date().optional(),
  createdAtTo: z.coerce.date().optional(),
});

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type ListCategoriesDto = z.infer<typeof listCategoriesSchema>;
