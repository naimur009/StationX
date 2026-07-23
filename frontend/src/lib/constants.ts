// ============================================================
// MUST be kept in sync with:
//   backend/src/shared/constants.ts (canonical source).
// See API.md §24 for the full list.
// ============================================================

export const MODULE_ACTIONS: Record<string, readonly string[]> = {
  // All feature modules in the project are listed here.
  // See API.md §24 for the full list.
  dashboard: ['view'],
  pos: ['view', 'create'],
  orders: ['view', 'edit', 'delete'],
  coupons: ['view', 'create', 'edit', 'delete'],
  tasks: ['view', 'create', 'edit', 'delete'],
  attendance: ['view', 'create', 'edit'],
  expenses: ['view', 'create', 'edit', 'delete'],
  incomes: ['view', 'create', 'edit', 'delete'],
  vendors: ['view', 'create', 'edit', 'delete'],
  products: ['view', 'create', 'edit', 'delete'],
  categories: ['view', 'create', 'edit', 'delete'],
  customers: ['view', 'create', 'edit', 'delete'],
  users: ['view', 'create', 'edit', 'delete'],
  employees: ['view', 'create', 'edit', 'delete'],
  settings: ['view', 'edit'],
  reports: ['view', 'create'],
  tables: ['view', 'create', 'edit', 'delete'],
  salary: ['view', 'create', 'edit', 'delete'],
  ['activity-log']: ['view', 'delete'],
  uploads: ['create'],
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
    incomes: 'Incomes',
    vendors: 'Vendors',
    products: 'Products',
    categories: 'Categories',
    customers: 'Customers',
    users: 'Users',
    employees: 'Employees',
    settings: 'Settings',
    reports: 'Reports',
    salary: 'Salary',
    tables: 'Tables',
    'activity-log': 'Activity Log',
    uploads: 'Uploads',
  };
  return labels[module] ?? module;
}

export function getActionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}
