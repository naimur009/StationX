import Attendance, { IAttendance } from '../../models/Attendance';
import User from '../../models/User';
import { createError } from '../../middleware/errorHandler';
import type {
  CreateAttendanceDto,
  BatchAttendanceDto,
  BatchAttendanceRecord,
  UpdateAttendanceDto,
  ListAttendanceQueryDto,
} from './attendance.validation';

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface PopulatedMarker {
  _id: string;
  name: string;
}

interface AttendanceResponse {
  id: string;
  user: PopulatedUser;
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  markedBy: PopulatedMarker;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAttendanceItem {
  user: PopulatedUser;
  attendance: AttendanceResponse | null;
}

export interface TodayResponse {
  date: string;
  summary: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    unmarked: number;
    total: number;
  };
  staff: StaffAttendanceItem[];
}

interface BatchResult {
  created: number;
  skipped: number;
  errors: Array<{ userId: string; code: string; message: string }>;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toResponse(record: IAttendance): AttendanceResponse {
  const user = record.user as unknown as PopulatedUser;
  const markedBy = record.markedBy as unknown as PopulatedMarker;
  return {
    id: record._id.toString(),
    user,
    date: record.date instanceof Date ? formatLocalDate(record.date) : String(record.date),
    status: record.status,
    checkInAt: record.checkInAt instanceof Date ? record.checkInAt.toISOString() : null,
    checkOutAt: record.checkOutAt instanceof Date ? record.checkOutAt.toISOString() : null,
    notes: record.notes || null,
    markedBy,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
  };
}

function normalizeDate(input?: Date | string): Date {
  const d = input ? new Date(input) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function tryEmit(event: string, data: Record<string, unknown>): void {
  try {
    const { getIO } = require('../../config/socket');
    const io = getIO();
    io.emit(event, data);
  } catch {
    // socket not available
  }
}

export async function getTodayStaff(queryDate?: string): Promise<TodayResponse> {
  const date = normalizeDate(queryDate || undefined);

  const activeUsers = await User.find({
    role: { $in: ['employee', 'manager'] },
    isActive: true,
  })
    .select('name email role')
    .sort({ name: 1 })
    .lean();

  const userIds = activeUsers.map((u) => u._id);

  const attendanceRecords = await Attendance.find({
    user: { $in: userIds },
    date,
  })
    .populate('user', 'name email role')
    .populate('markedBy', 'name')
    .lean();

  const recordMap = new Map<string, IAttendance>();
  for (const rec of attendanceRecords) {
    recordMap.set(String(rec.user._id), rec as unknown as IAttendance);
  }

  let present = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;
  let unmarked = 0;

  const staff: StaffAttendanceItem[] = activeUsers.map((u) => {
    const record = recordMap.get(String(u._id));
    if (record) {
      switch (record.status) {
        case 'present': present++; break;
        case 'absent': absent++; break;
        case 'late': late++; break;
        case 'half-day': halfDay++; break;
      }
      return {
        user: u as unknown as PopulatedUser,
        attendance: toResponse(record),
      };
    }
    unmarked++;
    return {
      user: u as unknown as PopulatedUser,
      attendance: null,
    };
  });

  const total = activeUsers.length;

  return {
    date: date.toISOString(),
    summary: { present, absent, late, halfDay, unmarked, total },
    staff,
  };
}

export async function markAttendance(dto: CreateAttendanceDto, authenticatedUserId: string) {
  const date = dto.date ? normalizeDate(dto.date) : normalizeDate();

  const user = await User.findById(dto.userId).select('_id isActive role');
  if (!user || !user.isActive) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }
  if (!['employee', 'manager'].includes(user.role)) {
    throw createError(400, 'VALIDATION_ERROR', 'Cannot mark attendance for admin users');
  }

  const existing = await Attendance.findOne({ user: dto.userId, date });
  if (existing) {
    throw createError(409, 'ALREADY_CHECKED_IN', 'Attendance already marked for this user on this date');
  }

  const record = await Attendance.create({
    user: dto.userId,
    date,
    status: dto.status,
    checkInAt: dto.checkInAt || undefined,
    checkOutAt: dto.checkOutAt || undefined,
    notes: dto.notes || undefined,
    markedBy: authenticatedUserId,
  });

  await record.populate('user', 'name email role');
  await record.populate('markedBy', 'name');

  tryEmit('attendance:marked', {
    userId: dto.userId,
    date: date.toISOString(),
    status: dto.status,
  });

  return toResponse(record);
}

export async function batchMarkAttendance(dto: BatchAttendanceDto, authenticatedUserId: string): Promise<BatchResult> {
  const date = dto.date ? normalizeDate(dto.date) : normalizeDate();

  const result: BatchResult = { created: 0, skipped: 0, errors: [] };

  for (const record of dto.records) {
    try {
      const user = await User.findById(record.userId).select('_id isActive role');
      if (!user || !user.isActive || !['employee', 'manager'].includes(user.role)) {
        result.skipped++;
        result.errors.push({
          userId: record.userId,
          code: 'USER_NOT_FOUND',
          message: 'User not found or not eligible',
        });
        continue;
      }

      const existing = await Attendance.findOne({ user: record.userId, date });
      if (existing) {
        result.skipped++;
        result.errors.push({
          userId: record.userId,
          code: 'ALREADY_CHECKED_IN',
          message: 'Attendance already marked for this date',
        });
        continue;
      }

      await Attendance.create({
        user: record.userId,
        date,
        status: record.status,
        checkInAt: record.checkInAt || undefined,
        checkOutAt: record.checkOutAt || undefined,
        notes: record.notes || undefined,
        markedBy: authenticatedUserId,
      });

      result.created++;
    } catch (error) {
      result.skipped++;
      result.errors.push({
        userId: record.userId,
        code: 'INTERNAL_ERROR',
        message: 'Failed to process record',
      });
    }
  }

  if (result.created > 0) {
    tryEmit('attendance:marked', {
      batch: true,
      date: date.toISOString(),
      count: result.created,
    });
  }

  return result;
}

export async function updateAttendance(id: string, dto: UpdateAttendanceDto) {
  const record = await Attendance.findById(id);
  if (!record) {
    throw createError(404, 'NOT_FOUND', 'Attendance record not found');
  }

  if (dto.status !== undefined) record.status = dto.status;
  if (dto.checkInAt !== undefined) record.checkInAt = dto.checkInAt ?? undefined;
  if (dto.checkOutAt !== undefined) record.checkOutAt = dto.checkOutAt ?? undefined;
  if (dto.notes !== undefined) record.notes = dto.notes;

  await record.save();

  await record.populate('user', 'name email role');
  await record.populate('markedBy', 'name');

  tryEmit('attendance:updated', {
    id: record._id.toString(),
    userId: record.user._id,
    date: record.date.toISOString(),
    status: record.status,
  });

  return toResponse(record);
}

export async function listAttendance(query: ListAttendanceQueryDto) {
  const filter: Record<string, unknown> = {};

  if (query.userId) {
    filter.user = query.userId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {};
    if (query.from) dateFilter.$gte = normalizeDate(query.from);
    if (query.to) {
      const toDate = normalizeDate(query.to);
      toDate.setDate(toDate.getDate() + 1);
      dateFilter.$lt = toDate;
    }
    filter.date = dateFilter;
  }

  const skip = (query.page - 1) * query.limit;

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('user', 'name email role')
      .populate('markedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  const data = (records as unknown as IAttendance[]).map((record) => toResponse(record));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getAttendanceById(id: string) {
  const record = await Attendance.findById(id)
    .populate('user', 'name email role')
    .populate('markedBy', 'name')
    .lean();

  if (!record) {
    throw createError(404, 'NOT_FOUND', 'Attendance record not found');
  }

  return toResponse(record as unknown as IAttendance);
}
