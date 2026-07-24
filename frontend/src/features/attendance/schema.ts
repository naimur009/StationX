import { z } from 'zod';

export const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'half-day']);

export const markAttendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  status: attendanceStatusEnum,
  date: z.string().optional(),
  checkInAt: z.string().optional(),
  checkOutAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const batchAttendanceRecordSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  status: attendanceStatusEnum,
  checkInAt: z.string().optional(),
  checkOutAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const batchAttendanceSchema = z.object({
  date: z.string().optional(),
  records: z.array(batchAttendanceRecordSchema).min(1).max(100),
});

export const attendanceFilterSchema = z.object({
  employeeId: z.string().optional(),
  status: attendanceStatusEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type MarkAttendanceFormData = z.infer<typeof markAttendanceSchema>;
export type BatchAttendanceFormData = z.infer<typeof batchAttendanceSchema>;
export type AttendanceFilterFormData = z.infer<typeof attendanceFilterSchema>;
