import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { updateSettingsSchema } from './settings.validation';
import { handleGetSettings, handleUpdateSettings } from './settings.controller';

const router = Router();

router.get('/settings', authenticate, authorize('settings', 'view'), handleGetSettings);
router.put(
  '/settings',
  authenticate,
  authorize('settings', 'edit'),
  validate(updateSettingsSchema),
  handleUpdateSettings
);

export default router;
