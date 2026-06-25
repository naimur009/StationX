import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as couponService from './coupons.service';
import type {
  CreateCouponDto,
  UpdateCouponDto,
  ListCouponsDto,
} from './coupons.validation';

export async function handleListCoupons(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListCouponsDto;
    const result = await couponService.listCoupons(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await couponService.getCouponById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: CreateCouponDto = req.body;
    const result = await couponService.createCoupon(dto);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateCouponDto = req.body;
    const result = await couponService.updateCoupon(req.params.id, dto);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleToggleCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await couponService.toggleCoupon(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteCoupon(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await couponService.deleteCoupon(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
