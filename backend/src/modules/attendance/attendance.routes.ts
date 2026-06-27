import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createAttendanceSchema,
  batchAttendanceSchema,
  updateAttendanceSchema,
  todayQuerySchema,
  listAttendanceQuerySchema,
  objectIdParam,
} from './attendance.validation';
import {
  handleGetTodayStaff,
  handleMarkAttendance,
  handleBatchMarkAttendance,
  handleUpdateAttendance,
  handleListAttendance,
  handleGetAttendance,
} from './attendance.controller';

const router = Router();

router.get('/attendance/today', authenticate, authorize('attendance', 'view'), validate(todayQuerySchema, 'query'), handleGetTodayStaff);
router.post('/attendance/batch', authenticate, authorize('attendance', 'create'), validate(batchAttendanceSchema), handleBatchMarkAttendance);
router.post('/attendance', authenticate, authorize('attendance', 'create'), validate(createAttendanceSchema), handleMarkAttendance);
router.get('/attendance', authenticate, authorize('attendance', 'view'), validate(listAttendanceQuerySchema, 'query'), handleListAttendance);
router.get('/attendance/:id', authenticate, authorize('attendance', 'view'), validate(objectIdParam, 'params'), handleGetAttendance);
router.put('/attendance/:id', authenticate, authorize('attendance', 'edit'), validate(updateAttendanceSchema), handleUpdateAttendance);

export default router;
