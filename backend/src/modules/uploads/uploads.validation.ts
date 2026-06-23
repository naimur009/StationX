import { z } from 'zod';

export const uploadImageSchema = z.object({
  folder: z.string().optional().default('uploads'),
}).strict();

export type UploadImageDto = z.infer<typeof uploadImageSchema>;
