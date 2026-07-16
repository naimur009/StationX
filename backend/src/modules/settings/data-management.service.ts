import User from '../../models/User';
import Category from '../../models/Category';
import Product from '../../models/Product';
import Coupon from '../../models/Coupon';
import Customer from '../../models/Customer';
import Vendor from '../../models/Vendor';
import Order from '../../models/Order';
import Task from '../../models/Task';
import Employee from '../../models/Employee';
import Attendance from '../../models/Attendance';
import Salary from '../../models/Salary';
import SalaryAdjustment from '../../models/SalaryAdjustment';
import SalarySummary from '../../models/SalarySummary';
import Expense from '../../models/Expense';
import ActivityLog from '../../models/ActivityLog';
import Settings, { DEFAULT_SETTINGS } from '../../models/Settings';
import Counter from '../../models/Counter';
import { env } from '../../config/env';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function seedAdminUser(): Promise<void> {
  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await User.create({
    name: 'Admin',
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    permissions: [],
    isActive: true,
  });
}

export async function resetAllData(): Promise<void> {
  await User.deleteMany({ role: { $ne: 'admin' } });
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Customer.deleteMany({}),
    Vendor.deleteMany({}),
    Order.deleteMany({}),
    Task.deleteMany({}),
    Employee.deleteMany({}),
    Attendance.deleteMany({}),
    Salary.deleteMany({}),
    SalaryAdjustment.deleteMany({}),
    SalarySummary.deleteMany({}),
    Expense.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  await Settings.findByIdAndUpdate('restaurant-settings', { $set: DEFAULT_SETTINGS }, { upsert: true });
  await Counter.findByIdAndUpdate('orderNumber', { $set: { seq: 0 } }, { upsert: true });

  await seedAdminUser();
}

export async function generateBackup(): Promise<Record<string, unknown[]>> {
  const backup: Record<string, unknown[]> = {};

  backup['User'] = await User.find({}).lean();
  backup['Category'] = await Category.find({}).lean();
  backup['Product'] = await Product.find({}).lean();
  backup['Coupon'] = await Coupon.find({}).lean();
  backup['Customer'] = await Customer.find({}).lean();
  backup['Vendor'] = await Vendor.find({}).lean();
  backup['Order'] = await Order.find({}).lean();
  backup['Task'] = await Task.find({}).lean();
  backup['Employee'] = await Employee.find({}).lean();
  backup['Attendance'] = await Attendance.find({}).lean();
  backup['Salary'] = await Salary.find({}).lean();
  backup['SalaryAdjustment'] = await SalaryAdjustment.find({}).lean();
  backup['SalarySummary'] = await SalarySummary.find({}).lean();
  backup['Expense'] = await Expense.find({}).lean();
  backup['ActivityLog'] = await ActivityLog.find({}).lean();

  const settingsDoc = await Settings.findById('restaurant-settings').lean();
  const counterDoc = await Counter.findById('orderNumber').lean();

  if (settingsDoc) backup['Settings'] = [settingsDoc];
  if (counterDoc) backup['Counter'] = [counterDoc];

  return backup;
}

const EXPECTED_COLLECTION_KEYS = new Set([
  'User', 'Category', 'Product', 'Coupon', 'Customer', 'Vendor',
  'Order', 'Task', 'Employee', 'Attendance', 'Salary', 'SalaryAdjustment',
  'SalarySummary', 'Expense', 'ActivityLog', 'Settings', 'Counter',
]);

