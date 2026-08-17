import Attendance, { IAttendance } from '../../models/Attendance';
import Employee from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import { paginate } from '../../lib/pagination';
import { getIO } from '../../config/socket';
import type {
  CreateAttendanceDto,
  BatchAttendanceDto,
  UpdateAttendanceDto,
  ListAttendanceQueryDto,
} from './attendance.validation';

interface PopulatedEmployee {
  _id: string;
  name: string;
}

interface PopulatedMarker {
  _id: string;
  name: string;
}

interface AttendanceResponse {
  id: string;
  employee: PopulatedEmployee | null;
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  markedBy: PopulatedMarker | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAttendanceItem {
  employee: PopulatedEmployee;
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
  errors: Array<{ employeeId: string; code: string; message: string }>;
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toResponse(record: IAttendance): AttendanceResponse {
  const employee = record.employee ? (record.employee as unknown as PopulatedEmployee) : null;
  const markedBy = record.markedBy ? (record.markedBy as unknown as PopulatedMarker) : null;
  return {
    id: record._id.toString(),
    employee,
    date: record.date instanceof Date ? formatDate(record.date) : String(record.date),
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
  if (!input) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  if (typeof input === 'string') {
    const parts = input.split('T')[0].split('-');
    return new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export async function getTodayStaff(queryDate?: string): Promise<TodayResponse> {
  const date = normalizeDate(queryDate || undefined);

  const allEmployees = await Employee.find()
    .select('name')
    .sort({ name: 1 })
    .lean();

  const employeeIds = allEmployees.map((e) => e._id);

  const attendanceRecords = await Attendance.find({
    employee: { $in: employeeIds },
    date,
  })
    .populate('employee', 'name')
    .populate('markedBy', 'name')
    .lean();

  const recordMap = new Map<string, IAttendance>();
  for (const rec of attendanceRecords) {
    recordMap.set(String(rec.employee._id), rec as unknown as IAttendance);
  }

  let present = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;
  let unmarked = 0;

  const staff: StaffAttendanceItem[] = allEmployees.map((e) => {
    const record = recordMap.get(String(e._id));
    if (record) {
      switch (record.status) {
        case 'present': present++; break;
        case 'absent': absent++; break;
        case 'late': late++; break;
        case 'half-day': halfDay++; break;
      }
      return {
        employee: e as unknown as PopulatedEmployee,
        attendance: toResponse(record),
      };
    }
    unmarked++;
    return {
      employee: e as unknown as PopulatedEmployee,
      attendance: null,
    };
  });

  const total = allEmployees.length;

  return {
    date: formatDate(date),
    summary: { present, absent, late, halfDay, unmarked, total },
    staff,
  };
}

export async function markAttendance(dto: CreateAttendanceDto, authenticatedUserId: string) {
  const date = dto.date ? normalizeDate(dto.date) : normalizeDate();


  const employee = await Employee.findById(dto.employeeId);
  if (!employee) {
    throw createError(404, 'NOT_FOUND', 'Employee not found');
  }

  try {
    const record = await Attendance.create({
      employee: dto.employeeId,
      date,
      status: dto.status,
      checkInAt: dto.checkInAt || undefined,
      checkOutAt: dto.checkOutAt || undefined,
      notes: dto.notes || undefined,
      markedBy: authenticatedUserId,
    });

    await record.populate('employee', 'name');
    await record.populate('markedBy', 'name');

    try {
      getIO().to('room:attendance').emit('attendance:marked', {
        employeeId: dto.employeeId,
        date: formatDate(date),
        status: dto.status,
      });
    } catch {
      // socket not available
    }

    return toResponse(record);
  } catch (error: unknown) {
    const mongoError = error as { code?: number; keyValue?: Record<string, unknown> };
    if (mongoError.code === 11000) {
      console.error('[E11000] Duplicate key. employeeId:', dto.employeeId, 'date:', date.toISOString(), 'keyValue:', JSON.stringify(mongoError.keyValue));
      throw createError(409, 'ALREADY_CHECKED_IN', 'Attendance already marked for this employee on this date');
    }
    throw error;
  }
}

export async function batchMarkAttendance(dto: BatchAttendanceDto, authenticatedUserId: string): Promise<BatchResult> {
  const date = dto.date ? normalizeDate(dto.date) : normalizeDate();

  const result: BatchResult = { created: 0, skipped: 0, errors: [] };

  const employeeIds = [...new Set(dto.records.map((r) => r.employeeId))];
  const existingEmployees = await Employee.find({ _id: { $in: employeeIds } })
    .select('_id')
    .lean();
  const validEmployeeIds = new Set(existingEmployees.map((e) => e._id.toString()));

  const attendanceRecords: Array<{
    employee: string;
    date: Date;
    status: string;
    checkInAt?: Date;
    checkOutAt?: Date;
    notes?: string;
    markedBy: string;
  }> = [];

  for (const record of dto.records) {
    if (!validEmployeeIds.has(record.employeeId)) {
      result.skipped++;
      result.errors.push({
        employeeId: record.employeeId,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
      continue;
    }

    attendanceRecords.push({
      employee: record.employeeId,
      date,
      status: record.status,
      checkInAt: record.checkInAt || undefined,
      checkOutAt: record.checkOutAt || undefined,
      notes: record.notes || undefined,
      markedBy: authenticatedUserId,
    });
  }

  if (attendanceRecords.length > 0) {
    try {
      await Attendance.insertMany(attendanceRecords, { ordered: false });
      result.created = attendanceRecords.length;
    } catch (error) {
      const bulkError = error as { writeErrors?: Array<{ err: { code?: number }; op: Record<string, unknown> }>; insertedCount?: number };
      if (bulkError.writeErrors) {
        result.created = bulkError.insertedCount ?? 0;
        for (const writeError of bulkError.writeErrors) {
          const code = writeError.err?.code === 11000 ? 'ALREADY_CHECKED_IN' : 'INTERNAL_ERROR';
          const message = writeError.err?.code === 11000
            ? 'Attendance already marked for this date'
            : 'Failed to process record';
          result.skipped++;
          result.errors.push({
            employeeId: (writeError.op?.employee as string) || 'unknown',
            code,
            message,
          });
        }
      } else {
        result.skipped = attendanceRecords.length;
        result.errors.push({
          employeeId: 'batch',
          code: 'BULK_INSERT_ERROR',
          message: 'Failed to insert attendance records',
        });
      }
    }
  }

  if (result.created > 0) {
    const failedIds = new Set(result.errors.map((e) => e.employeeId));
    for (const record of attendanceRecords) {
      if (failedIds.has(record.employee)) continue;
      try {
        getIO().to('room:attendance').emit('attendance:marked', {
          employeeId: record.employee,
          date: formatDate(date),
          status: record.status,
        });
      } catch {
        // socket not available
      }
    }
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

  await record.populate('employee', 'name');
  await record.populate('markedBy', 'name');

  try {
    getIO().to('room:attendance').emit('attendance:updated', {
      employeeId: record.employee._id,
      date: formatDate(record.date),
      status: record.status,
    });
  } catch {
    // socket not available
  }

  return toResponse(record);
}

export async function listAttendance(query: ListAttendanceQueryDto) {
  const filter: Record<string, unknown> = {};

  if (query.employeeId) {
    filter.employee = query.employeeId;
  }

  if (query.search) {
    const matchedEmployees = await Employee.find({
      name: { $regex: escapeRegex(query.search), $options: 'i' },
    })
      .select('_id')
      .lean();
    const ids = matchedEmployees.map((e) => e._id);
    if (ids.length === 0) {
      return { data: [], meta: { total: 0, page: query.page, limit: query.limit } };
    }
    filter.employee = query.employeeId
      ? { $in: ids, $eq: query.employeeId }
      : { $in: ids };
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

  const { skip, limit } = paginate(query.page, query.limit);

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'name')
      .populate('markedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
    .populate('employee', 'name')
    .populate('markedBy', 'name')
    .lean();

  if (!record) {
    throw createError(404, 'NOT_FOUND', 'Attendance record not found');
  }

  return toResponse(record as unknown as IAttendance);
}
