import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createOrderSchema, createCustomerSchema, validateCouponSchema } from './pos.validation';
import {
  handleGetEmployees,
  handleGetCatalog,
  handleValidateCoupon,
  handleLookupCustomer,
  handleSaveOrFindCustomer,
  handleCreateOrder,
} from './pos.controller';

const router = Router();

router.get('/pos/employees', authenticate, authorize('pos', 'create'), handleGetEmployees);
router.get('/pos/catalog', authenticate, authorize('pos', 'view'), handleGetCatalog);
router.post('/pos/coupons/validate', authenticate, authorize('pos', 'view'), validate(validateCouponSchema), handleValidateCoupon);
router.get('/pos/customers/lookup', authenticate, authorize('pos', 'create'), handleLookupCustomer);
router.post('/pos/customers', authenticate, authorize('pos', 'create'), validate(createCustomerSchema), handleSaveOrFindCustomer);
router.post('/pos/orders', authenticate, authorize('pos', 'create'), validate(createOrderSchema), handleCreateOrder);

export default router;
