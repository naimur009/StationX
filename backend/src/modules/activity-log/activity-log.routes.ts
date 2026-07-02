import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { listActivityLogSchema } from './activity-log.validation';
import { handleListActivityLogs, handleClearActivityLog } from './activity-log.controller';

const router = Router();

router.get(
  '/activity-log',
  authenticate,
  authorize('activity-log', 'view'),
  validate(listActivityLogSchema, 'query'),
  handleListActivityLogs
);

router.delete(
  '/activity-log',
  authenticate,
  authorize('activity-log', 'delete'),
  handleClearActivityLog
);

export default router;
