import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(50).trim(),
  capacity: z.number().int('Capacity must be a whole number').positive('Capacity must be positive').optional(),
}).strict();

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(50).trim().optional(),
  capacity: z.number().int('Capacity must be a whole number').positive('Capacity must be positive').optional().nullable(),
}).strict();

export const updateTableStatusSchema = z.object({
  status: z.enum(['available', 'booked']),
  notes: z.string().max(200).optional(),
}).strict();

export const listTablesSchema = z.object({
  status: z.enum(['available', 'booked']).optional(),
});

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateTableDto = z.infer<typeof createTableSchema>;
export type UpdateTableDto = z.infer<typeof updateTableSchema>;
export type UpdateTableStatusDto = z.infer<typeof updateTableStatusSchema>;
export type ListTablesDto = z.infer<typeof listTablesSchema>;
