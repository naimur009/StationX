import Employee, { IEmployee } from '../../models/Employee';
import Attendance from '../../models/Attendance';
import Salary from '../../models/Salary';
import SalaryAdjustment from '../../models/SalaryAdjustment';
import SalarySummary from '../../models/SalarySummary';
import { createError } from '../../middleware/errorHandler';
import { withTransaction } from '../../lib/transaction';
import { escapeRegex } from '../../lib/escapeRegex';
import { paginate } from '../../lib/pagination';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesDto,
} from './employees.validation';

interface EmployeeResponse {
  id: string;
  name: string;
  phone: string;
  nid: string;
  address: string;
  baseSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

function toEmployeeResponse(employee: IEmployee): EmployeeResponse {
  return {
    id: employee._id.toString(),
    name: employee.name,
    phone: employee.phone,
    nid: employee.nid ?? '',
    address: employee.address ?? '',
    baseSalary: employee.baseSalary ?? 0,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export async function listEmployees(query: ListEmployeesDto) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  const { skip, limit } = paginate(query.page, query.limit);

  const [employees, total] = await Promise.all([
    Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Employee.countDocuments(filter),
  ]);

  return {
    data: (employees as unknown as IEmployee[]).map(toEmployeeResponse),
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function createEmployee(dto: CreateEmployeeDto) {
  const employee = await Employee.create({
    name: dto.name,
    phone: dto.phone,
    nid: dto.nid ?? '',
    address: dto.address ?? '',
    baseSalary: dto.baseSalary ?? 0,
  });

  return toEmployeeResponse(employee);
}

export async function getEmployeeById(id: string) {
  const employee = await Employee.findById(id).lean();

  if (!employee) {
    throw createError(404, 'NOT_FOUND', 'Employee not found');
  }

  return toEmployeeResponse(employee as unknown as IEmployee);
}

export async function updateEmployee(id: string, dto: UpdateEmployeeDto) {
  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.phone !== undefined) updates.phone = dto.phone;
  if (dto.nid !== undefined) updates.nid = dto.nid;
  if (dto.address !== undefined) updates.address = dto.address;
  if (dto.baseSalary !== undefined) updates.baseSalary = dto.baseSalary;

  const employee = await Employee.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!employee) {
    throw createError(404, 'NOT_FOUND', 'Employee not found');
  }

  return toEmployeeResponse(employee);
}

export async function deleteEmployee(id: string) {
  const employee = await Employee.findById(id);

  if (!employee) {
    throw createError(404, 'NOT_FOUND', 'Employee not found');
  }

  await withTransaction(async (session) => {
    await Attendance.deleteMany({ employee: id }).session(session);
    await Salary.deleteMany({ employeeId: id }).session(session);
    await SalaryAdjustment.deleteMany({ employeeId: id }).session(session);
    await SalarySummary.deleteMany({ employeeId: id }).session(session);

    await Employee.findByIdAndDelete(id, { session });
  });

  return { success: true };
}
