import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
});

export type PaginationDto = z.infer<typeof paginationSchema>;

export function paginate(page: number, limit: number): { skip: number; limit: number } {
  return { skip: (page - 1) * limit, limit };
}
