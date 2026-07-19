import mongoose from 'mongoose';
import Income from '../../models/Income';
import Employee from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import { normalizeDateRange } from '../../lib/date-range';
import type {
  CreateIncomeDto,
  UpdateIncomeDto,
  ListIncomesQuery,
} from './incomes.validation';

interface PopulatedEmployee {
  _id: string;
  name: string;
}

interface PopulatedCreator {
  _id: string;
  name: string;
}

interface IncomeData {
  id: string;
  amount: number;
  date: Date;
  description: string;
  category: string;
  receivedFrom: string;
  receivedBy: PopulatedEmployee;
  paymentMethod: string;
  createdBy: PopulatedCreator;
  createdAt: Date;
  updatedAt: Date;
}

function toData(income: Record<string, unknown>): IncomeData {
  return {
    id: String(income._id),
    amount: income.amount as number,
    date: income.date as Date,
    description: income.description as string,
    category: income.category as string,
    receivedFrom: income.receivedFrom as string,
    receivedBy: income.receivedBy as PopulatedEmployee,
    paymentMethod: income.paymentMethod as string,
    createdBy: income.createdBy as PopulatedCreator,
    createdAt: income.createdAt as Date,
    updatedAt: income.updatedAt as Date,
  };
}

export async function listIncomes(query: ListIncomesQuery) {
  const filter: Record<string, unknown> = {};

  if (query.range) {
    const dateRange = normalizeDateRange(query.range, query.from, query.to);
    filter.date = { $gte: dateRange.from, $lte: dateRange.to };
  }

  if (query.category) {
    filter.category = { $regex: escapeRegex(query.category), $options: 'i' };
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.receivedBy) {
    filter.receivedBy = new mongoose.Types.ObjectId(query.receivedBy);
  }

  const skip = (query.page - 1) * query.limit;

  const [incomes, total] = await Promise.all([
    Income.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate('receivedBy', 'name')
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Income.countDocuments(filter),
  ]);

  const data = incomes.map((income) => toData(income as unknown as Record<string, unknown>));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getIncomeById(id: string) {
  const income = await Income.findById(id)
    .populate('receivedBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  if (!income) {
    throw createError(404, 'NOT_FOUND', 'Income not found');
  }

  return toData(income as unknown as Record<string, unknown>);
}

export async function createIncome(dto: CreateIncomeDto, userId: string) {
  const receivedByEmployee = await Employee.findById(dto.receivedBy);
  if (!receivedByEmployee) {
    throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced receivedBy employee not found');
  }

  const income = await Income.create({
    ...dto,
    createdBy: userId,
  });

  const populated = await Income.findById(income._id)
    .populate('receivedBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  return toData(populated! as unknown as Record<string, unknown>);
}

export async function updateIncome(id: string, dto: UpdateIncomeDto) {
  if (dto.receivedBy) {
    const receivedByEmployee = await Employee.findById(dto.receivedBy);
    if (!receivedByEmployee) {
      throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced receivedBy employee not found');
    }
  }

  const updated = await Income.findByIdAndUpdate(
    id,
    { $set: dto },
    { new: true, runValidators: true }
  )
    .populate('receivedBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Income not found');
  }

  return toData(updated as unknown as Record<string, unknown>);
}

export async function getReferenceData() {
  const employees = await Employee.find({}).select('name').sort({ name: 1 }).lean();

  return {
    employees: employees.map((e) => ({ id: String(e._id), name: e.name })),
  };
}

export async function deleteIncome(id: string) {
  const income = await Income.findByIdAndDelete(id);

  if (!income) {
    throw createError(404, 'NOT_FOUND', 'Income not found');
  }

  return { success: true };
}
