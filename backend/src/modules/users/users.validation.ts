import { z } from 'zod';
import { MODULE_ACTIONS } from '../../shared/constants';
import { emailField, passwordSchema } from '../../shared/validation';

const moduleKeys = Object.keys(MODULE_ACTIONS) as [string, ...string[]];

const validActionsRefine = (permissions: { module: string; actions: string[] }[]) =>
  permissions.every((p) => {
    const validActions = MODULE_ACTIONS[p.module];
    return validActions && p.actions.every((a) => (validActions as readonly string[]).includes(a));
  });

const permissionEntrySchema = z.object({
  module: z.enum(moduleKeys),
  actions: z.array(z.string()),
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailField,
  password: passwordSchema,
  role: z.enum(['admin', 'employee']),
  permissions: z
    .array(permissionEntrySchema)
    .default([])
    .refine(validActionsRefine, { message: 'Invalid action in permissions' }),
}).strict();

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: emailField.optional(),
  role: z.enum(['admin', 'employee']).optional(),
}).strict();

export const deactivateUserSchema = z.object({}).strict();

export const reactivateUserSchema = z.object({}).strict();

export const updatePermissionsSchema = z.object({
  permissions: z
    .array(permissionEntrySchema)
    .min(0)
    .refine(validActionsRefine, { message: 'Invalid action in permissions' }),
}).strict();

export const changePasswordSchema = z.object({
  prevPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();

export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
}).strict();

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['admin', 'employee']).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional(),
  search: z.string().max(100).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ListUsersDto = z.infer<typeof listUsersSchema>;
export type UpdatePermissionsDto = z.infer<typeof updatePermissionsSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordDto = z.infer<typeof adminResetPasswordSchema>;
