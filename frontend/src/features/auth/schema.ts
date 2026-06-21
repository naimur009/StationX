import { z } from 'zod';
import { emailField, passwordSchema, tokenField } from '@/lib/validation';

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: tokenField,
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password')
      .max(128, 'Password is too long'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
