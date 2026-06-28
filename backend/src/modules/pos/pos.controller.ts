import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as posService from './pos.service';
import type { CreateOrderDto, CreateCustomerDto } from './pos.validation';

export async function handleGetEmployees(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employees = await posService.getEmployees();
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
    const products = await posService.getCatalog();
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
}

export async function handleCheckCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.query as { code: string };
    if (!code) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Coupon code is required' } });
      return;
    }
    const result = await posService.getCouponDiscount(code);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveOrFindCustomer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateCustomerDto = req.body;
    const result = await posService.saveOrFindCustomer(dto);
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
