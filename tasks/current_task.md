# Current Task — Expenses

**PRD Feature 9** | `API.md` §14 | `DATABASE.md` §3.12 | `ARCHITECTURE.md` §5, §9
**Depends on:** Users & Permissions (Task 1), Vendors (Task 14) — `vendorId` optional ref
**Permission module key:** `expenses` — already registered in `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts` with actions `['view', 'create', 'edit', 'delete']`
**Sidebar link:** Already exists at `/expenses` with `module: 'expenses'` and `ArrowUpDown` icon — the route doesn't exist yet; this task creates it.

---

## Backend (`backend/src/modules/expenses/` — 4 new files, 1 new model)

### Model — `backend/src/models/Expense.ts`

Create the Mongoose model matching `DATABASE.md` §3.12:

```ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  amount: number;
  date: Date;
  description: string;
  category: string;
  vendorId?: Types.ObjectId;
  paidBy: Types.ObjectId;
  paidTo: string;
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidTo: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bkash', 'nagad'],
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ vendorId: 1 });
expenseSchema.index({ paidBy: 1 });

const Expense = mongoose.model<IExpense>('Expense', expenseSchema);

export default Expense;
```

- **Hard-deletable** — no `isActive` field. Falls outside the five-collection soft-delete list per `DATABASE.md` §3.12.
- `vendorId` is optional — ad-hoc payments use only `paidTo` (free-text).
- `createdBy` is set server-side from `req.user.id`, **not** from the request body.
- `paymentMethod` enum is `cash | card | bkash | nagad` — same as `Order.payment.method` minus `split` (not applicable to expenses).
- `category` is free-text string — no separate `ExpenseCategory` collection in v1 (open item per §8 of DATABASE.md).

### Backend Setup — `backend/src/shared/constants.ts`

**Already done** — `expenses: ['view', 'create', 'edit', 'delete']` is registered.

### Validation — `expenses.validation.ts`

**`createExpenseSchema`** (body, for `POST /expenses`):
- `amount` — required number, positive (`> 0`), max precision 2 decimal places (currency)
- `date` — required, coerceable to Date via `z.coerce.date()` (accepts ISO string)
- `description` — required string, min 1, max 500, trimmed
- `category` — required string, min 1, max 100, trimmed
- `vendorId` — optional string, must be valid Mongo ObjectId if provided
- `paidBy` — required string, must be valid Mongo ObjectId (User ref)
- `paidTo` — required string, min 1, max 200, trimmed
- `paymentMethod` — required enum: `'cash' | 'card' | 'bkash' | 'nagad'`
- Use `.strict()` — no unexpected fields
- Note: `createdBy` is NOT in the schema — it's set server-side

**`updateExpenseSchema`** (body, for `PUT /expenses/:id`):
- Same fields as create, all optional
- Use `.strict()`

**`listExpensesQuerySchema`** (query, for `GET /expenses`):
- `range` — optional enum `'today' | 'week' | 'month' | 'custom'`
- `from` — optional string (date ISO), required when `range === 'custom'`
- `to` — optional string (date ISO), required when `range === 'custom'`
- `category` — optional string, max 100, for category filter
- `vendorId` — optional string, valid Mongo ObjectId, for vendor filter
- `paymentMethod` — optional enum `'cash' | 'card' | 'bkash' | 'nagad'`
- `paidBy` — optional string, valid Mongo ObjectId
- `page` — optional, coerce to int, min 1, default 1
- `limit` — optional, coerce to int, min 1, max 100, default 20
- Use `.strict()`
- Validation: when `range === 'custom'`, `from` and `to` must be present (refine)
- Validation: when `range !== 'custom'`, `from`/`to` should be ignored (server-computed)

**`objectIdParam`** (params, for all `/:id` routes):
- `id` — string, must be valid Mongo ObjectId

Export types for all schemas.

### Service — `expenses.service.ts`

