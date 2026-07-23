import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  listTablesSchema,
  objectIdParam,
} from './tables.validation';
import {
  handleListTables,
  handleGetTable,
  handleCreateTable,
  handleUpdateTable,
  handleUpdateTableStatus,
  handleDeleteTable,
} from './tables.controller';

const router = Router();

router.get('/tables', authenticate, authorize('tables', 'view'), validate(listTablesSchema, 'query'), handleListTables);
router.get('/tables/:id', authenticate, authorize('tables', 'view'), validate(objectIdParam, 'params'), handleGetTable);
router.post('/tables', authenticate, authorize('tables', 'create'), validate(createTableSchema), handleCreateTable);
router.put('/tables/:id', authenticate, authorize('tables', 'edit'), validate(updateTableSchema), handleUpdateTable);
router.patch('/tables/:id/status', authenticate, authorize('tables', 'edit'), validate(updateTableStatusSchema), handleUpdateTableStatus);
router.delete('/tables/:id', authenticate, authorize('tables', 'delete'), validate(objectIdParam, 'params'), handleDeleteTable);

export default router;
