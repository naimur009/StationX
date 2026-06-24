import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  objectIdParam,
} from './products.validation';
import {
  handleListProducts,
  handleGetProduct,
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handlePermanentDeleteProduct,
} from './products.controller';

const router = Router();

router.get('/products', authenticate, authorize('products', 'view'), validate(listProductsSchema, 'query'), handleListProducts);
router.get('/products/:id', authenticate, authorize('products', 'view'), validate(objectIdParam, 'params'), handleGetProduct);
router.post('/products', authenticate, authorize('products', 'create'), validate(createProductSchema), handleCreateProduct);
router.put('/products/:id', authenticate, authorize('products', 'edit'), validate(updateProductSchema), validate(objectIdParam, 'params'), handleUpdateProduct);
router.delete('/products/:id', authenticate, authorize('products', 'delete'), validate(objectIdParam, 'params'), handleDeleteProduct);
router.delete('/products/:id/permanent', authenticate, authorize('products', 'delete'), validate(objectIdParam, 'params'), handlePermanentDeleteProduct);

export default router;
