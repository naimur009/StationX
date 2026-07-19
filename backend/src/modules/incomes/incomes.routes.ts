import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createIncomeSchema,
  updateIncomeSchema,
  listIncomesQuerySchema,
  objectIdParam,
} from './incomes.validation';
import {
  handleListIncomes,
  handleGetIncome,
  handleCreateIncome,
  handleUpdateIncome,
  handleDeleteIncome,
  handleGetReferenceData,
} from './incomes.controller';

const router = Router();

router.get('/incomes', authenticate, authorize('incomes', 'view'), validate(listIncomesQuerySchema, 'query'), handleListIncomes);
router.get('/incomes/reference-data', authenticate, authorize('incomes', 'view'), handleGetReferenceData);
router.get('/incomes/:id', authenticate, authorize('incomes', 'view'), validate(objectIdParam, 'params'), handleGetIncome);
router.post('/incomes', authenticate, authorize('incomes', 'create'), validate(createIncomeSchema), handleCreateIncome);
router.put('/incomes/:id', authenticate, authorize('incomes', 'edit'), validate(updateIncomeSchema), handleUpdateIncome);
router.delete('/incomes/:id', authenticate, authorize('incomes', 'delete'), validate(objectIdParam, 'params'), handleDeleteIncome);

export default router;
