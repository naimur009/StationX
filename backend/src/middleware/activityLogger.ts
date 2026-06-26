import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';

declare module 'express' {
  interface Request {
    skipActivityLog?: boolean;
  }
}

import ActivityLog from '../models/ActivityLog';

interface PathActionRule {
  pattern: RegExp;
  action: string;
}

const STATE_TRANSITION_RULES: PathActionRule[] = [
  { pattern: /^\/users\/([^/]+)\/deactivate$/, action: 'user.deactivated' },
  { pattern: /^\/users\/([^/]+)\/activate$/, action: 'user.activated' },
  { pattern: /^\/users\/([^/]+)\/permissions$/, action: 'user.permissions_updated' },
  { pattern: /^\/orders\/([^/]+)\/status$/, action: 'order.status_changed' },
  { pattern: /^\/attendance\/([^/]+)\/check-out$/, action: 'attendance.checked_out' },
  { pattern: /^\/tasks\/([^/]+)\/status$/, action: 'task.status_changed' },
  { pattern: /^\/coupons\/([^/]+)\/toggle$/, action: 'coupon.toggled' },
];

const AUTH_ACTION_MAP: Record<string, string> = {
  '/auth/login': 'login',
  '/auth/logout': 'logout',
  '/auth/refresh': 'token.refresh',
  '/auth/forgot-password': 'password.reset_requested',
  '/auth/reset-password': 'password.reset',
};

const AUTH_DESCRIPTION_MAP: Record<string, string> = {
  'login': 'User logged in',
  'logout': 'User logged out',
  'token.refresh': 'Access token refreshed',
  'password.reset_requested': 'Password reset requested',
  'password.reset': 'Password was reset',
};

const RESOURCE_DESCRIPTION_MAP: Record<string, (req: AuthenticatedRequest) => string> = {
  'user.created': (req) => `Created ${(req.body as Record<string, string>).role ?? ''} account "${(req.body as Record<string, string>).email ?? ''}"`,
  'user.updated': () => 'Updated user profile',
  'user.deactivated': () => 'Deactivated user',
  'user.activated': () => 'Reactivated user',
  'user.permissions_updated': () => 'Updated user permissions',
  'settings.updated': (req) => {
    const keys = Object.keys(req.body as Record<string, unknown>);
    return `Updated settings: ${keys.join(', ')}`;
  },
  'products.created': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Created product "${name}"`;
  },
  'products.updated': () => 'Updated product',
  'products.deleted': () => 'Deleted product',
};

const TARGET_TYPE_MAP: Record<string, string> = {
  users: 'User',
  auth: 'User',
  pos: 'POS',
  orders: 'Order',
  coupons: 'Coupon',
  tasks: 'Task',
  attendance: 'Attendance',
  expenses: 'Expense',
  vendors: 'Vendor',
  products: 'Product',
  categories: 'Category',
  customers: 'Customer',
  settings: 'Settings',
  reports: 'Report',
  'activity-log': 'ActivityLog',
  dashboard: 'Dashboard',
};

function extractTargetType(moduleName: string): string {
  return TARGET_TYPE_MAP[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1).replace(/-./g, (c) => c[1].toUpperCase());
}

export function activityLogger(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body && body.data && typeof body.data === 'object') {
      const data = body.data as Record<string, unknown>;
      if (data.id && !res.locals.targetId) {
        res.locals.targetId = data.id as string;
      }
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    if (req.skipActivityLog) return;
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      req.method !== 'GET' &&
      req.user
    ) {
      const moduleName = extractModule(req.path);
      const action = buildAction(req);
      const targetId = res.locals.targetId ?? req.params.id ?? undefined;
      const targetType = extractTargetType(moduleName);

      const entry: Record<string, unknown> = {
        actor: req.user.id,
        module: moduleName,
        action,
        targetId,
        targetType,
        description: buildDescription(req, action),
      };

      if (res.locals.activityMetadata) {
        entry.metadata = res.locals.activityMetadata;
      }

      ActivityLog.create(entry).catch((err) => {
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
  const pathKey = req.path.replace('/api/v1', '');

  if (AUTH_ACTION_MAP[pathKey]) {
    return AUTH_ACTION_MAP[pathKey];
  }

  for (const rule of STATE_TRANSITION_RULES) {
    if (rule.pattern.test(pathKey)) {
      return rule.action;
    }
  }

  const moduleName = extractModule(req.path);
  const rawAction = methodToAction(req.method);
  return `${moduleName}.${rawAction}`;
}

function buildDescription(req: AuthenticatedRequest, action: string): string {
  if (AUTH_DESCRIPTION_MAP[action]) {
    const roleLabel = req.user?.role ? ` (${req.user.role})` : '';
    return AUTH_DESCRIPTION_MAP[action] + roleLabel;
  }

  const customDesc = RESOURCE_DESCRIPTION_MAP[action];
  if (customDesc) {
    return customDesc(req);
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
