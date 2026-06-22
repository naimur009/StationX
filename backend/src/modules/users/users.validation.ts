import { z } from 'zod';
import { MODULE_ACTIONS } from '../../shared/constants';
import { emailField, passwordSchema } from '../../shared/validation';

const moduleKeys = Object.keys(MODULE_ACTIONS) as [string, ...string[]];

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailField,
  password: passwordSchema,
  role: z.enum(['manager', 'employee']),
  permissions: z
    .array(
      z.object({
        module: z.string(),
        actions: z.array(z.string()),
      })
    )
    .default([])
    .refine(
      (permissions) =>
        permissions.every(
          (p) =>
            moduleKeys.includes(p.module) &&
            p.actions.every((a) => (MODULE_ACTIONS[p.module] as readonly string[]).includes(a))
        ),
      { message: 'Invalid module or action in permissions' }
    ),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: emailField.optional(),
  role: z.enum(['manager', 'employee']).optional(),
}).strict();

export const deactivateUserSchema = z.object({}).strict();

export const reactivateUserSchema = z.object({}).strict();

export const updatePermissionsSchema = z.object({
  permissions: z
    .array(
      z.object({
        module: z.string(),
        actions: z.array(z.string()),
      })
    )
    .min(0)
    .refine(
      (permissions) =>
        permissions.every((p) => {
          const validActions = MODULE_ACTIONS[p.module];
          return !validActions || p.actions.every((a) => (validActions as readonly string[]).includes(a));
        }),
      { message: 'Invalid action in permissions' }
    ),
}).strict();

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional(),
  search: z.string().max(100).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ListUsersDto = z.infer<typeof listUsersSchema>;
export type UpdatePermissionsDto = z.infer<typeof updatePermissionsSchema>;