Follow the same pattern as `orders.service.ts` for date-range filtering.

**Date range computation (`computeDateRange` helper):**
- `'today'` → from = start of today, to = end of today
- `'week'` → from = start of current week (Monday), to = end of today
- `'month'` → from = start of current month, to = end of today
- `'custom'` → from = provided `from` at 00:00:00, to = provided `to` at 23:59:59.999

**`listExpenses(query)`**
- Build MongoDB filter:
  - Date range: if `range` or `from`/`to` present, build `date` filter (gte/lte using computed dates)
  - `category` → `{ category }` exact match (free-text, case-insensitive via regex or exact — follow the Orders convention of exact match for enum-like fields)
  - `vendorId` → `{ vendorId: ObjectId }`
  - `paymentMethod` → `{ paymentMethod }`
  - `paidBy` → `{ paidBy: ObjectId }`
- Sort by `{ date: -1, createdAt: -1 }` — most recent first
- Paginate with `.skip().limit()`, `total` from `Expense.countDocuments(filter)`
- `.lean()` for performance
- Populate `vendorId` with `name` only (for display), `paidBy` with `name` and `email`, `createdBy` with `name`
- Return `{ data: expenses, meta: { total, page, limit } }`
- Response shape per expense:
  ```ts
  {
    id: string;
    amount: number;
    date: string;
    description: string;
    category: string;
    vendorId?: { _id: string; name: string } | null;
    paidBy: { _id: string; name: string; email: string };
    paidTo: string;
    paymentMethod: string;
    createdBy: { _id: string; name: string };
    createdAt: string;
    updatedAt: string;
  }
  ```

**`getExpenseById(id)`**
- `Expense.findById(id).lean()` with same population as list
- If not found → `createError(404, 'NOT_FOUND', 'Expense not found')`
- Return `{ data: expense }`

**`createExpense(dto, userId)`**
- `Vendor.findById(dto.vendorId)` → verify vendor exists (even if deactivated, allow — per EXP-E-01)
- `User.findById(dto.paidBy)` → verify user exists (404 if not)
- `Expense.create({ ...dto, createdBy: userId })`
- Emit `dashboard:metricsInvalidate` via WebSocket (or at least trigger invalidation — see WebSocket section)
- Return `{ data: expense }`

**`updateExpense(id, dto)`**
- Optionally verify `vendorId`/`paidBy` if provided (same as create)
- `Expense.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true }).lean()`
- If not found → `404 NOT_FOUND`
- Emit `dashboard:metricsInvalidate` (expense update affects totals)
- Return `{ data: expense }`

**`deleteExpense(id)`**
- Hard delete: `Expense.findByIdAndDelete(id)`
- If not found → `404 NOT_FOUND`
- Emit `dashboard:metricsInvalidate` (expense deletion affects totals)
- Return `{ data: { success: true } }`

### Controller — `expenses.controller.ts`

- Named exports: `handleListExpenses`, `handleGetExpense`, `handleCreateExpense`, `handleUpdateExpense`, `handleDeleteExpense`
- Same pattern as vendors controller: extract from `req.query`/`req.body`/`req.params`, call service, wrap in `try/catch/next`
- `listExpenses` → `res.status(200).json(result)` (paginated list with meta)
- `getExpense` → `res.status(200).json({ data: expense })`
- `createExpense` → `res.status(201).json({ data: expense })`
- `updateExpense` → `res.status(200).json({ data: expense })`
- `deleteExpense` → `res.status(200).json({ data: { success: true } })`
- Pass `req.user.id` as second arg to `createExpense` and optionally to `updateExpense` if needed

### Routes — `expenses.routes.ts`