export async function restoreBackup(backupData: Record<string, unknown[]>): Promise<{ collections: number; documents: number }> {
  const providedKeys = Object.keys(backupData);
  for (const key of providedKeys) {
    if (!EXPECTED_COLLECTION_KEYS.has(key)) {
      const err = new Error(`Unexpected collection key in backup: "${key}"`) as Error & { statusCode?: number; code?: string };
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  for (const key of EXPECTED_COLLECTION_KEYS) {
    if (!providedKeys.includes(key)) {
      const err = new Error(`Missing required collection in backup: "${key}"`) as Error & { statusCode?: number; code?: string };
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  const adminCount = (backupData['User'] as Array<Record<string, unknown>>)
    .filter((u) => u.role === 'admin' && u.isActive !== false).length;
  if (adminCount === 0) {
    const err = new Error('Backup must contain at least one active admin user') as Error & { statusCode?: number; code?: string };
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  let totalDocuments = 0;

  type CollectionWriter = () => Promise<number>;

  const writers: CollectionWriter[] = [
    async () => { await Settings.deleteMany({}); if (backupData['Settings']?.length) { await Settings.insertMany(backupData['Settings'] as any, { ordered: false }); } return backupData['Settings']?.length ?? 0; },
    async () => { await Counter.deleteMany({}); if (backupData['Counter']?.length) { await Counter.insertMany(backupData['Counter'] as any, { ordered: false }); } return backupData['Counter']?.length ?? 0; },
    async () => { await User.deleteMany({ role: { $ne: 'admin' } }); if (backupData['User']?.length) { await User.insertMany(backupData['User'] as any, { ordered: false }); } return backupData['User']?.length ?? 0; },
    async () => { await Category.deleteMany({}); if (backupData['Category']?.length) { await Category.insertMany(backupData['Category'] as any, { ordered: false }); } return backupData['Category']?.length ?? 0; },
    async () => { await Product.deleteMany({}); if (backupData['Product']?.length) { await Product.insertMany(backupData['Product'] as any, { ordered: false }); } return backupData['Product']?.length ?? 0; },
    async () => { await Coupon.deleteMany({}); if (backupData['Coupon']?.length) { await Coupon.insertMany(backupData['Coupon'] as any, { ordered: false }); } return backupData['Coupon']?.length ?? 0; },
    async () => { await Customer.deleteMany({}); if (backupData['Customer']?.length) { await Customer.insertMany(backupData['Customer'] as any, { ordered: false }); } return backupData['Customer']?.length ?? 0; },
    async () => { await Vendor.deleteMany({}); if (backupData['Vendor']?.length) { await Vendor.insertMany(backupData['Vendor'] as any, { ordered: false }); } return backupData['Vendor']?.length ?? 0; },
    async () => { await Order.deleteMany({}); if (backupData['Order']?.length) { await Order.insertMany(backupData['Order'] as any, { ordered: false }); } return backupData['Order']?.length ?? 0; },
    async () => { await Task.deleteMany({}); if (backupData['Task']?.length) { await Task.insertMany(backupData['Task'] as any, { ordered: false }); } return backupData['Task']?.length ?? 0; },
    async () => { await Employee.deleteMany({}); if (backupData['Employee']?.length) { await Employee.insertMany(backupData['Employee'] as any, { ordered: false }); } return backupData['Employee']?.length ?? 0; },
    async () => { await Attendance.deleteMany({}); if (backupData['Attendance']?.length) { await Attendance.insertMany(backupData['Attendance'] as any, { ordered: false }); } return backupData['Attendance']?.length ?? 0; },
    async () => { await Salary.deleteMany({}); if (backupData['Salary']?.length) { await Salary.insertMany(backupData['Salary'] as any, { ordered: false }); } return backupData['Salary']?.length ?? 0; },
    async () => { await SalaryAdjustment.deleteMany({}); if (backupData['SalaryAdjustment']?.length) { await SalaryAdjustment.insertMany(backupData['SalaryAdjustment'] as any, { ordered: false }); } return backupData['SalaryAdjustment']?.length ?? 0; },
    async () => { await SalarySummary.deleteMany({}); if (backupData['SalarySummary']?.length) { await SalarySummary.insertMany(backupData['SalarySummary'] as any, { ordered: false }); } return backupData['SalarySummary']?.length ?? 0; },
    async () => { await Expense.deleteMany({}); if (backupData['Expense']?.length) { await Expense.insertMany(backupData['Expense'] as any, { ordered: false }); } return backupData['Expense']?.length ?? 0; },
    async () => { await ActivityLog.deleteMany({}); if (backupData['ActivityLog']?.length) { await ActivityLog.insertMany(backupData['ActivityLog'] as any, { ordered: false }); } return backupData['ActivityLog']?.length ?? 0; },
  ];

  for (const write of writers) {
    totalDocuments += await write();
  }

  return { collections: writers.length, documents: totalDocuments };
}
