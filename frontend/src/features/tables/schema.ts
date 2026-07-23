import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(50).trim(),
  capacity: z.coerce.number().int('Capacity must be a whole number').positive('Capacity must be positive').optional().nullable(),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(50).trim().optional(),
  capacity: z.coerce.number().int('Capacity must be a whole number').positive('Capacity must be positive').optional().nullable(),
});

export const manualOverrideSchema = z.object({
  status: z.enum(['available', 'booked']),
  notes: z.string().max(200).optional(),
});

export type CreateTableFormData = z.infer<typeof createTableSchema>;
export type UpdateTableFormData = z.infer<typeof updateTableSchema>;
export type ManualOverrideFormData = z.infer<typeof manualOverrideSchema>;
