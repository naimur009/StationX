import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  objectIdParam,
} from './expenses.validation';
import {
  handleListExpenses,
  handleGetExpense,
  handleCreateExpense,
  handleUpdateExpense,
  handleDeleteExpense,
} from './expenses.controller';

const router = Router();

router.get('/expenses', authenticate, authorize('expenses', 'view'), validate(listExpensesQuerySchema, 'query'), handleListExpenses);
router.get('/expenses/:id', authenticate, authorize('expenses', 'view'), validate(objectIdParam, 'params'), handleGetExpense);
router.post('/expenses', authenticate, authorize('expenses', 'create'), validate(createExpenseSchema), handleCreateExpense);
router.put('/expenses/:id', authenticate, authorize('expenses', 'edit'), validate(updateExpenseSchema), handleUpdateExpense);
router.delete('/expenses/:id', authenticate, authorize('expenses', 'delete'), validate(objectIdParam, 'params'), handleDeleteExpense);

export default router;
