import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createVendorSchema,
  updateVendorSchema,
  listVendorsSchema,
  objectIdParam,
} from './vendors.validation';
import {
  handleListVendors,
  handleGetVendor,
  handleCreateVendor,
  handleUpdateVendor,
  handleDeleteVendor,
} from './vendors.controller';

const router = Router();

router.get('/vendors', authenticate, authorize('vendors', 'view'), validate(listVendorsSchema, 'query'), handleListVendors);
router.get('/vendors/:id', authenticate, authorize('vendors', 'view'), validate(objectIdParam, 'params'), handleGetVendor);
router.post('/vendors', authenticate, authorize('vendors', 'create'), validate(createVendorSchema), handleCreateVendor);
router.put('/vendors/:id', authenticate, authorize('vendors', 'edit'), validate(updateVendorSchema), handleUpdateVendor);
router.delete('/vendors/:id', authenticate, authorize('vendors', 'delete'), validate(objectIdParam, 'params'), handleDeleteVendor);

export default router;
