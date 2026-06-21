import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import ActivityLog from '../models/ActivityLog';

export function activityLogger(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const originalSend = _res.json.bind(_res);

  _res.json = function (body: unknown) {
    if (
      _res.statusCode >= 200 &&
      _res.statusCode < 300 &&
      req.method !== 'GET' &&
      req.user
    ) {
      const moduleName = extractModule(req.path);
      const rawAction = req.path.endsWith('/logout') ? 'logout' : methodToAction(req.method);
      const action = `${moduleName}.${rawAction}`;

      ActivityLog.create({
        actor: req.user.id,
        module: moduleName,
        action,
        description: `${action} via ${req.method} ${req.path}`,
      }).catch((err) => {
        console.error('[activityLog] Failed to write activity log:', moduleName, action, err);
      });
    }

    return originalSend(body);
  };

  next();
}

function extractModule(path: string): string {
  const parts = path.replace('/api/v1/', '').split('/');
  return parts[0] || 'unknown';
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
