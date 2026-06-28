import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as ordersService from './orders.service';
import type {
  ListOrdersQuery,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './orders.validation';

export async function handleListOrders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListOrdersQuery;
    const result = await ordersService.listOrders(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await ordersService.getOrderById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateOrderDto = req.body;
    const result = await ordersService.updateOrder(req.params.id, dto);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateOrderStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto: UpdateOrderStatusDto = req.body;
    const result = await ordersService.updateOrderStatus(req.params.id, dto);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await ordersService.deleteOrder(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetOrderBill(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const format = (req.query.format as string) || 'html';
    const result = await ordersService.getOrderBill(req.params.id, format);

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
      res.send(result.pdf);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
