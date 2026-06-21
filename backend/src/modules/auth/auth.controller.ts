import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
};

export async function handleLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleRefresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return next(createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token'));
    }

    const result = await authService.refresh(refreshToken);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({ data: { accessToken: result.accessToken } });
  } catch (error) {
    next(error);
  }
}

export async function handleLogout(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);

  res.status(200).json({ data: { success: true } });
}

export async function handleForgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}

export async function handleResetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);

    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}

export async function handleMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    const user = await authService.getMe(req.user.id);

    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
}
