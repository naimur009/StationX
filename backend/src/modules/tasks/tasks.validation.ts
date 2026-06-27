import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  assignedTo: z.string().min(1, 'Assignee is required'),
  priority: z.enum(['low', 'medium', 'high']),
  deadline: z.coerce.date({ required_error: 'Deadline is required' }),
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.coerce.date().optional(),
}).strict();

export const updateTaskStatusSchema = z.object({
  status: z.enum(['in_progress', 'completed']),
}).strict();

export const listTasksQuerySchema = z.object({
  assignedTo: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  sort: z.enum([
    'deadline', '-deadline',
    'createdAt', '-createdAt',
    'priority', '-priority',
  ]).default('-createdAt'),
  page: z.coerce.number().int().positive('Page must be a positive number').max(1000, 'Page number must not exceed 1000').default(1),
  limit: z.coerce.number().int().positive('Limit must be a positive number').max(100, 'Limit must not exceed 100').default(20),
}).strict();

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusDto = z.infer<typeof updateTaskStatusSchema>;
export type ListTasksDto = z.infer<typeof listTasksQuerySchema>;
