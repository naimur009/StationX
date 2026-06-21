import { Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt';
import { AuthenticatedRequest } from './authenticate';

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const payload: AccessTokenPayload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    };
  } catch {
    // ignore invalid token
  }

  next();
}
