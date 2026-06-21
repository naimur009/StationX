import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import {
  handleLogin,
  handleRefresh,
  handleLogout,
  handleForgotPassword,
  handleResetPassword,
  handleMe,
} from './auth.controller';

const router = Router();

router.post('/auth/login', validate(loginSchema), handleLogin);
router.post('/auth/refresh', handleRefresh);
router.post('/auth/logout', authenticate, handleLogout);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), handleForgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), handleResetPassword);
router.get('/auth/me', optionalAuth, handleMe);

export default router;
