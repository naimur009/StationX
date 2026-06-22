// ============================================================
// MUST be kept in sync with:
//   backend/src/shared/constants.ts
// (canonical source). See API.md §24 for the full list.
// ============================================================

export const MODULE_ACTIONS: Record<string, readonly string[]> = {
  dashboard: ['view'],
  pos: ['view', 'create'],
  orders: ['view', 'edit', 'delete'],
  coupons: ['view', 'create', 'edit', 'delete'],
  tasks: ['view', 'create', 'edit', 'delete'],
  attendance: ['view', 'create', 'edit'],
  expenses: ['view', 'create', 'edit', 'delete'],
  vendors: ['view', 'create', 'edit', 'delete'],
  products: ['view', 'create', 'edit', 'delete'],
  categories: ['view', 'create', 'edit', 'delete'],
  customers: ['view', 'create', 'edit', 'delete'],
  users: ['view', 'create', 'edit', 'delete'],
  settings: ['view', 'edit'],
  reports: ['view', 'create'],
  ['activity-log']: ['view'],
} as const;

export const ALL_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

export function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    pos: 'POS',
    orders: 'Orders',
    coupons: 'Coupons',
    tasks: 'Tasks',
    attendance: 'Attendance',
    expenses: 'Expenses',
    vendors: 'Vendors',
    products: 'Products',
    categories: 'Categories',
    customers: 'Customers',
    users: 'Users',
    settings: 'Settings',
    reports: 'Reports',
    'activity-log': 'Activity Log',
  };
  return labels[module] ?? module;
}

export function getActionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}
