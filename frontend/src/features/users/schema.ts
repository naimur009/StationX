import { z } from 'zod';
import { emailField, passwordSchema } from '@/lib/validation';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailField,
  password: passwordSchema,
  role: z.enum(['manager', 'employee']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailField,
  role: z.enum(['manager', 'employee']).optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