```
GET    /expenses                    -> authenticate, authorize('expenses','view'), validate(listExpensesQuerySchema,'query'), handleListExpenses
GET    /expenses/:id                -> authenticate, authorize('expenses','view'), validate(objectIdParam,'params'), handleGetExpense
POST   /expenses                    -> authenticate, authorize('expenses','create'), validate(createExpenseSchema), handleCreateExpense
PUT    /expenses/:id                -> authenticate, authorize('expenses','edit'), validate(updateExpenseSchema), handleUpdateExpense
DELETE /expenses/:id                -> authenticate, authorize('expenses','delete'), validate(objectIdParam,'params'), handleDeleteExpense
```

Export default router.

### Module Registration — `backend/src/app.ts`

- `import expensesRoutes from './modules/expenses/expenses.routes';`
- Add mutation rate limiter (same pattern as vendors):
```ts
const expensesMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/expenses', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return expensesMutationLimiter(req, res, next);
  }
  next();
});
```
- Mount: `app.use('/api/v1', expensesRoutes);` (after `vendorsRoutes`, before `posRoutes`)

### WebSocket / Dashboard Invalidation

Per `API.md` §23: expense creation triggers `dashboard:metricsInvalidate` to refresh dashboard totals.

**Approach (follow existing pattern):**
- Check if there's an existing WebSocket utility (`backend/src/lib/websocket.ts` or similar) that emits events — if so, import and use it
- If no WebSocket infra exists yet, use a lightweight approach:
  - After successful create/update/delete mutations, call a shared `invalidateDashboard()` helper
  - For now, this can just log a message (WebSocket integration is a future concern per architecture)
  - Document in code comments that this is where the WebSocket emit should go when infra is ready

Search for existing WebSocket code in the codebase first.

### Activity Logger Configuration — No Code Changes Needed

The `activityLogger.ts` middleware already supports expenses:
- `TARGET_TYPE_MAP.expenses: 'Expense'` — already confirmed at `activityLogger.ts:69`
- The logger will automatically capture:
  - `expenses.created` for `POST /expenses`
  - `expenses.updated` for `PUT /expenses/:id`
  - `expenses.deleted` for `DELETE /expenses/:id`

---

## Frontend (`frontend/src/features/expenses/` — schema.ts, api.ts, 3 components + 2 pages)

### Already Done (No Changes Needed)
- Permission module key `expenses: ['view', 'create', 'edit', 'delete']` registered in `frontend/src/lib/constants.ts`
- Sidebar nav link `/expenses` with `module: 'expenses'` already exists in `Sidebar.tsx` — permission-gated automatically
- `DataTable` shared component exists for the list view
- `PermissionGate` shared component exists
- `ConfirmDialog` shared component exists for delete confirmation
- `useDateRangeFilter` hook exists at `frontend/src/hooks/useDateRangeFilter.ts`

### Schema — `schema.ts`

**`createExpenseSchema`** — mirrors the backend schema:
```ts
export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.coerce.date({ required_error: 'Date is required' }),
  description: z.string().min(1, 'Description is required').max(500),
  category: z.string().min(1, 'Category is required').max(100),
  vendorId: z.string().optional(),
  paidBy: z.string().min(1, 'Paid by is required'),
  paidTo: z.string().min(1, 'Paid to is required').max(200),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']),
});

export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>;
```

**`updateExpenseSchema`** — same fields, all optional.

**`listExpensesQuerySchema`** — for constructing query params (client-side helper, not zod resolver):
- Same as backend but with `z.string()` for values

### API — `api.ts`

- `'use client'` at top
- Response types:
```ts
export interface ExpenseResponse {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  vendorId?: { _id: string; name: string } | null;
  paidBy: { _id: string; name: string; email: string };
  paidTo: string;
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}
```

- `useExpensesList(params)` — `useQuery`, key `['expenses', 'list', qs]`
  - Params: `page?`, `limit?`, `range?`, `from?`, `to?`, `category?`, `vendorId?`, `paymentMethod?`, `paidBy?`
