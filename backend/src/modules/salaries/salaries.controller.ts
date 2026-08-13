import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as salaryService from './salaries.service';
import type {
  CreateSalaryDto,
  AddAdvanceDto,
  UpdateSalaryStatusDto,
  ListSalariesQuery,
  CreateAdjustmentDto,
  ListAdjustmentsQuery,
  UpdateAdjustmentDto,
  SalaryReportQuery,
  SalarySummaryQuery,
  EmployeeReportQuery,
} from './salaries.validation';

export async function handleListSalaries(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListSalariesQuery;
    const result = await salaryService.listSalaries(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetSalary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const salary = await salaryService.getSalaryById(req.params.id);
    res.status(200).json({ data: salary });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateSalary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: CreateSalaryDto = req.body;
    const salary = await salaryService.createSalary(dto, req.user.id);
    res.status(201).json({ data: salary });
  } catch (error) {
    next(error);
  }
}

export async function handleAddAdvance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: AddAdvanceDto = req.body;
    const salary = await salaryService.addAdvance(req.params.id, dto, req.user.id);
    res.status(200).json({ data: salary });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateSalaryStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateSalaryStatusDto = req.body;
    const salary = await salaryService.updateSalaryStatus(req.params.id, dto);
    res.status(200).json({ data: salary });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteSalary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const force = req.query.force === 'true';
    const result = await salaryService.deleteSalary(req.params.id, force);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

// ---- Salary Adjustments ----

export async function handleListAdjustments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListAdjustmentsQuery;
    const result = await salaryService.listAdjustments(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetAdjustment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adjustment = await salaryService.getAdjustmentById(req.params.id);
    res.status(200).json({ data: adjustment });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateAdjustment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: CreateAdjustmentDto = req.body;
    const adjustment = await salaryService.createAdjustment(dto, req.user.id);
    res.status(201).json({ data: adjustment });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteAdjustment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await salaryService.deleteAdjustment(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateAdjustment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateAdjustmentDto = req.body;
    const adjustment = await salaryService.updateAdjustment(req.params.id, dto);
    res.status(200).json({ data: adjustment });
  } catch (error) {
    next(error);
  }
}

// ---- Employee Report ----

export async function handleGetEmployeeReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = { employeeId: req.params.employeeId, year: Number(req.query.year) } as EmployeeReportQuery;
    const result = await salaryService.getEmployeeReport(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ---- Salary Report ----

export async function handleGetSalaryReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as SalaryReportQuery;
    const result = await salaryService.getSalaryReport(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ---- Salary Summary ----

export async function handleGetSalarySummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as SalarySummaryQuery;
    const summary = await salaryService.getOrCreateSalarySummary(query);
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
}
