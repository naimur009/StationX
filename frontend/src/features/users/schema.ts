import { z } from 'zod';
import { emailField, passwordSchema } from '@/lib/validation';
import { MODULE_ACTIONS } from '@/lib/constants';

const moduleKeys = Object.keys(MODULE_ACTIONS) as [string, ...string[]];

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailField,
  password: passwordSchema,
  role: z.enum(['admin', 'employee']),
  permissions: z
    .array(
      z.object({
        module: z.enum(moduleKeys),
        actions: z.array(z.string()),
      })
    )
    .optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: emailField.optional(),
  role: z.enum(['admin', 'employee']).optional(),
});

export const changePasswordSchema = z.object({
  prevPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordFormData = z.infer<typeof adminResetPasswordSchema>;