- `useExpense(id)` — `useQuery`, key `['expenses', 'detail', id]`, enabled only when `id` is truthy
- `useCreateExpense()` — `useMutation`, invalidates `['expenses']` AND `['dashboard']` on success
- `useUpdateExpense()` — `useMutation`, invalidates `['expenses']` AND `['dashboard']` on success
- `useDeleteExpense()` — `useMutation`, invalidates `['expenses']` AND `['dashboard']` on success
- Query keys follow: `['expenses', 'list', qs]`, `['expenses', 'detail', id]`, `['dashboard']`

### Components

#### `ExpenseForm.tsx`
- Reusable form for both **create** and **edit** modes
- Props: `open: boolean`, `expense?: ExpenseResponse`, `onClose: () => void`
- Fields:
  - `amount` — number input, `min=0`, `step="0.01"`, required
  - `date` — date input (`type="date"`), required
  - `description` — textarea, required
  - `category` — text input OR dropdown (free-text with optional predefined suggestions; check if a shared Select/CategoryPicker exists)
  - `vendorId` — vendor select dropdown (use `useVendorsList` with `isActive: false` to include deactivated vendors for historical reference — per EXP-E-01). Optional field.
  - `paidBy` — user select dropdown (use a `useUsersList` query or similar for staff list). Required.
  - `paidTo` — text input, required. When `vendorId` is selected, auto-fill from vendor name (user can override — per DATABASE.md: "mirrors vendor name for record consistency").
  - `paymentMethod` — select/enum dropdown: Cash, Card, bKash, Nagad. Required.
- In edit mode, pre-populate all fields
- Submit calls the appropriate mutation based on mode
- Validation via Zod schemas, displayed inline per-field

**paidTo auto-fill behavior:**
- When `vendorId` changes and a vendor is selected, set `paidTo` to `vendor.name`
- The user can still edit `paidTo` manually after auto-fill
- This matches DATABASE.md: "When vendorId is set, this typically mirrors the vendor name for record consistency"
- Implement via `useEffect` watching `vendorId`

#### `ExpenseList.tsx`
- Uses `useExpensesList(params)` with current filter state
- Renders `DataTable` with columns:
  - `date` — formatted date (short format)
  - `description` — truncated to 60 chars with tooltip
  - `category` — badge/tag (small, colored badge)
  - `paidTo` — payee name
  - `vendor` — vendor name link (if `vendorId` exists), dash otherwise
  - `amount` — right-aligned, formatted currency (`$X,XXX.XX`)
  - `paymentMethod` — icon/label (small badge)
  - `paidBy` — staff name
  - Actions column (view, edit, delete) — permission-gated individually
- **Date range filter bar** using `useDateRangeFilter` hook:
  - Quick-select buttons: Today, This Week, This Month, Custom
  - When "Custom" selected, show `from`/`to` date inputs
- **Category filter** — dropdown or text input (free-text filter)
- **Vendor filter** — select dropdown (populated from vendors list)
- **Payment method filter** — multi-select or single-select enum dropdown
- **Paid by filter** — user/staff select dropdown
- **Search input** for `description` text (debounced ~300ms) — optional, not in all backends but nice to have
- Pagination via `DataTable`'s built-in pagination
- Loading: `DataTable` skeleton. Empty: "No expenses found. Record your first expense to get started."
- **Mobile degradation:** Use `mobileRender` on `DataTable` to render expense cards (date prominent, description, amount, category badge, payment method)

#### `ExpenseDetail.tsx`
- Fetches via `useExpense(id)`
- Displays expense information in a structured detail card:
  - **Header:** `amount` (large, formatted), `date`, `category` badge
  - **Description section:** full description text
  - **Payment section:** `paidTo`, `vendor` (if present, clickable link to vendor detail), `paymentMethod`, `paidBy`
  - **Metadata:** Created at, Updated at, created by
  - **Actions:** Edit button (permission-gated `expenses:edit`), Delete button (permission-gated `expenses:delete`)
