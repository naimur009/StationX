import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email is too long'),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').max(1024, 'Token is too long'),
  newPassword: passwordSchema,
});
