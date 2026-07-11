import { z } from 'zod';
import { emailField, passwordSchema, tokenField } from '../../shared/validation';

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
}).strict();

export const forgotPasswordSchema = z.object({
  email: emailField,
}).strict();

export const resetPasswordSchema = z.object({
  token: tokenField,
  newPassword: passwordSchema,
}).strict();
