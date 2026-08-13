import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  listTasksQuerySchema,
  objectIdParam,
} from './tasks.validation';
import {
  handleListTasks,
  handleGetTask,
  handleCreateTask,
  handleUpdateTask,
  handleUpdateTaskStatus,
  handleListAssignableEmployees,
  handleDeleteTask,
} from './tasks.controller';

const router = Router();

router.get('/tasks', authenticate, authorize('tasks', 'view'), validate(listTasksQuerySchema, 'query'), handleListTasks);
router.get('/tasks/assignable-employees', authenticate, authorize('tasks', 'create'), handleListAssignableEmployees);
router.get('/tasks/:id', authenticate, authorize('tasks', 'view'), validate(objectIdParam, 'params'), handleGetTask);
router.post('/tasks', authenticate, authorize('tasks', 'create'), validate(createTaskSchema), handleCreateTask);
router.put('/tasks/:id', authenticate, authorize('tasks', 'edit'), validate(objectIdParam, 'params'), validate(updateTaskSchema), handleUpdateTask);
router.patch('/tasks/:id/status', authenticate, authorize('tasks', 'view'), validate(objectIdParam, 'params'), validate(updateTaskStatusSchema), handleUpdateTaskStatus);
router.delete('/tasks/:id', authenticate, authorize('tasks', 'delete'), validate(objectIdParam, 'params'), handleDeleteTask);

export default router;