- Delete action uses the shared `ConfirmDialog` with messaging:
  - Title: "Delete Expense"
  - Body: `"Are you sure you want to permanently delete this expense of {amount} from {date}? This action cannot be undone."`
  - Confirm button: "Delete" (destructive style)
- Loading: content skeleton. Error/not-found: dedicated error state

### Pages

#### `frontend/src/app/(dashboard)/expenses/page.tsx`
- `'use client'`
- `<PermissionGate module="expenses" action="view">` wraps the whole page
- Title: "Expenses" with subtitle "Track your business expenses"
- "Add Expense" button (permission-gated `expenses:create`) → opens `ExpenseForm` in a modal
- Filter section: date range tabs + category filter + vendor filter + payment method filter
- Composition: filter bar → `ExpenseList`
- When "Add Expense" succeeds, close the modal, invalidate queries, show a success toast

#### `frontend/src/app/(dashboard)/expenses/[expenseId]/page.tsx`
- `'use client'`
- Dynamic route: `[expenseId]` param
- Fetches expense by ID, renders `<ExpenseDetail />`
- Back navigation to the expenses list
- Breadcrumb: Expenses > [date + description]
- "Edit" button on the detail page opens `ExpenseForm` in edit mode (modal)

---

## Design

- **Date range filter bar:** Follow the pattern from Reports (when built) — quick-select pills (Today, This Week, This Month, Custom) with date inputs for custom range. Reuse the existing `useDateRangeFilter` hook at `frontend/src/hooks/useDateRangeFilter.ts`.
- **Category filter:** Free-text input with suggested completions from existing expense categories (fetch distinct categories from backend or maintain client-side set). For v1, a simple text input is sufficient — advanced filtering is a Reports concern.
- **paidTo/vendorId UX:** When a vendor is selected from the dropdown, auto-populate `paidTo` with the vendor name. The user can override. This matches DATABASE.md: "When vendorId is set, this typically mirrors the vendor name for record consistency."
- **Amount formatting:** Use currency formatting (locale-aware). Per theme.md, amounts should be right-aligned in tables and bold in detail views.
- **Hard delete UX:** Per theme.md, use "Delete" vocabulary (not "Deactivate") since Expense is hard-deletable. The button text is "Delete", the confirm dialog says "Delete Expense", and the success toast says "Expense deleted". Use destructive red styling.

---

## Implementation Notes

### Files to Create

**Model (1 new file):**
1. `backend/src/models/Expense.ts`

**Backend (4 new files):**
1. `backend/src/modules/expenses/expenses.validation.ts`
2. `backend/src/modules/expenses/expenses.service.ts`
3. `backend/src/modules/expenses/expenses.controller.ts`
4. `backend/src/modules/expenses/expenses.routes.ts`

**Modify (backend):**
- `backend/src/app.ts` — register Expenses routes + mutation rate limiter

**Frontend (5 new files):**
1. `frontend/src/features/expenses/schema.ts`
2. `frontend/src/features/expenses/api.ts`
3. `frontend/src/features/expenses/components/ExpenseForm.tsx`
4. `frontend/src/features/expenses/components/ExpenseList.tsx`
5. `frontend/src/features/expenses/components/ExpenseDetail.tsx`

**Pages (2 new files):**
1. `frontend/src/app/(dashboard)/expenses/page.tsx`
2. `frontend/src/app/(dashboard)/expenses/[expenseId]/page.tsx`

### Patterns to Follow

