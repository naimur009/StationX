import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { createError } from './errorHandler';

export function authorize(module: string, action: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const permission = req.user.permissions.find((p) => p.module === module);

    if (!permission) {
      return next(
        createError(403, 'FORBIDDEN', `Access denied: ${module}:${action}`)
      );
    }

    if (!permission.actions.includes(action)) {
      return next(
        createError(403, 'FORBIDDEN', `Access denied: ${module}:${action}`)
      );
    }

    next();
  };
}
