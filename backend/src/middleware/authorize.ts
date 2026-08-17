import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { createError } from './errorHandler';

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(createError(403, 'FORBIDDEN', 'Access denied: admin only'));
  }

  next();
}

export function authorize(module: string | string[], action: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const modules = Array.isArray(module) ? module : [module];
    const permission = req.user.permissions.find((p) => modules.includes(p.module));

    if (!permission) {
      return next(
        createError(403, 'FORBIDDEN', `Access denied: ${modules.join('/')}:${action}`)
      );
    }

    if (!permission.actions.includes(action)) {
      return next(
        createError(403, 'FORBIDDEN', `Access denied: ${permission.module}:${action}`)
      );
    }

    next();
  };
}
