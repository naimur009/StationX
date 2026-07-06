import { z } from 'zod';

const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'half-day']);

const recordSchema = z.object({
  employeeId: z.string().min(1, 'employeeId is required'),
  status: attendanceStatusEnum,
  checkInAt: z.coerce.date().optional(),
  checkOutAt: z.coerce.date().optional(),
  notes: z.string().max(500).trim().optional(),
});

export const createAttendanceSchema = recordSchema.extend({
  date: z.coerce.date().optional(),
}).strict();

export const batchAttendanceSchema = z.object({
  date: z.coerce.date().optional(),
  records: z.array(recordSchema).min(1, 'At least one record is required').max(100, 'Maximum 100 records per batch'),
}).strict();

export const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum.optional(),
  checkInAt: z.coerce.date().optional().nullable(),
  checkOutAt: z.coerce.date().optional().nullable(),
  notes: z.string().max(500).trim().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const todayQuerySchema = z.object({
  date: z.string().optional(),
}).strict();

export const listAttendanceQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: attendanceStatusEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const objectIdParam = z.object({
  id: z.string().min(1),
});

export type CreateAttendanceDto = z.infer<typeof createAttendanceSchema>;
export type BatchAttendanceRecord = z.infer<typeof recordSchema>;
export type BatchAttendanceDto = z.infer<typeof batchAttendanceSchema>;
export type UpdateAttendanceDto = z.infer<typeof updateAttendanceSchema>;
export type TodayQueryDto = z.infer<typeof todayQuerySchema>;
export type ListAttendanceQueryDto = z.infer<typeof listAttendanceQuerySchema>;
