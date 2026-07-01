import mongoose from 'mongoose';
import Salary from '../../models/Salary';
import Employee from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import type {
  CreateSalaryDto,
  AddAdvanceDto,
  UpdateSalaryStatusDto,
  ListSalariesQuery,
} from './salaries.validation';

interface PopulatedEmployee {
  _id: string;
  name: string;
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

  const skip = (query.page - 1) * query.limit;

  const [salaries, total] = await Promise.all([
    Salary.find(filter)
      .sort({ year: -1, month: -1 })
      .populate('employeeId', 'name')
      .populate('createdBy', 'name')
      .populate('advances.createdBy', 'name')
      .skip(skip)
      .limit(query.limit)
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

  const salary = await Salary.create({
    employeeId: dto.employeeId,
    baseSalary,
    month: dto.month,
    year: dto.year,
    advances,
    status,
    createdBy: userId,
  });

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

  const totalPaid = salary.advances.reduce((sum, a) => sum + a.amount, 0);
  if (totalPaid + dto.amount > salary.baseSalary) {
    throw createError(400, 'EXCEEDS_SALARY', 'Advance amount would exceed remaining balance');
  }

  salary.advances.push({
    amount: dto.amount,
    date: dto.date,
    note: dto.note,
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  const newTotal = totalPaid + dto.amount;
  if (Math.abs(newTotal - salary.baseSalary) < 0.01) {
    salary.status = 'paid';
  }

  await salary.save();

  const populated = await Salary.findById(salary._id)
    .populate('employeeId', 'name')
    .populate('createdBy', 'name')
    .populate('advances.createdBy', 'name')
    .lean();

  return toData(populated! as unknown as Record<string, unknown>);
}

export async function updateSalaryStatus(salaryId: string, dto: UpdateSalaryStatusDto) {
  const salary = await Salary.findById(salaryId);

  if (!salary) {
    throw createError(404, 'NOT_FOUND', 'Salary record not found');
  }

  if (dto.status === 'cancelled' && salary.advances.length > 0) {
    throw createError(400, 'HAS_ADVANCES', 'Cannot cancel a salary record with advances');
  }

  salary.status = dto.status;
  await salary.save();

  const populated = await Salary.findById(salary._id)
    .populate('employeeId', 'name')
    .populate('createdBy', 'name')
    .populate('advances.createdBy', 'name')
    .lean();

  return toData(populated! as unknown as Record<string, unknown>);
}

export async function deleteSalary(id: string) {
  const salary = await Salary.findByIdAndDelete(id);

  if (!salary) {
    throw createError(404, 'NOT_FOUND', 'Salary record not found');
  }

  return { success: true };
}
