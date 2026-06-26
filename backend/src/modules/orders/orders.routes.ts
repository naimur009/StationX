import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  billQuerySchema,
} from './orders.validation';
import {
  handleListOrders,
  handleGetOrder,
  handleUpdateOrder,
  handleUpdateOrderStatus,
  handleGetOrderBill,
} from './orders.controller';

const router = Router();

router.get('/orders', authenticate, authorize('orders', 'view'), validate(listOrdersQuerySchema, 'query'), handleListOrders);
router.get('/orders/:id', authenticate, authorize('orders', 'view'), validate(orderIdParamSchema, 'params'), handleGetOrder);
router.put('/orders/:id', authenticate, authorize('orders', 'edit'), validate(orderIdParamSchema, 'params'), validate(updateOrderSchema), handleUpdateOrder);
router.patch('/orders/:id/status', authenticate, authorize('orders', 'edit'), validate(orderIdParamSchema, 'params'), validate(updateOrderStatusSchema), handleUpdateOrderStatus);
router.get('/orders/:id/bill', authenticate, authorize('orders', 'view'), validate(orderIdParamSchema, 'params'), validate(billQuerySchema, 'query'), handleGetOrderBill);

export default router;
