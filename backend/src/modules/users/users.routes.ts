import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  deactivateUserSchema,
  reactivateUserSchema,
  updatePermissionsSchema,
  listUsersSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
} from './users.validation';
import {
  handleListUsers,
  handleCreateUser,
  handleGetUser,
  handleUpdateUser,
  handleDeactivateUser,
  handleReactivateUser,
  handlePermanentDeleteUser,
  handleUpdatePermissions,
  handleChangePassword,
  handleAdminResetPassword,
} from './users.controller';

import { objectIdParamSchema } from '../../lib/object-id';

const objectIdParam = objectIdParamSchema;

const router = Router();

router.get('/users', authenticate, authorize('users', 'view'), validate(listUsersSchema, 'query'), handleListUsers);
router.post('/users', authenticate, authorize('users', 'create'), validate(createUserSchema), handleCreateUser);
router.get('/users/:id', authenticate, authorize('users', 'view'), validate(objectIdParam, 'params'), handleGetUser);
router.put('/users/:id', authenticate, authorize('users', 'edit'), validate(updateUserSchema), handleUpdateUser);
router.patch('/users/:id/deactivate', authenticate, authorize('users', 'delete'), validate(deactivateUserSchema), handleDeactivateUser);
router.patch('/users/:id/activate', authenticate, authorize('users', 'edit'), validate(reactivateUserSchema), handleReactivateUser);
router.patch('/users/:id/permissions', authenticate, authorize('users', 'edit'), validate(updatePermissionsSchema), handleUpdatePermissions);
router.patch('/users/:id/password', authenticate, authorize('users', 'edit'), validate(changePasswordSchema), handleChangePassword);
router.patch('/users/:id/reset-password', authenticate, authorize('users', 'edit'), validate(adminResetPasswordSchema), handleAdminResetPassword);
router.delete('/users/:id', authenticate, authorize('users', 'delete'), validate(objectIdParam, 'params'), validate(deactivateUserSchema), handleDeactivateUser);
router.delete('/users/:id/permanent', authenticate, authorize('users', 'delete'), validate(objectIdParam, 'params'), handlePermanentDeleteUser);

export default router;
