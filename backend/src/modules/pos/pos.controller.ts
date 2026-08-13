import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as posService from './pos.service';
import type { CreateOrderDto, ValidateCouponDto } from './pos.validation';

export async function handleGetEmployees(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { limit } = req.query as { limit?: string };
    const employees = await posService.getEmployees(limit ? Number(limit) : undefined);
    res.status(200).json({ data: employees });
  } catch (error) {
    next(error);
  }
}

export async function handleGetCatalog(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { limit, categoryId, search } = req.query as { limit?: string; categoryId?: string; search?: string };
    const products = await posService.getCatalog(limit ? Number(limit) : undefined, categoryId, search);
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
}

export async function handleValidateCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: ValidateCouponDto = req.body;
    const result = await posService.validateCoupon(dto);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateOrderDto = req.body;
    (req as unknown as Record<string, boolean>).skipActivityLog = true;
    const result = await posService.createOrder(dto, req.user!.id);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}