- **Follow exactly:** controller/service/routes file shape from `vendors` or `orders` module — named exports, `import * as service`, `try/catch/next`, `validate` middleware, `authenticate`/`authorize` chain.
- **Date range filtering:** Follow the `from`/`to` filter pattern from `orders.service.ts` (lines 193-202) — build a `dateFilter` with `$gte`/`$lte` for the `date` field. The validation schema should handle `range` + computed dates per CC-DATE test cases.
- **Hard delete pattern:** Use `findByIdAndDelete` (not soft delete). Match the behavior of any existing hard-delete module (none yet — this is the first hard-deletable collection).
- **Population pattern:** Always populate `vendorId`, `paidBy`, and `createdBy` references to avoid N+1 queries on the frontend. Use `.populate('vendorId', 'name')` and `.populate('paidBy', 'name email')` and `.populate('createdBy', 'name')`.
- **Follow the DataTable pattern** from categories/vendors list page — column definition, `mobileRender`, loading/empty/error states.
- **Expense form modal pattern:** Use a modal (dialog) for create/edit, matching the vendors pattern (the existing convention).
- **Dashboard invalidation structure:** After successful mutations, invalidate `['dashboard']` query key in addition to `['expenses']`. No WebSocket code needed yet — just React Query invalidation on the frontend is sufficient for now.

### Already Done (No Changes Needed)
- Permission module key `expenses` registered in both `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts` with `['view', 'create', 'edit', 'delete']`
- Sidebar nav link `/expenses` already exists in `sidebarLinks` frontend data and is permission-gated
- `ArrowUpDown` icon is already imported in `Sidebar.tsx` from `lucide-react`
- `ConfirmDialog` shared component exists for delete confirmation
- `DataTable` shared component exists with `mobileRender` support
- `PermissionGate` shared component exists
- `useDateRangeFilter` hook exists for date range filter state management
- Activity logger `TARGET_TYPE_MAP` already includes `expenses: 'Expense'`

### Activity Logger

The `activityLogger.ts` middleware auto-captures mutations. No changes needed — `TARGET_TYPE_MAP` already includes `expenses: 'Expense'` at line 69.

### WebSocket / Dashboard Invalidation

Per `API.md` §23:
> `dashboard:metricsInvalidate` — Any revenue-affecting event (order created/status changed, expense created) triggers Dashboard React Query `invalidateQueries(['dashboard'])`.

**Frontend approach:** In each mutation hook (`useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`), add `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` in the `onSuccess` callback alongside the expenses invalidation.

**Backend approach:** Check if a WebSocket event emitter exists (`backend/src/lib/websocket.ts` or similar). If it does, emit `dashboard:metricsInvalidate` after each expense mutation. If it doesn't, add a comment/TODO noting where the WebSocket emit should go when the infra is built.

### Verification

- `tsc --noEmit` passes clean on both apps
- `npm run dev` — full CRUD flow works end to end:
  - Can create an expense with all required fields
  - Can create an expense with vendorId (optional) — auto-fills paidTo
  - Can create an expense without vendorId (ad-hoc, paidTo only)
  - Can browse expense list with date range, category, vendor, payment method filters
  - Can view expense detail with all payment info, vendor link, staff info
  - Can edit expense fields
  - Can hard-delete an expense — confirmed removed from DB
  - Dashboard metrics update after expense create/update/delete
- Run the relevant `TEST_CASES.md` §10 (Expenses) cases explicitly:
  - **EXP-H-01:** `POST /expenses` full valid payload with `vendorId` → `201`
  - **EXP-H-02:** `POST /expenses` without `vendorId` (ad-hoc) → `201`
  - **EXP-V-01:** Negative `amount` → `400 VALIDATION_ERROR`
  - **EXP-V-02:** Missing `paidBy` or `paidTo` → `400 VALIDATION_ERROR`
  - **EXP-V-03:** `paymentMethod: split` → `400 VALIDATION_ERROR`
  - **EXP-H-03:** `GET /expenses?range=&category=&vendorId=` → correctly filtered
  - **EXP-H-04:** `DELETE /expenses/:id` → hard delete succeeds
  - **EXP-E-01:** `vendorId` references soft-deleted vendor → creation succeeds
  - **EXP-AUTH-01:** User lacks `expenses:create` → `403 FORBIDDEN`
