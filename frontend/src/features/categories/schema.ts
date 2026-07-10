import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  vatRate: z.number().min(0).max(100),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  vatRate: z.number().min(0).max(100),
});

export type CreateCategoryFormData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
