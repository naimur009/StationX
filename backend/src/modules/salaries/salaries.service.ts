import mongoose from 'mongoose';
import Salary from '../../models/Salary';
import Employee from '../../models/Employee';
import SalaryAdjustment, { ISalaryAdjustment } from '../../models/SalaryAdjustment';
import SalarySummary from '../../models/SalarySummary';
import { createError } from '../../middleware/errorHandler';
import { paginate } from '../../lib/pagination';
import type {
  CreateSalaryDto,
  AddAdvanceDto,
  UpdateSalaryStatusDto,
  ListSalariesQuery,
  CreateAdjustmentDto,
  ListAdjustmentsQuery,
  UpdateAdjustmentDto,
  SalaryReportQuery,
  SalarySummaryQuery,
  EmployeeReportQuery,
} from './salaries.validation';

interface PopulatedEmployee {
  _id: string;
  name: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface PopulatedCreator {
  _id: string;
  name: string;
}

interface AdvanceData {
  _id: string;
  amount: number;
  date: Date;
  note?: string;
  createdBy: PopulatedCreator;
}

interface SalaryData {
  id: string;
  employeeId: PopulatedEmployee;
  baseSalary: number;
  month: number;
  year: number;
  advances: AdvanceData[];
  totalPaid: number;
  remainingBalance: number;
  status: string;
  paidAt?: Date;
  createdBy: PopulatedCreator;
  createdAt: Date;
  updatedAt: Date;
}

function toData(salary: Record<string, unknown>): SalaryData {
  const advances = (salary.advances as Array<Record<string, unknown>>) || [];
  const totalPaid = advances.reduce((sum, a) => sum + (a.amount as number), 0);
  const baseSalary = salary.baseSalary as number;

  return {
    id: String(salary._id),
    employeeId: salary.employeeId as PopulatedEmployee,
    baseSalary,
    month: salary.month as number,
    year: salary.year as number,
    advances: advances.map((a) => ({
      _id: String(a._id),
      amount: a.amount as number,
      date: a.date as Date,
      note: a.note as string | undefined,
      createdBy: a.createdBy as PopulatedCreator,
    })),
    totalPaid,
    remainingBalance: Math.max(0, baseSalary - totalPaid),
    status: salary.status as string,
    paidAt: salary.paidAt as Date | undefined,
    createdBy: salary.createdBy as PopulatedCreator,
    createdAt: salary.createdAt as Date,
    updatedAt: salary.updatedAt as Date,
  };
}

export async function listSalaries(query: ListSalariesQuery) {
  const filter: Record<string, unknown> = {};

  if (query.month) filter.month = query.month;
  if (query.year) filter.year = query.year;
  if (query.employeeId) {
    filter.employeeId = new mongoose.Types.ObjectId(query.employeeId);
  }
  if (query.status) filter.status = query.status;

  const { skip, limit } = paginate(query.page, query.limit);

  const [salaries, total] = await Promise.all([
    Salary.find(filter)
      .sort({ year: -1, month: -1 })
      .populate('employeeId', 'name')
      .populate('createdBy', 'name')
      .populate('advances.createdBy', 'name')
      .skip(skip)
      .limit(limit)
      .lean(),
    Salary.countDocuments(filter),
  ]);

  const data = salaries.map((s) => toData(s as unknown as Record<string, unknown>));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getSalaryById(id: string) {
  const salary = await Salary.findById(id)
    .populate('employeeId', 'name')
    .populate('createdBy', 'name')
    .populate('advances.createdBy', 'name')
    .lean();

  if (!salary) {
    throw createError(404, 'NOT_FOUND', 'Salary record not found');
  }

  return toData(salary as unknown as Record<string, unknown>);
}

export async function createSalary(dto: CreateSalaryDto, userId: string) {
  const employee = await Employee.findById(dto.employeeId);
  if (!employee) {
    throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced employee not found');
  }

  const existing = await Salary.findOne({
    employeeId: dto.employeeId,
    month: dto.month,
    year: dto.year,
  });

  if (existing) {
    throw createError(409, 'SALARY_ALREADY_EXISTS', 'Salary record for this employee/month/year already exists');
  }

  const baseSalary = employee.baseSalary || 0;

  if (dto.paidAmount > baseSalary) {
    throw createError(400, 'EXCEEDS_SALARY', 'Paid amount cannot exceed the employee base salary');
  }

  const advances: Array<{ amount: number; date: Date; note?: string; createdBy: mongoose.Types.ObjectId }> = [];

  if (dto.paidAmount > 0) {
    advances.push({
      amount: dto.paidAmount,
      date: new Date(),
      createdBy: new mongoose.Types.ObjectId(userId),
    });
  }

  const totalPaid = dto.paidAmount;
  const status = totalPaid >= baseSalary ? 'paid' : 'active';

  let salary;
  try {
    salary = await Salary.create({
      employeeId: dto.employeeId,
      baseSalary,
      month: dto.month,
      year: dto.year,
      advances,
      status,
      paidAt: status === 'paid' ? new Date() : undefined,
      createdBy: userId,
    });
  } catch (error: unknown) {
    const mongoError = error as { code?: number; keyValue?: Record<string, unknown> };
    if (mongoError.code === 11000) {
      console.error('[E11000] Duplicate salary key. employeeId:', dto.employeeId, 'month:', dto.month, 'year:', dto.year, 'keyValue:', JSON.stringify(mongoError.keyValue));
      throw createError(409, 'SALARY_ALREADY_EXISTS', 'Salary record for this employee/month/year already exists');
    }
    throw error;
  }

  const populated = await Salary.findById(salary._id)
    .populate('employeeId', 'name')
    .populate('createdBy', 'name')
    .populate('advances.createdBy', 'name')
    .lean();

  return toData(populated! as unknown as Record<string, unknown>);
}

export async function addAdvance(salaryId: string, dto: AddAdvanceDto, userId: string) {
  const salary = await Salary.findById(salaryId);

  if (!salary) {
    throw createError(404, 'NOT_FOUND', 'Salary record not found');
  }

  if (salary.status !== 'active') {
    throw createError(400, 'INVALID_SALARY_STATUS', 'Can only add advances to active salary records');
  }

  const amount = round2(dto.amount);

  const result = await Salary.updateOne(
    {
      _id: salaryId,
      status: 'active',
      $expr: {
        $lte: [
          { $add: [{ $sum: '$advances.amount' }, amount] },
          '$baseSalary',
        ],
      },
    },
    {
      $push: {
        advances: {
          amount,
          date: dto.date,
          note: dto.note,
          createdBy: new mongoose.Types.ObjectId(userId),
        },
      },
    }
  );

  if (result.matchedCount === 0) {
    const fresh = await Salary.findById(salaryId);
    if (!fresh) {
      throw createError(404, 'NOT_FOUND', 'Salary record not found');
    }
    if (fresh.status !== 'active') {
      throw createError(400, 'INVALID_SALARY_STATUS', 'Can only add advances to active salary records');
    }
    throw createError(400, 'EXCEEDS_SALARY', 'Advance amount would exceed remaining balance');
  }

  const totalPaid = salary.advances.reduce((sum, a) => sum + a.amount, 0) + amount;
  if (Math.abs(totalPaid - salary.baseSalary) < 0.01) {
    await Salary.updateOne(
      { _id: salaryId, status: 'active' },
      { $set: { status: 'paid', paidAt: new Date() } }
    );
  }

  const updated = await Salary.findById(salaryId)
    .populate('employeeId', 'name')
    .populate('createdBy', 'name')
    .populate('advances.createdBy', 'name')
    .lean();

  return toData(updated! as unknown as Record<string, unknown>);
}

export async function updateSalaryStatus(salaryId: string, dto: UpdateSalaryStatusDto) {
  const salary = await Salary.findById(salaryId);

  if (!salary) {
    throw createError(404, 'NOT_FOUND', 'Salary record not found');
  }

  if (salary.status !== 'active') {
    throw createError(400, 'INVALID_SALARY_STATUS', 'Can only transition a salary record from active status');
  }

  if (dto.status === 'cancelled' && salary.advances.length > 0) {
    throw createError(400, 'HAS_ADVANCES', 'Cannot cancel a salary record with advances');
  }

  salary.status = dto.status;
  if (dto.status === 'paid') {
    salary.paidAt = new Date();
  }
  await salary.save();

  const populated = await Salary.findById(salary._id)
    .populate('employeeId', 'name')
    .populate('createdBy', 'name')
    .populate('advances.createdBy', 'name')
    .lean();

  return toData(populated! as unknown as Record<string, unknown>);
}

export async function deleteSalary(id: string, force = false) {
  const salary = await Salary.findById(id);

  if (!salary) {
    throw createError(404, 'NOT_FOUND', 'Salary record not found');
  }

  if (!force && salary.advances.length > 0) {
    throw createError(409, 'SALARY_HAS_ADVANCES', 'Cannot delete a salary record that has advances');
  }

  await salary.deleteOne();

  return { success: true };
}

// ---- Salary Adjustments (Bonus / Cut) ----

interface PopulatedAdjustmentCreator {
  _id: string;
  name: string;
}

interface AdjustmentData {
  id: string;
  employeeId: string;
  salaryId?: string;
  type: 'bonus' | 'cut';
  amount: number;
  reason: string;
  date: Date;
  month: number;
  year: number;
  createdBy: PopulatedAdjustmentCreator;
  createdAt: Date;
}

function toAdjustmentData(adj: Record<string, unknown>): AdjustmentData {
  return {
    id: String(adj._id),
    employeeId: adj.employeeId as string,
    salaryId: adj.salaryId as string | undefined,
    type: adj.type as 'bonus' | 'cut',
    amount: adj.amount as number,
    reason: adj.reason as string,
    date: adj.date as Date,
    month: adj.month as number,
    year: adj.year as number,
    createdBy: adj.createdBy as PopulatedAdjustmentCreator,
    createdAt: adj.createdAt as Date,
  };
}

export async function listAdjustments(query: ListAdjustmentsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.employeeId) {
    filter.employeeId = new mongoose.Types.ObjectId(query.employeeId);
  }
  if (query.salaryId) {
    filter.salaryId = new mongoose.Types.ObjectId(query.salaryId);
  }
  if (query.type) filter.type = query.type;
  if (query.month) filter.month = query.month;
  if (query.year) filter.year = query.year;

  const { skip, limit } = paginate(query.page, query.limit);

  const [adjustments, total] = await Promise.all([
    SalaryAdjustment.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(limit)
      .lean(),
    SalaryAdjustment.countDocuments(filter),
  ]);

  const data = adjustments.map((a) => toAdjustmentData(a as unknown as Record<string, unknown>));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getAdjustmentById(id: string) {
  const adjustment = await SalaryAdjustment.findById(id)
    .populate('createdBy', 'name')
    .lean();

  if (!adjustment) {
    throw createError(404, 'NOT_FOUND', 'Adjustment not found');
  }

  return toAdjustmentData(adjustment as unknown as Record<string, unknown>);
}

export async function createAdjustment(dto: CreateAdjustmentDto, userId: string) {
  const employee = await Employee.findById(dto.employeeId);
  if (!employee) {
    throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced employee not found');
  }

  if (dto.salaryId) {
    const salary = await Salary.findById(dto.salaryId);
    if (!salary) {
      throw createError(404, 'NOT_FOUND', 'Referenced salary record not found');
    }
  }

  if (dto.type === 'cut' && dto.amount > employee.baseSalary) {
    throw createError(400, 'ADJUSTMENT_EXCEEDS_SALARY', 'Cut amount cannot exceed the employee base salary');
  }

  const adjustment = await SalaryAdjustment.create({
    employeeId: dto.employeeId,
    salaryId: dto.salaryId || undefined,
    type: dto.type,
    amount: dto.amount,
    reason: dto.reason,
    date: dto.date,
    month: dto.month,
    year: dto.year,
    createdBy: userId,
  });

  const populated = await SalaryAdjustment.findById(adjustment._id)
    .populate('createdBy', 'name')
    .lean();

  return toAdjustmentData(populated! as unknown as Record<string, unknown>);
}

export async function deleteAdjustment(id: string) {
  const adjustment = await SalaryAdjustment.findByIdAndDelete(id);

  if (!adjustment) {
    throw createError(404, 'NOT_FOUND', 'Adjustment not found');
  }

  return { success: true };
}

export async function updateAdjustment(id: string, dto: UpdateAdjustmentDto) {
  const existing = await SalaryAdjustment.findById(id);

  if (!existing) {
    throw createError(404, 'NOT_FOUND', 'Adjustment not found');
  }

  const finalType = dto.type ?? existing.type;
  const finalAmount = dto.amount ?? existing.amount;

  if (finalType === 'cut') {
    const employee = await Employee.findById(existing.employeeId);
    if (employee && finalAmount > employee.baseSalary) {
      throw createError(400, 'ADJUSTMENT_EXCEEDS_SALARY', 'Cut amount cannot exceed the employee base salary');
    }
  }

  const allowedFields: Array<keyof UpdateAdjustmentDto> = ['type', 'amount', 'reason', 'date'];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (dto[field] !== undefined) {
      updateData[field] = dto[field];
    }
  }

  const adjustment = await SalaryAdjustment.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
    .populate('createdBy', 'name')
    .lean();

  if (!adjustment) {
    throw createError(404, 'NOT_FOUND', 'Adjustment not found');
  }

  return toAdjustmentData(adjustment as unknown as Record<string, unknown>);
}

// ---- Salary Summary ----

interface SummaryData {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  totalSalary: number;
  totalBonus: number;
  totalCut: number;
  totalPaid: number;
  netSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

function toSummaryData(summary: Record<string, unknown>): SummaryData {
  return {
    id: String(summary._id),
    employeeId: summary.employeeId as string,
    month: summary.month as number,
    year: summary.year as number,
    totalSalary: summary.totalSalary as number,
    totalBonus: summary.totalBonus as number,
    totalCut: summary.totalCut as number,
    totalPaid: summary.totalPaid as number,
    netSalary: summary.netSalary as number,
    createdAt: summary.createdAt as Date,
    updatedAt: summary.updatedAt as Date,
  };
}

export async function getOrCreateSalarySummary(query: SalarySummaryQuery) {
  const employee = await Employee.findById(query.employeeId);
  if (!employee) {
    throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced employee not found');
  }

  const salary = await Salary.findOne({
    employeeId: query.employeeId,
    month: query.month,
    year: query.year,
  }).lean();

  const adjustments = await SalaryAdjustment.find({
    employeeId: query.employeeId,
    month: query.month,
    year: query.year,
  }).lean();

  const totalSalary = (salary?.baseSalary as number) || 0;
  const totalBonus = adjustments
    .filter((a) => a.type === 'bonus')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalCut = adjustments
    .filter((a) => a.type === 'cut')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = salary
    ? ((salary.advances as Array<{ amount: number }>) || []).reduce((sum, a) => sum + a.amount, 0)
    : 0;
  const netSalary = totalSalary + totalBonus - totalCut;

  const summary = await SalarySummary.findOneAndUpdate(
    {
      employeeId: query.employeeId,
      month: query.month,
      year: query.year,
    },
    {
      $set: { totalSalary, totalBonus, totalCut, totalPaid, netSalary },
    },
    { upsert: true, new: true }
  ).lean();

  return toSummaryData(summary as unknown as Record<string, unknown>);
}

// ---- Salary Report ----

interface EmployeeReportEntry {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  totalBonus: number;
  totalCut: number;
  netSalary: number;
  totalPaid: number;
  salaryStatus: string;
  paidAt?: Date;
}

interface SalaryReportData {
  period: { month?: number; year: number };
  grandTotalBaseSalary: number;
  grandTotalBonus: number;
  grandTotalCut: number;
  grandTotalNet: number;
  grandTotalPaid: number;
  employees: EmployeeReportEntry[];
  employeeCount: number;
}

export async function getSalaryReport(query: SalaryReportQuery) {
  const salaryFilter: Record<string, unknown> = {};
  const adjFilter: Record<string, unknown> = {};

  if (query.month) {
    salaryFilter.month = query.month;
    adjFilter.month = query.month;
  }
  salaryFilter.year = query.year;
  adjFilter.year = query.year;

  const [salaries, adjustments, allEmployees] = await Promise.all([
    Salary.find(salaryFilter)
      .populate('employeeId', 'name')
      .lean(),
    SalaryAdjustment.find(adjFilter)
      .lean(),
    Employee.find({}).select('_id name').lean(),
  ]);

  const adjByEmployee = new Map<string, { totalBonus: number; totalCut: number }>();
  for (const adj of adjustments) {
    const empId = String(adj.employeeId);
    const current = adjByEmployee.get(empId) ?? { totalBonus: 0, totalCut: 0 };
    if (adj.type === 'bonus') current.totalBonus += adj.amount;
    else current.totalCut += adj.amount;
    adjByEmployee.set(empId, current);
  }

  function salaryEmpId(s: Record<string, unknown>): string {
    const eid = s.employeeId as Record<string, unknown> | string;
    if (eid && typeof eid === 'object' && '_id' in eid) return String(eid._id);
    return String(eid);
  }

  function salaryEmpName(s: Record<string, unknown>): string {
    const eid = s.employeeId as Record<string, unknown> | string;
    if (eid && typeof eid === 'object' && 'name' in eid) return String(eid.name);
    return allEmployees.find((e) => String(e._id) === salaryEmpId(s))?.name ?? 'Unknown';
  }

  const salaryByEmployee = new Map<string, Record<string, unknown>>();
  for (const s of salaries) {
    salaryByEmployee.set(salaryEmpId(s), s);
  }

  const allEmployeeIds = new Set<string>();
  for (const s of salaries) allEmployeeIds.add(salaryEmpId(s));
  for (const adj of adjustments) allEmployeeIds.add(String(adj.employeeId));

  const employees: EmployeeReportEntry[] = [];

  for (const empId of allEmployeeIds) {
    const s = salaryByEmployee.get(empId);
    const adj = adjByEmployee.get(empId) ?? { totalBonus: 0, totalCut: 0 };
    const baseSalary = (s?.baseSalary as number) ?? 0;
    const totalBonus = adj.totalBonus;
    const totalCut = adj.totalCut;
    const totalPaid = s ? ((s.advances as Array<{ amount: number }> || []).reduce((sum, a) => sum + a.amount, 0)) : 0;
    const netSalary = baseSalary + totalBonus - totalCut;
    const employeeName = s ? salaryEmpName(s) : (allEmployees.find((e) => String(e._id) === empId)?.name ?? 'Unknown');

    employees.push({
      employeeId: empId,
      employeeName,
      baseSalary,
      totalBonus,
      totalCut,
      netSalary,
      totalPaid,
      salaryStatus: (s?.status as string) ?? 'no_salary',
      paidAt: (s?.paidAt as Date) ?? undefined,
    });
  }

  const grandTotalBaseSalary = employees.reduce((s, e) => s + e.baseSalary, 0);
  const grandTotalBonus = employees.reduce((s, e) => s + e.totalBonus, 0);
  const grandTotalCut = employees.reduce((s, e) => s + e.totalCut, 0);
  const grandTotalNet = employees.reduce((s, e) => s + e.netSalary, 0);
  const grandTotalPaid = employees.reduce((s, e) => s + e.totalPaid, 0);

  return {
    data: {
      period: { month: query.month, year: query.year },
      grandTotalBaseSalary,
      grandTotalBonus,
      grandTotalCut,
      grandTotalNet,
      grandTotalPaid,
      employees,
      employeeCount: employees.length,
    } as SalaryReportData,
  };
}

export async function getEmployeeReport(query: EmployeeReportQuery) {
  const [salaries, adjustments] = await Promise.all([
    Salary.find({ employeeId: query.employeeId, year: query.year })
      .populate('employeeId', 'name')
      .lean(),
    SalaryAdjustment.find({ employeeId: query.employeeId, year: query.year })
      .lean(),
  ]);

  const adjByMonth = new Map<string, { totalBonus: number; totalCut: number; adjustments: Array<{ id: string; type: 'bonus' | 'cut'; amount: number; reason: string; date: Date }> }>();
  for (const adj of adjustments) {
    const key = `${adj.month}-${adj.year}`;
    const current = adjByMonth.get(key) ?? { totalBonus: 0, totalCut: 0, adjustments: [] };
    if (adj.type === 'bonus') current.totalBonus += adj.amount;
    else current.totalCut += adj.amount;
    current.adjustments.push({
      id: String(adj._id),
      type: adj.type,
      amount: adj.amount,
      reason: adj.reason,
      date: adj.date,
    });
    adjByMonth.set(key, current);
  }

  const months: Array<{
    month: number;
    year: number;
    baseSalary: number;
    totalBonus: number;
    totalCut: number;
    netSalary: number;
    totalPaid: number;
    remainingBalance: number;
    status: string;
    paidAt?: Date;
    adjustments: Array<{ id: string; type: 'bonus' | 'cut'; amount: number; reason: string; date: Date }>;
  }> = [];

  for (let m = 1; m <= 12; m++) {
    const key = `${m}-${query.year}`;
    const salary = salaries.find((s) => s.month === m);
    const adj = adjByMonth.get(key);

    const baseSalary = salary?.baseSalary ?? 0;
    const totalBonus = adj?.totalBonus ?? 0;
    const totalCut = adj?.totalCut ?? 0;
    const netSalary = baseSalary + totalBonus - totalCut;
    const totalPaid = ((salary?.advances as Array<{ amount: number }>) || []).reduce((sum, a) => sum + a.amount, 0);

    months.push({
      month: m,
      year: query.year,
      baseSalary,
      totalBonus,
      totalCut,
      netSalary,
      totalPaid,
      remainingBalance: salary ? Math.max(0, salary.baseSalary - totalPaid) : 0,
      status: salary?.status ?? 'no_salary',
      paidAt: salary?.paidAt ?? undefined,
      adjustments: adj?.adjustments ?? [],
    });
  }

  function salaryEmpId(s: Record<string, unknown>): string {
    const eid = s.employeeId as Record<string, unknown> | string;
    if (eid && typeof eid === 'object' && '_id' in eid) return String(eid._id);
    return String(eid);
  }
  const employeeName = salaries[0]
    ? ((salaries[0].employeeId as unknown as PopulatedEmployee)?.name ?? 'Unknown')
    : 'Unknown';

  return {
    data: {
      employeeId: query.employeeId,
      employeeName,
      year: query.year,
      months,
    },
  };
}
