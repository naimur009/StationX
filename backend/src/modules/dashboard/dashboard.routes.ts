import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { dashboardMetricsQuerySchema, dashboardTopItemsQuerySchema } from './dashboard.validation';
import { handleGetMetrics, handleGetTopItems } from './dashboard.controller';

const router = Router();

router.get(
  '/dashboard/metrics',
  authenticate,
  authorize('dashboard', 'view'),
  validate(dashboardMetricsQuerySchema, 'query'),
  handleGetMetrics
);

router.get(
  '/dashboard/top-items',
  authenticate,
  authorize('dashboard', 'view'),
  validate(dashboardTopItemsQuerySchema, 'query'),
  handleGetTopItems
);

export default router;
