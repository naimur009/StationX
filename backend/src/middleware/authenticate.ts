import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: { module: string; actions: string[] }[];
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  try {
    const payload: AccessTokenPayload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    };
    next();
  } catch {
    return next(createError(401, 'UNAUTHORIZED', 'Invalid or expired access token'));
  }
}
