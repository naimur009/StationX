import { z } from 'zod';

export const emailField = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const tokenField = z
  .string()
  .min(1, 'Token is required')
  .max(1024, 'Token is too long');
