import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listActivityLogSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actor: z.string().regex(objectIdRegex, 'Invalid actor ID format').optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  from: z.string().regex(dateRegex, 'Invalid from date format (use YYYY-MM-DD)').optional(),
  to: z.string().regex(dateRegex, 'Invalid to date format (use YYYY-MM-DD)').optional(),
}).strict();

export type ListActivityLogDto = z.infer<typeof listActivityLogSchema>;
