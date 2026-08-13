import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  assignedTo: z.string().min(1, 'Assignee is required'),
  priority: z.enum(['low', 'medium', 'high']),
  deadline: z.coerce.date({ required_error: 'Deadline is required' }),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  deadline: z.coerce.date().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['in_progress', 'completed']),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
