import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as salaryService from './salaries.service';
import type {
  CreateSalaryDto,
  AddAdvanceDto,
  UpdateSalaryStatusDto,
  ListSalariesQuery,
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
    const result = await salaryService.deleteSalary(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
