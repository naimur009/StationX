import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as incomeService from './incomes.service';
import type {
  CreateIncomeDto,
  UpdateIncomeDto,
  ListIncomesQuery,
} from './incomes.validation';

export async function handleListIncomes(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListIncomesQuery;
    const result = await incomeService.listIncomes(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetIncome(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const income = await incomeService.getIncomeById(req.params.id);
    res.status(200).json({ data: income });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateIncome(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: CreateIncomeDto = req.body;
    const income = await incomeService.createIncome(dto, req.user.id);
    res.status(201).json({ data: income });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateIncome(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateIncomeDto = req.body;
    const income = await incomeService.updateIncome(req.params.id, dto);
    res.status(200).json({ data: income });
  } catch (error) {
    next(error);
  }
}

export async function handleGetReferenceData(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await incomeService.getReferenceData();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteIncome(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await incomeService.deleteIncome(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
