import { describe, it, expect, vi, beforeEach } from 'vitest';
import Salary from '../src/models/Salary';
import Employee from '../src/models/Employee';
import * as salaryService from '../src/modules/salaries/salaries.service';

vi.mock('../src/models/Salary');
vi.mock('../src/models/Employee');
vi.mock('../src/models/SalaryAdjustment');
vi.mock('../src/models/SalarySummary');

function mockQuery<T>(value: T) {
  return {
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
    catch: (reject: (err: unknown) => unknown) => Promise.resolve(value).catch(reject),
    finally: (cb: () => void) => Promise.resolve(value).finally(cb),
    lean: () => mockQuery(value),
  };
}

function mockPopulatedQuery(value: unknown) {
  const q = mockQuery(value);
  return {
    ...q,
    populate: () => mockPopulatedQuery(value),
  };
}

describe('salaryService.createSalary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const employee = { _id: 'emp-1', baseSalary: 10000 };

  it('rejects paidAmount exceeding the employee base salary', async () => {
    vi.mocked(Employee.findById).mockResolvedValueOnce(employee as never);

    try {
      await salaryService.createSalary(
        { employeeId: 'emp-1', paidAmount: 15000, month: 6, year: 2026 },
        '64b1f5a2e4c0a1b2c3d4e5f6'
      );
      expect.unreachable('Expected error to be thrown');
    } catch (err: unknown) {
      const appErr = err as { code?: string; message?: string };
      expect(appErr.code).toBe('EXCEEDS_SALARY');
      expect(appErr.message).toContain('cannot exceed');
    }

    expect(Salary.create).not.toHaveBeenCalled();
  });

  it('creates a salary record when paidAmount equals the base salary', async () => {
    vi.mocked(Employee.findById).mockResolvedValueOnce(employee as never);
    vi.mocked(Salary.findOne).mockResolvedValueOnce(null as never);
    vi.mocked(Salary.create).mockResolvedValueOnce({
      _id: 'sal-1',
      employeeId: 'emp-1',
      baseSalary: 10000,
      month: 6,
      year: 2026,
      advances: [{ _id: 'adv-1', amount: 10000, date: expect.any(Date), createdBy: '64b1f5a2e4c0a1b2c3d4e5f6' }],
      status: 'paid',
    } as never);
    vi.mocked(Salary.findById).mockReturnValueOnce(mockPopulatedQuery({
      _id: 'sal-1',
      employeeId: { _id: 'emp-1', name: 'John' },
      baseSalary: 10000,
      month: 6,
      year: 2026,
      advances: [{ _id: 'adv-1', amount: 10000, date: new Date(), createdBy: { _id: '64b1f5a2e4c0a1b2c3d4e5f6', name: 'Admin' } }],
      status: 'paid',
      createdBy: { _id: '64b1f5a2e4c0a1b2c3d4e5f6', name: 'Admin' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as never);

    const result = await salaryService.createSalary(
      { employeeId: 'emp-1', paidAmount: 10000, month: 6, year: 2026 },
      '64b1f5a2e4c0a1b2c3d4e5f6'
    );

    expect(Salary.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseSalary: 10000,
        status: 'paid',
        advances: [expect.objectContaining({ amount: 10000 })],
      })
    );
    expect(result.status).toBe('paid');
    expect(result.baseSalary).toBe(10000);
  });

  it('creates a partial salary record when paidAmount is below the base salary', async () => {
    vi.mocked(Employee.findById).mockResolvedValueOnce(employee as never);
    vi.mocked(Salary.findOne).mockResolvedValueOnce(null as never);
    vi.mocked(Salary.create).mockResolvedValueOnce({
      _id: 'sal-2',
      employeeId: 'emp-1',
      baseSalary: 10000,
      month: 6,
      year: 2026,
      advances: [{ _id: 'adv-1', amount: 8000, date: expect.any(Date), createdBy: '64b1f5a2e4c0a1b2c3d4e5f6' }],
      status: 'active',
    } as never);
    vi.mocked(Salary.findById).mockReturnValueOnce(mockPopulatedQuery({
      _id: 'sal-2',
      employeeId: { _id: 'emp-1', name: 'John' },
      baseSalary: 10000,
      month: 6,
      year: 2026,
      advances: [{ _id: 'adv-1', amount: 8000, date: new Date(), createdBy: { _id: '64b1f5a2e4c0a1b2c3d4e5f6', name: 'Admin' } }],
      status: 'active',
      createdBy: { _id: '64b1f5a2e4c0a1b2c3d4e5f6', name: 'Admin' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as never);

    const result = await salaryService.createSalary(
      { employeeId: 'emp-1', paidAmount: 8000, month: 6, year: 2026 },
      '64b1f5a2e4c0a1b2c3d4e5f6'
    );

    expect(Salary.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseSalary: 10000,
        status: 'active',
        advances: [expect.objectContaining({ amount: 8000 })],
      })
    );
    expect(result.totalPaid).toBe(8000);
    expect(result.remainingBalance).toBe(2000);
  });
});
