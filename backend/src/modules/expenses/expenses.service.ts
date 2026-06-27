import mongoose from 'mongoose';
import Expense from '../../models/Expense';
import Vendor from '../../models/Vendor';
import User from '../../models/User';
import { createError } from '../../middleware/errorHandler';
import { escapeRegex } from '../../lib/escapeRegex';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ListExpensesQuery,
} from './expenses.validation';

interface PopulatedVendor {
  _id: string;
  name: string;
}

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
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
  paidBy: PopulatedUser;
  paidTo: string;
  paymentMethod: string;
  createdBy: PopulatedCreator;
  createdAt: Date;
  updatedAt: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeDateRange(
  range?: string,
  from?: string,
  to?: string
): Record<string, Date> | undefined {
  if (!range) return undefined;

  const now = new Date();

  switch (range) {
    case 'today':
      return { $gte: startOfDay(now), $lte: endOfDay(now) };
    case 'week':
      return { $gte: startOfWeek(now), $lte: endOfDay(now) };
    case 'month':
      return { $gte: startOfMonth(now), $lte: endOfDay(now) };
    case 'custom':
      if (from && to) {
        return { $gte: new Date(from), $lte: endOfDay(new Date(to)) };
      }
      return undefined;
    default:
      return undefined;
  }
}

function toData(expense: Record<string, unknown>): ExpenseData {
  return {
    id: String(expense._id),
    amount: expense.amount as number,
    date: expense.date as Date,
    description: expense.description as string,
    category: expense.category as string,
    vendorId: expense.vendorId as PopulatedVendor | null | undefined,
    paidBy: expense.paidBy as PopulatedUser,
    paidTo: expense.paidTo as string,
    paymentMethod: expense.paymentMethod as string,
    createdBy: expense.createdBy as PopulatedCreator,
    createdAt: expense.createdAt as Date,
    updatedAt: expense.updatedAt as Date,
  };
}

export async function listExpenses(query: ListExpensesQuery) {
  const filter: Record<string, unknown> = {};
  const dateFilter = computeDateRange(query.range, query.from, query.to);

  if (dateFilter) {
    filter.date = dateFilter;
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

  const skip = (query.page - 1) * query.limit;

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate('vendorId', 'name')
      .populate('paidBy', 'name email')
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  const data = expenses.map((expense) => toData(expense as unknown as Record<string, unknown>));

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

  return toData(expense as unknown as Record<string, unknown>);
}

export async function createExpense(dto: CreateExpenseDto, userId: string) {
  if (dto.vendorId) {
    const vendor = await Vendor.findById(dto.vendorId);
    if (!vendor) {
      throw createError(404, 'VENDOR_NOT_FOUND', 'Referenced vendor not found');
    }
  }

  const paidByUser = await User.findById(dto.paidBy);
  if (!paidByUser) {
    throw createError(404, 'USER_NOT_FOUND', 'Referenced paidBy user not found');
  }

  const expense = await Expense.create({
    ...dto,
    vendorId: dto.vendorId || undefined,
    createdBy: userId,
  });

  const populated = await Expense.findById(expense._id)
    .populate('vendorId', 'name')
    .populate('paidBy', 'name email')
    .populate('createdBy', 'name')
    .lean();

  return toData(populated! as unknown as Record<string, unknown>);
}

export async function updateExpense(id: string, dto: UpdateExpenseDto) {
  if (dto.vendorId) {
    const vendor = await Vendor.findById(dto.vendorId);
    if (!vendor) {
      throw createError(404, 'VENDOR_NOT_FOUND', 'Referenced vendor not found');
    }
  }

  if (dto.paidBy) {
    const paidByUser = await User.findById(dto.paidBy);
    if (!paidByUser) {
      throw createError(404, 'USER_NOT_FOUND', 'Referenced paidBy user not found');
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

  return toData(updated as unknown as Record<string, unknown>);
}

export async function deleteExpense(id: string) {
  const expense = await Expense.findByIdAndDelete(id);

  if (!expense) {
    throw createError(404, 'NOT_FOUND', 'Expense not found');
  }

  return { success: true };
}
