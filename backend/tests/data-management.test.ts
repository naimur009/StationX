import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resetAllData,
  generateBackup,
  restoreBackup,
} from '../src/modules/settings/data-management.service';
import { resetDataSchema, restoreBackupSchema } from '../src/modules/settings/settings.validation';
import Category from '../src/models/Category';
import Product from '../src/models/Product';
import Coupon from '../src/models/Coupon';
import Customer from '../src/models/Customer';
import Vendor from '../src/models/Vendor';
import Order from '../src/models/Order';
import Task from '../src/models/Task';
import Employee from '../src/models/Employee';
import Attendance from '../src/models/Attendance';
import Salary from '../src/models/Salary';
import SalaryAdjustment from '../src/models/SalaryAdjustment';
import SalarySummary from '../src/models/SalarySummary';
import Expense from '../src/models/Expense';
import ActivityLog from '../src/models/ActivityLog';
import Settings from '../src/models/Settings';
import Counter from '../src/models/Counter';
import User from '../src/models/User';
import bcrypt from 'bcrypt';

vi.mock('../src/models/User');
vi.mock('../src/models/Category');
vi.mock('../src/models/Product');
vi.mock('../src/models/Coupon');
vi.mock('../src/models/Customer');
vi.mock('../src/models/Vendor');
vi.mock('../src/models/Order');
vi.mock('../src/models/Task');
vi.mock('../src/models/Employee');
vi.mock('../src/models/Attendance');
vi.mock('../src/models/Salary');
vi.mock('../src/models/SalaryAdjustment');
vi.mock('../src/models/SalarySummary');
vi.mock('../src/models/Expense');
vi.mock('../src/models/ActivityLog');
vi.mock('../src/models/Settings');
vi.mock('../src/models/Counter');
vi.mock('bcrypt');

vi.mock('../src/config/env', () => ({
  env: {
    get SEED_ADMIN_EMAIL() { return process.env.SEED_ADMIN_EMAIL; },
    get SEED_ADMIN_PASSWORD() { return process.env.SEED_ADMIN_PASSWORD; },
  },
}));

function mockFindLean(returnValue: unknown) {
  return { lean: vi.fn().mockResolvedValue(returnValue) } as never;
}

function mockFindSelectLean(returnValue: unknown) {
  return {
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(returnValue) }),
  } as never;
}

function mockFindByIdLean(returnValue: unknown) {
  return { lean: vi.fn().mockResolvedValue(returnValue) } as never;
}

const COLLECTION_MODELS: { name: string; model: Record<string, ReturnType<typeof vi.fn>> }[] = [
  { name: 'Category', model: Category as never },
  { name: 'Product', model: Product as never },
  { name: 'Coupon', model: Coupon as never },
  { name: 'Customer', model: Customer as never },
  { name: 'Vendor', model: Vendor as never },
  { name: 'Order', model: Order as never },
  { name: 'Task', model: Task as never },
  { name: 'Employee', model: Employee as never },
  { name: 'Attendance', model: Attendance as never },
  { name: 'Salary', model: Salary as never },
  { name: 'SalaryAdjustment', model: SalaryAdjustment as never },
  { name: 'SalarySummary', model: SalarySummary as never },
  { name: 'Expense', model: Expense as never },
  { name: 'ActivityLog', model: ActivityLog as never },
];

function mockAllCollectionsEmpty() {
  for (const { model } of COLLECTION_MODELS) {
    vi.mocked(model.find).mockReturnValue(mockFindLean([]));
  }
}

