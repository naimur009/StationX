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
  employeeReportParamsSchema,
  employeeReportQuerySchema,
  deleteSalaryQuerySchema,
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

router.get('/salaries', authenticate, authorize('salary', 'view'), validate(listSalariesQuerySchema, 'query'), handleListSalaries);
router.get('/salaries/report', authenticate, authorize('salary', 'view'), validate(salaryReportQuerySchema, 'query'), handleGetSalaryReport);
router.get('/salaries/report/employee/:employeeId', authenticate, authorize('salary', 'view'), validate(employeeReportParamsSchema, 'params'), validate(employeeReportQuerySchema, 'query'), handleGetEmployeeReport);
router.get('/salaries/:id', authenticate, authorize('salary', 'view'), validate(objectIdParam, 'params'), handleGetSalary);
router.post('/salaries', authenticate, authorize('salary', 'create'), validate(createSalarySchema), handleCreateSalary);
router.patch('/salaries/:id/advance', authenticate, authorize('salary', 'edit'), validate(addAdvanceSchema), handleAddAdvance);
router.patch('/salaries/:id/status', authenticate, authorize('salary', 'edit'), validate(updateSalaryStatusSchema), handleUpdateSalaryStatus);
router.delete('/salaries/:id', authenticate, authorize('salary', 'delete'), validate(objectIdParam, 'params'), validate(deleteSalaryQuerySchema, 'query'), handleDeleteSalary);

router.get('/salary-adjustments', authenticate, authorize('salary', 'view'), validate(listAdjustmentsQuerySchema, 'query'), handleListAdjustments);
router.get('/salary-adjustments/:id', authenticate, authorize('salary', 'view'), validate(objectIdParam, 'params'), handleGetAdjustment);
router.post('/salary-adjustments', authenticate, authorize('salary', 'create'), validate(createAdjustmentSchema), handleCreateAdjustment);
router.patch('/salary-adjustments/:id', authenticate, authorize('salary', 'edit'), validate(updateAdjustmentSchema), handleUpdateAdjustment);
router.delete('/salary-adjustments/:id', authenticate, authorize('salary', 'delete'), validate(objectIdParam, 'params'), handleDeleteAdjustment);

router.get('/salary-summary', authenticate, authorize('salary', 'view'), validate(salarySummaryQuerySchema, 'query'), handleGetSalarySummary);

export default router;
