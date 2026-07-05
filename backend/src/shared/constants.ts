// ============================================================
// CANONICAL SOURCE — MUST be kept in sync with:
//   frontend/src/lib/constants.ts
// These define the 16 permission module keys (API.md §24) and
// their valid actions. Adding/changing a module or action here
// must be mirrored in the frontend copy immediately.
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
  employees: ['view', 'create', 'edit', 'delete'],
  settings: ['view', 'edit'],
  reports: ['view', 'create'],
  salary: ['view', 'create', 'edit', 'delete'],
  ['activity-log']: ['view', 'delete'],
  uploads: ['create'],
} as const;
