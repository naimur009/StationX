import { z } from 'zod';
import { emailField } from '@/lib/validation';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: emailField,
});

export const changePasswordSchema = z.object({
  prevPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordFormData = z.infer<typeof adminResetPasswordSchema>;
