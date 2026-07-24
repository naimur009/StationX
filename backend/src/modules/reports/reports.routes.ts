import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { reportQuerySchema, exportQuerySchema, reportTypeParamSchema } from './reports.validation';
import { handleGetReport, handleExportReport } from './reports.controller';

const router = Router();

// /export route must be defined BEFORE /:type so "export" is not captured as a type value
router.get(
  '/reports/:type/export',
  authenticate,
  authorize('reports', 'create'),
  validate(reportTypeParamSchema, 'params'),
  validate(exportQuerySchema, 'query'),
  handleExportReport
);

router.get(
  '/reports/:type',
  authenticate,
  authorize('reports', 'view'),
  validate(reportTypeParamSchema, 'params'),
  validate(reportQuerySchema, 'query'),
  handleGetReport
);

export default router;
