import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { updateSettingsSchema } from './settings.validation';
import { handleGetPublicSettings, handleGetSettings, handleUpdateSettings } from './settings.controller';

const router = Router();

// Public route must be registered BEFORE authenticated routes
// so Express matches it before the authenticate middleware rejects unauthenticated requests
router.get('/settings/public', handleGetPublicSettings);
router.get('/settings', authenticate, authorize('settings', 'view'), handleGetSettings);
router.put(
  '/settings',
  authenticate,
  authorize('settings', 'edit'),
  validate(updateSettingsSchema),
  handleUpdateSettings
);

export default router;
