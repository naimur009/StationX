import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import * as dashboardService from './dashboard.service';
import type { DashboardMetricsQueryDto, DashboardTopItemsQueryDto } from './dashboard.validation';

export async function handleGetMetrics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as DashboardMetricsQueryDto;
    const result = await dashboardService.getMetrics(query);
    res.set('Cache-Control', 'private, max-age=15');
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTopItems(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as DashboardTopItemsQueryDto;
    const result = await dashboardService.getTopItems(query);
    res.set('Cache-Control', 'private, max-age=15');
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
