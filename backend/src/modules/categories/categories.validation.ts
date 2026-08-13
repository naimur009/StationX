import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  vatRate: z.number().min(0).max(100),
}).strict();

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  vatRate: z.number().min(0).max(100).optional(),
}).strict();

export const listCategoriesSchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
});

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type ListCategoriesDto = z.infer<typeof listCategoriesSchema>;
