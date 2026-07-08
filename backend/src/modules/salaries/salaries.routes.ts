import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createSalarySchema,
  addAdvanceSchema,
  updateSalaryStatusSchema,
  listSalariesQuerySchema,
  listAdjustmentsQuerySchema,
  createAdjustmentSchema,
  updateAdjustmentSchema,
  salaryReportQuerySchema,
  salarySummaryQuerySchema,
  objectIdParam,
} from './salaries.validation';
import {
  handleListSalaries,
  handleGetSalary,
  handleCreateSalary,
  handleAddAdvance,
  handleUpdateSalaryStatus,
  handleDeleteSalary,
  handleListAdjustments,
  handleGetAdjustment,
  handleCreateAdjustment,
  handleDeleteAdjustment,
  handleUpdateAdjustment,
  handleGetSalaryReport,
  handleGetSalarySummary,
  handleGetEmployeeReport,
} from './salaries.controller';

const router = Router();

router.get('/salaries', authenticate, authorize('expenses', 'view'), validate(listSalariesQuerySchema, 'query'), handleListSalaries);
router.get('/salaries/report', authenticate, authorize('expenses', 'view'), validate(salaryReportQuerySchema, 'query'), handleGetSalaryReport);
router.get('/salaries/report/employee/:employeeId', authenticate, authorize('expenses', 'view'), handleGetEmployeeReport);
router.get('/salaries/:id', authenticate, authorize('expenses', 'view'), validate(objectIdParam, 'params'), handleGetSalary);
router.post('/salaries', authenticate, authorize('expenses', 'create'), validate(createSalarySchema), handleCreateSalary);
router.patch('/salaries/:id/advance', authenticate, authorize('expenses', 'edit'), validate(addAdvanceSchema), handleAddAdvance);
router.patch('/salaries/:id/status', authenticate, authorize('expenses', 'edit'), validate(updateSalaryStatusSchema), handleUpdateSalaryStatus);
router.delete('/salaries/:id', authenticate, authorize('expenses', 'delete'), validate(objectIdParam, 'params'), handleDeleteSalary);

router.get('/salary-adjustments', authenticate, authorize('expenses', 'view'), validate(listAdjustmentsQuerySchema, 'query'), handleListAdjustments);
router.get('/salary-adjustments/:id', authenticate, authorize('expenses', 'view'), validate(objectIdParam, 'params'), handleGetAdjustment);
router.post('/salary-adjustments', authenticate, authorize('expenses', 'create'), validate(createAdjustmentSchema), handleCreateAdjustment);
router.patch('/salary-adjustments/:id', authenticate, authorize('expenses', 'edit'), validate(updateAdjustmentSchema), handleUpdateAdjustment);
router.delete('/salary-adjustments/:id', authenticate, authorize('expenses', 'delete'), validate(objectIdParam, 'params'), handleDeleteAdjustment);

router.get('/salary-summary', authenticate, authorize('expenses', 'view'), validate(salarySummaryQuerySchema, 'query'), handleGetSalarySummary);

export default router;
