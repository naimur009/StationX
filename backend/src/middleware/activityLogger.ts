import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import ActivityLog from '../models/ActivityLog';

export function activityLogger(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  res.on('finish', () => {
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      req.method !== 'GET' &&
      req.user
    ) {
      const moduleName = extractModule(req.path);
      const action = buildAction(req);

      ActivityLog.create({
        actor: req.user.id,
        module: moduleName,
        action,
        description: buildDescription(req, action),
      }).catch((err) => {
        console.error('[activityLog] Failed to write activity log:', moduleName, action, err);
      });
    }
  });

  next();
}

function extractModule(path: string): string {
  const parts = path.replace('/api/v1/', '').split('/');
  return parts[0] || 'unknown';
}

function buildAction(req: AuthenticatedRequest): string {
  const moduleName = extractModule(req.path);

  const specialPaths: Record<string, string> = {
    '/auth/login': 'login',
    '/auth/logout': 'logout',
    '/auth/refresh': 'token.refresh',
    '/auth/forgot-password': 'password.reset_requested',
    '/auth/reset-password': 'password.reset',
  };

  const pathKey = req.path.replace('/api/v1', '');
  if (specialPaths[pathKey]) {
    return specialPaths[pathKey];
  }

  const rawAction = methodToAction(req.method);
  return `${moduleName}.${rawAction}`;
}

function buildDescription(req: AuthenticatedRequest, action: string): string {
  const specialDescriptions: Record<string, string> = {
    'login': `User logged in`,
    'logout': `User logged out`,
    'token.refresh': `Access token refreshed`,
    'password.reset_requested': `Password reset requested`,
    'password.reset': `Password was reset`,
  };

  if (specialDescriptions[action]) {
    return specialDescriptions[action];
  }

  return `${action} via ${req.method} ${req.path}`;
}

function methodToAction(method: string): string {
  switch (method) {
    case 'POST':
      return 'created';
    case 'PUT':
      return 'updated';
    case 'PATCH':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    default:
      return method.toLowerCase();
  }
}
