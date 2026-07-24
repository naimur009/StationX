import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createOrderSchema, createCustomerSchema, validateCouponSchema, listQuerySchema, lookupQuerySchema } from './pos.validation';
import {
  handleGetEmployees,
  handleGetCatalog,
  handleValidateCoupon,
  handleLookupCustomer,
  handleSaveOrFindCustomer,
  handleCreateOrder,
} from './pos.controller';

const router = Router();

router.get('/pos/employees', authenticate, authorize('pos', 'create'), validate(listQuerySchema, 'query'), handleGetEmployees);
router.get('/pos/catalog', authenticate, authorize('pos', 'view'), validate(listQuerySchema, 'query'), handleGetCatalog);
router.post('/pos/coupons/validate', authenticate, authorize('pos', 'view'), validate(validateCouponSchema), handleValidateCoupon);
router.get('/pos/customers/lookup', authenticate, authorize('pos', 'create'), validate(lookupQuerySchema, 'query'), handleLookupCustomer);
router.post('/pos/customers', authenticate, authorize('pos', 'create'), validate(createCustomerSchema), handleSaveOrFindCustomer);
router.post('/pos/orders', authenticate, authorize('pos', 'create'), validate(createOrderSchema), handleCreateOrder);

export default router;
