import mongoose from 'mongoose';
import Expense, { IExpense } from '../../models/Expense';
import Vendor from '../../models/Vendor';
import Employee from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import { getIO } from '../../config/socket';
import { escapeRegex } from '../../lib/escapeRegex';
import { normalizeDateRange } from '../../lib/date-range';
import { paginate } from '../../lib/pagination';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ListExpensesQuery,
} from './expenses.validation';

interface PopulatedVendor {
  _id: string;
  name: string;
}

interface PopulatedEmployee {
  _id: string;
  name: string;
}

interface PopulatedCreator {
  _id: string;
  name: string;
}

interface ExpenseData {
  id: string;
  amount: number;
  date: Date;
  description: string;
  category: string;
  vendorId?: PopulatedVendor | null;
  paidBy: PopulatedEmployee;
  paidTo: string;
  paymentMethod: string;
  createdBy: PopulatedCreator;
  createdAt: Date;
  updatedAt: Date;
}

function toData(expense: IExpense): ExpenseData {
  return {
    id: String(expense._id),
    amount: expense.amount as number,
    date: expense.date as Date,
    description: expense.description as string,
    category: expense.category as string,
    vendorId: expense.vendorId as unknown as PopulatedVendor | null | undefined,
    paidBy: expense.paidBy as unknown as PopulatedEmployee,
    paidTo: expense.paidTo as string,
    paymentMethod: expense.paymentMethod as string,
    createdBy: expense.createdBy as unknown as PopulatedCreator,
    createdAt: expense.createdAt as Date,
    updatedAt: expense.updatedAt as Date,
  };
}

export async function listExpenses(query: ListExpensesQuery) {
  const filter: Record<string, unknown> = {};

  if (query.range) {
    const dateRange = normalizeDateRange(query.range, query.from, query.to);
    filter.date = { $gte: dateRange.from, $lte: dateRange.to };
  }

  if (query.category) {
    filter.category = { $regex: escapeRegex(query.category), $options: 'i' };
  }

  if (query.vendorId) {
    filter.vendorId = new mongoose.Types.ObjectId(query.vendorId);
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.paidBy) {
    filter.paidBy = new mongoose.Types.ObjectId(query.paidBy);
  }

  const { skip, limit } = paginate(query.page, query.limit);

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate('vendorId', 'name')
      .populate('paidBy', 'name')
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  const data = expenses.map((expense) => toData(expense as unknown as IExpense));

  return {
    data,
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function getExpenseById(id: string) {
  const expense = await Expense.findById(id)
    .populate('vendorId', 'name')
    .populate('paidBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  if (!expense) {
    throw createError(404, 'NOT_FOUND', 'Expense not found');
  }

  return toData(expense as unknown as IExpense);
}

export async function createExpense(dto: CreateExpenseDto, userId: string) {
  if (dto.vendorId) {
    const vendor = await Vendor.findById(dto.vendorId);
    if (!vendor) {
      throw createError(404, 'VENDOR_NOT_FOUND', 'Referenced vendor not found');
    }
  }

  const paidByEmployee = await Employee.findById(dto.paidBy);
  if (!paidByEmployee) {
    throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced paidBy employee not found');
  }

  const expense = await Expense.create({
    ...dto,
    vendorId: dto.vendorId || undefined,
    createdBy: userId,
  });

  try {
    getIO().to('room:dashboard').emit('dashboard:metricsInvalidate');
  } catch {
    // Socket.io not initialized — skip real-time event
  }

  const populated = await Expense.findById(expense._id)
    .populate('vendorId', 'name')
    .populate('paidBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  if (!populated) {
    throw createError(500, 'INTERNAL_ERROR', 'Failed to load created expense');
  }

  return toData(populated as unknown as IExpense);
}

export async function updateExpense(id: string, dto: UpdateExpenseDto) {
  if (dto.vendorId) {
    const vendor = await Vendor.findById(dto.vendorId);
    if (!vendor) {
      throw createError(404, 'VENDOR_NOT_FOUND', 'Referenced vendor not found');
    }
  }

  if (dto.paidBy) {
    const paidByEmployee = await Employee.findById(dto.paidBy);
    if (!paidByEmployee) {
      throw createError(404, 'EMPLOYEE_NOT_FOUND', 'Referenced paidBy employee not found');
    }
  }

  const updated = await Expense.findByIdAndUpdate(
    id,
    { $set: dto },
    { new: true, runValidators: true }
  )
    .populate('vendorId', 'name')
    .populate('paidBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  if (!updated) {
    throw createError(404, 'NOT_FOUND', 'Expense not found');
  }

  return toData(updated as unknown as IExpense);
}

export async function getReferenceData() {
  const [vendors, employees] = await Promise.all([
    Vendor.find({}).select('name').sort({ name: 1 }).lean(),
    Employee.find({}).select('name').sort({ name: 1 }).lean(),
  ]);

  return {
    vendors: vendors.map((v) => ({ id: String(v._id), name: v.name })),
    employees: employees.map((e) => ({ id: String(e._id), name: e.name })),
  };
}

export async function deleteExpense(id: string) {
  const expense = await Expense.findByIdAndDelete(id);

  if (!expense) {
    throw createError(404, 'NOT_FOUND', 'Expense not found');
  }

  return { success: true };
}
