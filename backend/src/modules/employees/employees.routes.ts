import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesSchema,
} from './employees.validation';
import {
  handleListEmployees,
  handleCreateEmployee,
  handleGetEmployee,
  handleUpdateEmployee,
  handleDeleteEmployee,
} from './employees.controller';

const objectIdParam = z.object({ id: z.string().min(1) });

const router = Router();

router.get('/employees', authenticate, authorize('employees', 'view'), validate(listEmployeesSchema, 'query'), handleListEmployees);
router.post('/employees', authenticate, authorize('employees', 'create'), validate(createEmployeeSchema), handleCreateEmployee);
router.get('/employees/:id', authenticate, authorize('employees', 'view'), validate(objectIdParam, 'params'), handleGetEmployee);
router.put('/employees/:id', authenticate, authorize('employees', 'edit'), validate(updateEmployeeSchema), handleUpdateEmployee);
router.delete('/employees/:id', authenticate, authorize('employees', 'delete'), validate(objectIdParam, 'params'), handleDeleteEmployee);

export default router;