describe('dataManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resetAllData', () => {
    it('deletes all data collections but preserves admin users', async () => {
      await resetAllData();

      expect(User.deleteMany).toHaveBeenCalledWith({ role: { $ne: 'admin' } });
      for (const { model } of COLLECTION_MODELS) {
        expect(model.deleteMany).toHaveBeenCalledWith({});
      }
    });

    it('resets Settings to defaults', async () => {
      await resetAllData();

      expect(Settings.findByIdAndUpdate).toHaveBeenCalledWith(
        'restaurant-settings',
        { $set: expect.any(Object) },
        { upsert: true }
      );
    });

    it('resets Counter to zero', async () => {
      await resetAllData();

      expect(Counter.findByIdAndUpdate).toHaveBeenCalledWith(
        'orderNumber',
        { $set: { seq: 0 } },
        { upsert: true }
      );
    });

    it('does NOT delete Settings or Counter', async () => {
      await resetAllData();
      expect(Settings.deleteMany).not.toHaveBeenCalled();
      expect(Counter.deleteMany).not.toHaveBeenCalled();
    });

    it('skips admin reseed when SEED_ADMIN_EMAIL is not set', async () => {
      await resetAllData();
      expect(User.create).not.toHaveBeenCalled();
    });

    it('creates admin user from env vars when SEED_ADMIN_EMAIL is set', async () => {
      process.env.SEED_ADMIN_EMAIL = 'admin@test.com';
      process.env.SEED_ADMIN_PASSWORD = 'StrongPass1';

      vi.mocked(User.findOne).mockResolvedValue(null as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

      const { seedAdminUser } = await import('../src/modules/settings/data-management.service');
      await seedAdminUser();

      expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@test.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass1', 12);
      expect(User.create).toHaveBeenCalledWith({
        name: 'Admin',
        email: 'admin@test.com',
        passwordHash: 'hashed-password',
        role: 'admin',
        permissions: [],
        isActive: true,
      });

      delete process.env.SEED_ADMIN_EMAIL;
      delete process.env.SEED_ADMIN_PASSWORD;
    });

    it('does not duplicate admin if one already exists', async () => {
      process.env.SEED_ADMIN_EMAIL = 'admin@test.com';
      process.env.SEED_ADMIN_PASSWORD = 'StrongPass1';

      vi.mocked(User.findOne).mockResolvedValue({ _id: 'existing' } as never);

      const { seedAdminUser } = await import('../src/modules/settings/data-management.service');
      await seedAdminUser();

      expect(User.create).not.toHaveBeenCalled();

      delete process.env.SEED_ADMIN_EMAIL;
      delete process.env.SEED_ADMIN_PASSWORD;
    });
  });

  describe('generateBackup', () => {
    it('queries all data collections', async () => {
      const sampleData = { _id: '1', name: 'test' };
      vi.mocked(User.find).mockReturnValue(mockFindSelectLean([sampleData]));
      mockAllCollectionsEmpty();
      vi.mocked(Settings.findById).mockReturnValue(mockFindByIdLean(null));
      vi.mocked(Counter.findById).mockReturnValue(mockFindByIdLean(null));

      const backup = await generateBackup();

      expect(User.find).toHaveBeenCalledWith({});
      expect((User.find as ReturnType<typeof vi.fn>).mock.results[0].value.select).toHaveBeenCalledWith('+passwordHash');
      expect(backup.User).toEqual([sampleData]);
      for (const { name } of COLLECTION_MODELS) {
        expect(backup[name]).toEqual([]);
      }
    });

    it('includes Settings and Counter documents when they exist', async () => {
      const settingsDoc = { _id: 'restaurant-settings', restaurantName: 'Test' };
      const counterDoc = { _id: 'orderNumber', seq: 5 };

      vi.mocked(User.find).mockReturnValue(mockFindSelectLean([]));
      mockAllCollectionsEmpty();
      vi.mocked(Settings.findById).mockReturnValue(mockFindByIdLean(settingsDoc));
      vi.mocked(Counter.findById).mockReturnValue(mockFindByIdLean(counterDoc));

      const backup = await generateBackup();

      expect(backup.Settings).toEqual([settingsDoc]);
      expect(backup.Counter).toEqual([counterDoc]);
    });

    it('omits Settings and Counter when they do not exist', async () => {
      vi.mocked(User.find).mockReturnValue(mockFindSelectLean([]));
      mockAllCollectionsEmpty();
      vi.mocked(Settings.findById).mockReturnValue(mockFindByIdLean(null));
      vi.mocked(Counter.findById).mockReturnValue(mockFindByIdLean(null));

      const backup = await generateBackup();

      expect(backup.Settings).toBeUndefined();
      expect(backup.Counter).toBeUndefined();
    });
  });

  describe('restoreBackup', () => {
    const EXISTING_ADMIN = { email: 'admin@test.com', passwordHash: '$2b$12$existingAdminHashValue' };

    const mockExistingAdmins = (admins = [EXISTING_ADMIN]) => {
      vi.mocked(User.find).mockReturnValue(mockFindSelectLean(admins));
    };

    const validBackup = (overrides: Record<string, unknown> = {}) => ({
      data: {
        User: [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$backupHashValue' }],
        Category: [],
        Product: [],
        Coupon: [],
        Customer: [],
        Vendor: [],
        Order: [],
        Task: [],
        Employee: [],
        Attendance: [],
        Salary: [],
        SalaryAdjustment: [],
        SalarySummary: [],
        Expense: [],
        ActivityLog: [],
        Settings: [{ _id: 'restaurant-settings', restaurantName: 'Test' }],
        Counter: [{ _id: 'orderNumber', seq: 0 }],
        ...overrides,
      },
    });

    it('validates all required keys are present', async () => {
      const incomplete = { data: { User: [] } };
      await expect(restoreBackup(incomplete.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('rejects unexpected collection keys', async () => {
      const extra = { data: { ...validBackup().data, ExtraCollection: [] } };
      await expect(restoreBackup(extra.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('rejects backup with no active admin', async () => {
      mockExistingAdmins();
      const noAdmin = validBackup({
        User: [
          { _id: '2', name: 'Staff', email: 'staff@test.com', role: 'employee', isActive: true, passwordHash: '$2b$12$staffHashValue' },
        ],
      });
      await expect(restoreBackup(noAdmin.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('rejects backup with only inactive admin', async () => {
      mockExistingAdmins();
      const inactiveAdmin = validBackup({
        User: [{ _id: '3', email: 'admin@test.com', role: 'admin', isActive: false, passwordHash: '$2b$12$backupHashValue' }],
      });
      await expect(restoreBackup(inactiveAdmin.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('rejects admin accounts that do not match an existing admin email', async () => {
      mockExistingAdmins();
      const injectedAdmin = validBackup({
        User: [
          { _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$backupHashValue' },
          { _id: '9', name: 'Attacker', email: 'attacker@x.com', role: 'admin', isActive: true, passwordHash: '$2b$12$attackerHashValue' },
        ],
      });
      await expect(restoreBackup(injectedAdmin.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('attacker@x.com'),
      });
    });

    it('rejects malformed user documents (bad role / missing bcrypt hash)', async () => {
      mockExistingAdmins();
      const badRole = validBackup({
        User: [
          { _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$backupHashValue' },
          { _id: '2', email: 'staff@test.com', role: 'superuser', isActive: true, passwordHash: '$2b$12$staffHashValue' },
        ],
      });
      await expect(restoreBackup(badRole.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      const badHash = validBackup({
        User: [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: 'plaintext' }],
      });
      await expect(restoreBackup(badHash.data)).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('preserves the existing admin passwordHash instead of restoring the backup hash', async () => {
      mockExistingAdmins();
      const backupData = validBackup({
        User: [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$attackerHashValue' }],
      }).data;

      await restoreBackup(backupData);

      expect(User.insertMany).toHaveBeenCalledWith(
        [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$existingAdminHashValue' }],
        { ordered: false }
      );
    });

    it('clears all collections then inserts backup data in order', async () => {
      mockExistingAdmins();
      const backupData = {
        User: [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$backupHashValue' }],
        Settings: [{ _id: 'restaurant-settings', restaurantName: 'After Restore' }],
        Counter: [{ _id: 'orderNumber', seq: 10 }],
        Category: [{ _id: 'cat-1', name: 'Beverages' }],
        Product: [],
        Coupon: [],
        Customer: [],
        Vendor: [],
        Order: [],
        Task: [],
        Employee: [],
        Attendance: [],
        Salary: [],
        SalaryAdjustment: [],
        SalarySummary: [],
        Expense: [],
        ActivityLog: [],
      };

      await restoreBackup(backupData);

      expect(Settings.deleteMany).toHaveBeenCalledWith({});
      expect(Counter.deleteMany).toHaveBeenCalledWith({});
      expect(User.deleteMany).toHaveBeenCalledWith({});
      expect(Category.deleteMany).toHaveBeenCalledWith({});

      expect(Settings.insertMany).toHaveBeenCalledWith(
        backupData.Settings,
        { ordered: false }
      );
      expect(Counter.insertMany).toHaveBeenCalledWith(
        backupData.Counter,
        { ordered: false }
      );
      expect(User.insertMany).toHaveBeenCalledWith(
        [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$existingAdminHashValue' }],
        { ordered: false }
      );
    });

    it('calls deleteMany even for empty collections but skips insertMany', async () => {
      mockExistingAdmins();
      const backupData = {
        User: [{ _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$backupHashValue' }],
        Category: [],
        Product: [],
        Coupon: [],
        Customer: [],
        Vendor: [],
        Order: [],
        Task: [],
        Employee: [],
        Attendance: [],
        Salary: [],
        SalaryAdjustment: [],
        SalarySummary: [],
        Expense: [],
        ActivityLog: [],
        Settings: [],
        Counter: [],
      };

      await restoreBackup(backupData);

      expect(Product.deleteMany).toHaveBeenCalledWith({});
      expect(Product.insertMany).not.toHaveBeenCalled();
    });

    it('returns correct document count', async () => {
      mockExistingAdmins();
      const backupData = {
        User: [
          { _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true, passwordHash: '$2b$12$backupHashValue' },
          { _id: '2', name: 'Staff', email: 'staff@test.com', role: 'employee', isActive: true, passwordHash: '$2b$12$staffHashValue' },
        ],
        Category: [{ _id: 'cat-1', name: 'Food' }],
        Product: [],
        Coupon: [],
        Customer: [],
        Vendor: [],
        Order: [],
        Task: [],
        Employee: [],
        Attendance: [],
        Salary: [],
        SalaryAdjustment: [],
        SalarySummary: [],
        Expense: [],
        ActivityLog: [],
        Settings: [],
        Counter: [],
      };

      const result = await restoreBackup(backupData);

      expect(result.documents).toBe(3);
      expect(result.collections).toBe(17);
    });
  });
});

describe('resetDataSchema validation', () => {
  it('accepts empty body', () => {
    const result = resetDataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields', () => {
    const result = resetDataSchema.safeParse({ unknownField: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects non-object body', () => {
    const result = resetDataSchema.safeParse('string');
    expect(result.success).toBe(false);
  });
});

describe('restoreBackupSchema validation', () => {
  it('accepts valid backup with all collections under data key', () => {
    const result = restoreBackupSchema.safeParse({
      data: {
        User: [{ _id: '1', email: 'admin@test.com', role: 'admin' }],
        Category: [],
        Product: [],
        Coupon: [],
        Customer: [],
        Vendor: [],
        Order: [],
        Task: [],
        Employee: [],
        Attendance: [],
        Salary: [],
        SalaryAdjustment: [],
        SalarySummary: [],
        Expense: [],
        ActivityLog: [],
        Settings: [],
        Counter: [],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty data object', () => {
    const result = restoreBackupSchema.safeParse({ data: {} });
    expect(result.success).toBe(true);
  });

  it('rejects missing data key', () => {
    const result = restoreBackupSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-object data', () => {
    const result = restoreBackupSchema.safeParse({ data: 'invalid' });
    expect(result.success).toBe(false);
  });
});
