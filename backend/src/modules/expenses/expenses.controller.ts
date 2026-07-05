import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as expenseService from './expenses.service';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ListExpensesQuery,
} from './expenses.validation';

export async function handleListExpenses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListExpensesQuery;
    const result = await expenseService.listExpenses(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetExpense(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    res.status(200).json({ data: expense });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateExpense(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    const dto: CreateExpenseDto = req.body;
    const expense = await expenseService.createExpense(dto, req.user.id);
    res.status(201).json({ data: expense });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateExpense(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateExpenseDto = req.body;
    const expense = await expenseService.updateExpense(req.params.id, dto);
    res.status(200).json({ data: expense });
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
    const data = await expenseService.getReferenceData();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteExpense(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await expenseService.deleteExpense(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
