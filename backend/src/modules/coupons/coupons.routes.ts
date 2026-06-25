import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCouponSchema,
  updateCouponSchema,
  listCouponsSchema,
  objectIdParam,
} from './coupons.validation';
import {
  handleListCoupons,
  handleGetCoupon,
  handleCreateCoupon,
  handleUpdateCoupon,
  handleToggleCoupon,
  handleDeleteCoupon,
} from './coupons.controller';

const router = Router();

router.get('/coupons', authenticate, authorize('coupons', 'view'), validate(listCouponsSchema, 'query'), handleListCoupons);
router.get('/coupons/:id', authenticate, authorize('coupons', 'view'), validate(objectIdParam, 'params'), handleGetCoupon);
router.post('/coupons', authenticate, authorize('coupons', 'create'), validate(createCouponSchema), handleCreateCoupon);
router.put('/coupons/:id', authenticate, authorize('coupons', 'edit'), validate(updateCouponSchema), handleUpdateCoupon);
router.patch('/coupons/:id/toggle', authenticate, authorize('coupons', 'edit'), validate(objectIdParam, 'params'), handleToggleCoupon);
router.delete('/coupons/:id', authenticate, authorize('coupons', 'delete'), validate(objectIdParam, 'params'), handleDeleteCoupon);

export default router;
