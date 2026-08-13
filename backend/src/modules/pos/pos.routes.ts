import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createOrderSchema, validateCouponSchema, listQuerySchema } from './pos.validation';
import {
  handleGetEmployees,
  handleGetCatalog,
  handleValidateCoupon,
  handleCreateOrder,
} from './pos.controller';

const router = Router();

router.get('/pos/employees', authenticate, authorize('pos', 'create'), validate(listQuerySchema, 'query'), handleGetEmployees);
router.get('/pos/products', authenticate, authorize('pos', 'view'), validate(listQuerySchema, 'query'), handleGetCatalog);
router.post('/pos/coupons/validate', authenticate, authorize('pos', 'view'), validate(validateCouponSchema), handleValidateCoupon);
router.post('/pos/orders', authenticate, authorize('pos', 'create'), validate(createOrderSchema), handleCreateOrder);

export default router;
