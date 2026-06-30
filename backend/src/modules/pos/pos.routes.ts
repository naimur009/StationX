import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createOrderSchema, createCustomerSchema } from './pos.validation';
import {
  handleGetEmployees,
  handleGetCatalog,
  handleCheckCoupon,
  handleLookupCustomer,
  handleSaveOrFindCustomer,
  handleCreateOrder,
} from './pos.controller';

const router = Router();

router.get('/pos/employees', authenticate, authorize('pos', 'create'), handleGetEmployees);
router.get('/pos/catalog', authenticate, authorize(['pos', 'orders'], 'view'), handleGetCatalog);
router.get('/pos/coupon', authenticate, authorize('pos', 'view'), handleCheckCoupon);
router.get('/pos/customers/lookup', authenticate, authorize('pos', 'create'), handleLookupCustomer);
router.post('/pos/customers', authenticate, authorize('pos', 'create'), validate(createCustomerSchema), handleSaveOrFindCustomer);
router.post('/pos/orders', authenticate, authorize('pos', 'create'), validate(createOrderSchema), handleCreateOrder);

export default router;
