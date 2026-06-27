import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { listActivityLogSchema } from './activity-log.validation';
import { handleListActivityLogs } from './activity-log.controller';

const router = Router();

router.get(
  '/activity-log',
  validate(listActivityLogSchema, 'query'),
  handleListActivityLogs
);

export default router;
