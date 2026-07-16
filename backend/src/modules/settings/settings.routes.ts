import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { updateSettingsSchema, resetDataSchema, restoreBackupSchema } from './settings.validation';
import {
  handleGetPublicSettings,
  handleGetSettings,
  handleUpdateSettings,
  handleResetData,
  handleDownloadBackup,
  handleRestoreBackup,
} from './settings.controller';

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

router.post(
  '/settings/reset',
  authenticate,
  authorize('settings', 'edit'),
  validate(resetDataSchema),
  handleResetData
);

router.get(
  '/settings/backup',
  authenticate,
  authorize('settings', 'view'),
  handleDownloadBackup
);

router.post(
  '/settings/restore',
  authenticate,
  authorize('settings', 'edit'),
  validate(restoreBackupSchema),
  handleRestoreBackup
);

export default router;
