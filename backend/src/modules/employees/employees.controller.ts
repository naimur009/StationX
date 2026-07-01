import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as employeeService from './employees.service';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesDto,
} from './employees.validation';

export async function handleListEmployees(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListEmployeesDto;
    const result = await employeeService.listEmployees(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateEmployeeDto = req.body;
    const employee = await employeeService.createEmployee(dto);
    res.status(201).json({ data: employee });
  } catch (error) {
    next(error);
  }
}

export async function handleGetEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    res.status(200).json({ data: employee });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateEmployeeDto = req.body;
    const employee = await employeeService.updateEmployee(req.params.id, dto);
    res.status(200).json({ data: employee });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await employeeService.deleteEmployee(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
