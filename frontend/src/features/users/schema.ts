import { z } from 'zod';
import { emailField } from '@/lib/validation';

export const createUserSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['manager', 'employee', 'chief']),
});

export const updateUserSchema = z.object({
  email: emailField,
  role: z.enum(['manager', 'employee', 'chief']).optional(),
});

export const changePasswordSchema = z.object({
  prevPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
