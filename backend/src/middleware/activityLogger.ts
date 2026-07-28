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
  { pattern: /^\/users\/([^/]+)\/password$/, action: 'user.password_changed' },
  { pattern: /^\/users\/([^/]+)\/reset-password$/, action: 'user.password_reset' },
  { pattern: /^\/orders\/([^/]+)\/status$/, action: 'order.status_changed' },
  { pattern: /^\/attendance\/([^/]+)\/check-out$/, action: 'attendance.checked_out' },
  { pattern: /^\/tasks\/([^/]+)\/status$/, action: 'task.status_changed' },
  { pattern: /^\/coupons\/([^/]+)\/toggle$/, action: 'coupon.toggled' },
];

const STATE_DELETE_RULES: PathActionRule[] = [
  { pattern: /^\/users\/([^/]+)$/, action: 'user.deactivated' },
  { pattern: /^\/users\/([^/]+)\/permanent$/, action: 'user.hard_deleted' },
];

const AUTH_ACTION_MAP: Record<string, string> = {
  '/auth/login': 'login',
  '/auth/logout': 'logout',
};

const AUTH_DESCRIPTION_MAP: Record<string, string> = {
  'login': 'User logged in',
  'logout': 'User logged out',
};

const RESOURCE_DESCRIPTION_MAP: Record<string, (req: AuthenticatedRequest) => string> = {
  'user.created': (req) => `Created ${(req.body as Record<string, string>).role ?? ''} account "${(req.body as Record<string, string>).email ?? ''}"`,
  'user.updated': (req) => {
    const body = req.body as Record<string, string>;
    const changed = Object.keys(body).filter(k => k !== 'id').join(', ');
    return `Updated user profile${changed ? ` (${changed})` : ''}`;
  },
  'user.deactivated': () => 'Deactivated user',
  'user.hard_deleted': () => 'Permanently deleted user',
  'user.activated': () => 'Reactivated user',
  'user.password_changed': () => 'User changed their password',
  'user.password_reset': () => 'Admin reset user password',
  'user.permissions_updated': () => 'Updated user permissions',
  'settings.updated': (req) => {
    const keys = Object.keys(req.body as Record<string, unknown>);
    return `Updated settings: ${keys.join(', ')}`;
  },
  'products.created': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Created product "${name}"`;
  },
  'products.updated': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Updated product${name ? ` "${name}"` : ''}`;
  },
  'products.deleted': () => 'Deleted product',
  'categories.created': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Created category "${name}"`;
  },
  'categories.updated': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Updated category${name ? ` "${name}"` : ''}`;
  },
  'categories.deleted': () => 'Deleted category',
  'coupons.created': (req) => {
    const code = (req.body as Record<string, string>).code ?? '';
    return `Created coupon "${code}"`;
  },
  'coupons.updated': () => 'Updated coupon',
  'coupons.deleted': () => 'Deleted coupon',
  'coupon.toggled': (req) => {
    const code = req.params.id ?? '';
    return `Toggled coupon ${code ? `#${code.slice(-6)}` : ''}`;
  },
  'customers.created': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Created customer "${name}"`;
  },
  'customers.updated': () => 'Updated customer',
  'customers.deleted': () => 'Deleted customer',
  'vendors.created': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Created vendor "${name}"`;
  },
  'vendors.updated': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Updated vendor${name ? ` "${name}"` : ''}`;
  },
  'vendors.deleted': () => 'Deleted vendor',
  'expenses.created': (req) => {
    const body = req.body as Record<string, unknown>;
    return `Created expense of BDT ${(body.amount as number)?.toFixed(2) ?? '0.00'}${body.paidTo ? ` — ${body.paidTo}` : ''}`;
  },
  'expenses.updated': () => 'Updated expense',
  'expenses.deleted': () => 'Deleted expense',
  'tasks.created': (req) => {
    const title = (req.body as Record<string, string>).title ?? '';
    return `Created task "${title}"`;
  },
  'tasks.updated': () => 'Updated task',
  'tasks.deleted': () => 'Deleted task',
  'task.status_changed': (req) => {
    const status = (req.body as Record<string, string>).status ?? '';
    return `Changed task status to ${status}`;
  },
  'attendance.created': (req) => {
    const status = (req.body as Record<string, string>).status ?? '';
    return `Marked attendance as ${status}`;
  },
  'attendance.updated': () => 'Updated attendance record',
  'orders.updated': () => 'Updated order',
  'orders.deleted': () => 'Deleted order',
  'order.status_changed': (req) => {
    const status = (req.body as Record<string, string>).status ?? '';
    return `Changed order status to ${status}${status === 'cancelled' && (req.body as Record<string, string>).cancelReason ? ` (${(req.body as Record<string, string>).cancelReason})` : ''}`;
  },
  'employees.created': (req) => {
    const name = (req.body as Record<string, string>).name ?? '';
    return `Created employee "${name}"`;
  },
  'employees.updated': () => 'Updated employee',
  'employees.deleted': () => 'Deleted employee',
  'salaries.created': (req) => {
    const body = req.body as Record<string, unknown>;
    return `Created salary record${body.employeeId ? ` for employee` : ''}`;
  },
  'salaries.updated': () => 'Updated salary record',
  'attendance.checked_out': () => 'Checked out attendance',
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
  employees: 'Employee',
  incomes: 'Income',
  salaries: 'Salary',
  tables: 'Table',
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
  const parts = path.replace(/^\/api\/v1\//, '').split('/').filter(Boolean);
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

  if (req.method === 'DELETE') {
    for (const rule of STATE_DELETE_RULES) {
      if (rule.pattern.test(pathKey)) {
        return rule.action;
      }
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
