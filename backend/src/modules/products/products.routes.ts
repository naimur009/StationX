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
  handleGetReferenceData,
} from './products.controller';

const router = Router();

router.get('/products', authenticate, authorize('products', 'view'), validate(listProductsSchema, 'query'), handleListProducts);
router.get('/products/reference-data', authenticate, authorize('products', 'create'), handleGetReferenceData);
router.get('/products/:id', authenticate, authorize('products', 'view'), validate(objectIdParam, 'params'), handleGetProduct);
router.post('/products', authenticate, authorize('products', 'create'), validate(createProductSchema), handleCreateProduct);
router.put('/products/:id', authenticate, authorize('products', 'edit'), validate(objectIdParam, 'params'), validate(updateProductSchema), handleUpdateProduct);
router.delete('/products/:id', authenticate, authorize('products', 'delete'), validate(objectIdParam, 'params'), handleDeleteProduct);

export default router;
