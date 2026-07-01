import Employee, { IEmployee } from '../../models/Employee';
import { createError } from '../../middleware/errorHandler';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesDto,
} from './employees.validation';

interface EmployeeResponse {
  id: string;
  name: string;
  phone: string;
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
    address: employee.address ?? '',
    baseSalary: employee.baseSalary ?? 0,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export async function listEmployees(query: ListEmployeesDto) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: safe, $options: 'i' };
  }

  const skip = (query.page - 1) * query.limit;

  const [employees, total] = await Promise.all([
    Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Employee.countDocuments(filter),
  ]);

  return {
    data: employees.map(toEmployeeResponse),
    meta: { total, page: query.page, limit: query.limit },
  };
}

export async function createEmployee(dto: CreateEmployeeDto) {
  const employee = await Employee.create({
    name: dto.name,
    phone: dto.phone,
    address: dto.address ?? '',
    baseSalary: dto.baseSalary ?? 0,
  });

  return toEmployeeResponse(employee);
}

export async function getEmployeeById(id: string) {
  const employee = await Employee.findById(id);

  if (!employee) {
    throw createError(404, 'NOT_FOUND', 'Employee not found');
  }

  return toEmployeeResponse(employee);
}

export async function updateEmployee(id: string, dto: UpdateEmployeeDto) {
  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.phone !== undefined) updates.phone = dto.phone;
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

  await Employee.findByIdAndDelete(id);

  return { success: true };
}
