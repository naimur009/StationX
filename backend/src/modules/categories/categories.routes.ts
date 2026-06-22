import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
  objectIdParam,
} from './categories.validation';
import {
  handleListCategories,
  handleGetCategory,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handlePermanentDeleteCategory,
} from './categories.controller';

const router = Router();

router.get('/categories', authenticate, authorize('categories', 'view'), validate(listCategoriesSchema, 'query'), handleListCategories);
router.get('/categories/:id', authenticate, authorize('categories', 'view'), validate(objectIdParam, 'params'), handleGetCategory);
router.post('/categories', authenticate, authorize('categories', 'create'), validate(createCategorySchema), handleCreateCategory);
router.put('/categories/:id', authenticate, authorize('categories', 'edit'), validate(updateCategorySchema), handleUpdateCategory);
router.delete('/categories/:id', authenticate, authorize('categories', 'delete'), validate(objectIdParam, 'params'), handleDeleteCategory);
router.delete('/categories/:id/permanent', authenticate, authorize('categories', 'delete'), validate(objectIdParam, 'params'), handlePermanentDeleteCategory);

export default router;
