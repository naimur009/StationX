import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createSalarySchema,
  addAdvanceSchema,
  updateSalaryStatusSchema,
  listSalariesQuerySchema,
  objectIdParam,
} from './salaries.validation';
import {
  handleListSalaries,
  handleGetSalary,
  handleCreateSalary,
  handleAddAdvance,
  handleUpdateSalaryStatus,
  handleDeleteSalary,
} from './salaries.controller';

const router = Router();

router.get('/salaries', authenticate, authorize('expenses', 'view'), validate(listSalariesQuerySchema, 'query'), handleListSalaries);
router.get('/salaries/:id', authenticate, authorize('expenses', 'view'), validate(objectIdParam, 'params'), handleGetSalary);
router.post('/salaries', authenticate, authorize('expenses', 'create'), validate(createSalarySchema), handleCreateSalary);
router.patch('/salaries/:id/advance', authenticate, authorize('expenses', 'edit'), validate(addAdvanceSchema), handleAddAdvance);
router.patch('/salaries/:id/status', authenticate, authorize('expenses', 'edit'), validate(updateSalaryStatusSchema), handleUpdateSalaryStatus);
router.delete('/salaries/:id', authenticate, authorize('expenses', 'delete'), validate(objectIdParam, 'params'), handleDeleteSalary);

export default router;
