import { z } from 'zod';

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid ID format'),
});