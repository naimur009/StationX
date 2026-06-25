import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  saveOrFindCustomerSchema,
  objectIdParam,
} from './customers.validation';
import {
  handleListCustomers,
  handleGetCustomer,
  handleCreateCustomer,
  handleSaveOrFindCustomer,
  handleUpdateCustomer,
  handleDeleteCustomer,
} from './customers.controller';

const router = Router();

router.get('/customers', authenticate, authorize('customers', 'view'), validate(listCustomersSchema, 'query'), handleListCustomers);
router.post('/customers/save-or-find', authenticate, authorize('customers', 'create'), validate(saveOrFindCustomerSchema), handleSaveOrFindCustomer);
router.get('/customers/:id', authenticate, authorize('customers', 'view'), validate(objectIdParam, 'params'), handleGetCustomer);
router.post('/customers', authenticate, authorize('customers', 'create'), validate(createCustomerSchema), handleCreateCustomer);
router.put('/customers/:id', authenticate, authorize('customers', 'edit'), validate(updateCustomerSchema), handleUpdateCustomer);
router.delete('/customers/:id', authenticate, authorize('customers', 'delete'), validate(objectIdParam, 'params'), handleDeleteCustomer);

export default router;
