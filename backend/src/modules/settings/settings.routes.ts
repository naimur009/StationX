import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize, requireAdmin } from '../../middleware/authorize';
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

// Destructive/export operations are admin-only: the backup contains password
// hashes, and reset/restore replace the whole database.
router.post(
  '/settings/reset',
  authenticate,
  requireAdmin,
  validate(resetDataSchema),
  handleResetData
);

router.get(
  '/settings/backup',
  authenticate,
  requireAdmin,
  handleDownloadBackup
);

router.post(
  '/settings/restore',
  authenticate,
  requireAdmin,
  validate(restoreBackupSchema),
  handleRestoreBackup
);

export default router;
