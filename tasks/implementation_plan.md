# Implementation Plan — Expenses Module (Task 15)

**PRD Feature 9** | `API.md` §14 | `DATABASE.md` §3.12 | `ARCHITECTURE.md` §5, §9
**Dependencies:** Users & Permissions (Task 1), Vendors (Task 14)
**Permission module key:** `expenses` (already registered)
**Sidebar link:** Already exists at `/expenses` with `ArrowUpDown` icon

---

## Feature Overview

- **Feature name:** Expenses Management Module
- **Business goal:** Allow restaurant staff to record, track, filter, and manage business expenses with full audit trail
- **User value:** Centralized expense recording with date-range/category/vendor filters feeds into Reports module and provides financial transparency. Separate `paidBy` (who actually paid) from `createdBy` (who recorded the entry) tracks liability accurately.

---

## Approved Scope

| Included | Description |
|----------|-------------|
| Backend model | `Expense` collection per `DATABASE.md` §3.12, hard-deletable, no `isActive` |
| Backend CRUD | 5 endpoints: list (filtered), detail, create, update, hard-delete |
| Date range filter | `?range=today\|week\|month\|custom&from=&to=` computed server-side |
| Category filter | Free-text matching on `category` field (resolved: not an enum) |
| Frontend list page | DataTable with date range, category, vendor, payment-method filters |
| Frontend create/edit | Modal form with vendor picker, auto-fill `paidTo` from vendor name |
| Frontend detail page | Structured detail card with edit/delete actions |
| Dashboard invalidation | Frontend React Query `invalidateQueries(['dashboard'])` on mutations |
| Hard-delete UX | "Delete Expense" vocabulary, destructive confirm dialog, permanent removal |

| Out of Scope | Rationale |
|--------------|-----------|
| WebSocket backend events | No `backend/src/lib/websocket.ts` infra exists yet; frontend-only React Query invaliation is sufficient for v1 |
| Expense category CRUD management | Category is free-text; no separate `ExpenseCategory` collection in v1 per §6 normalization note |
| Bulk expense operations | Not in PRD or API spec; single-record CRUD only |
| Scheduled/automated expense reports | Deferred to Reports module v2 per ARCHITECTURE.md §13 |

---

## Doc Updates Required

### Update `DATABASE.md` §8.3 — Close open item

**File:** `docs/database.md`
**Section:** §8, item 3
**Old text:**
```
3. **Expense.category values** — confirm whether this should be a fixed enum (cleaner filtering, matches "Filter expenses by category" in PRD Feature 9) or free text (more flexible, harder to filter cleanly). Leaning enum; needs sign-off before `API.md` defines the validation schema.
```
**New text:**
```
3. ~~**Expense.category values** — confirm whether this should be a fixed enum (cleaner filtering, matches "Filter expenses by category" in PRD Feature 9) or free text (more flexible, harder to filter cleanly). Leaning enum; needs sign-off before `API.md` defines the validation schema.~~ **RESOLVED:** free text, not enum. The `category` field is a free-text string (`DATABASE.md` §3.12). Filtering uses regex matching on the server side. See `tasks/implementation_plan.md`.
```

**Note to implementer:** `API.md` §14 and `DATABASE.md` §3.12 already correctly specify `category` as a string (free-text), so only the open item in §8.3 needs closure — neither schema doc needs a field-type correction.

---

## Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| TD-1 | `Expense.category` is free-text string, not enum | User confirmed; matches the schema definition in §3.12 and §6 normalization note |
| TD-2 | Hard delete via `findByIdAndDelete` | Expense is the first hard-deletable financial collection; no downstream references that would orphan |
| TD-3 | `createdBy` set server-side from `req.user.id`, never from request body | Prevents privilege escalation; matches `Order.createdBy` pattern |
| TD-4 | Populate `vendorId` (name), `paidBy` (name+email), `createdBy` (name) on all reads | Avoids N+1 queries for list/detail views |
| TD-5 | Frontend-only dashboard invalidation (no WebSocket) | `backend/src/lib/websocket.ts` doesn't exist yet; React Query invalidation on mutation success is sufficient for single-terminal use |
| TD-6 | `paidTo` auto-fills from vendor name when vendor selected | User can override the auto-filled text; matches DATABASE.md's "mirrors vendor name for record consistency" |
| TD-7 | Category filter uses case-insensitive regex matching | Follows the free-text search pattern from vendors/orders modules using `escapeRegex` |
| TD-8 | Date ranges computed server-side | Matches CC-DATE test cases; uses `range` enum to compute `from`/`to` server-side to avoid client/server clock drift |

---

## Frontend Impact

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/features/expenses/schema.ts` | Zod schemas: `createExpenseSchema`, `updateExpenseSchema` |
| `frontend/src/features/expenses/api.ts` | React Query hooks: `useExpensesList`, `useExpense`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense` |
| `frontend/src/features/expenses/components/ExpenseForm.tsx` | Create/edit modal form (8 fields) with vendor auto-fill |
| `frontend/src/features/expenses/components/ExpenseList.tsx` | DataTable with date range, category, vendor, payment-method filters |
| `frontend/src/features/expenses/components/ExpenseDetail.tsx` | Detail card with edit/delete actions |
| `frontend/src/app/(dashboard)/expenses/page.tsx` | List page with PermissionGate |
| `frontend/src/app/(dashboard)/expenses/[expenseId]/page.tsx` | Detail page with PermissionGate |

### Reused Components

| Component | Usage |
|-----------|-------|
| `DataTable` | Expense list table with mobile card fallback |
| `PermissionGate` | Page-level access control |
| `DateRangeFilter` | Date range quick-select (Today/Week/Month/Custom) |
| `useDateRangeFilter` | Hook for date range filter state + query string generation |

### Theme Tokens Used

All values from `theme.md` — no new tokens:

| Element | Token |
|---------|-------|
| Page background | `slate-50` (`--background`) |
| Card wrappers | `bg-white rounded-2xl border border-slate-200 shadow-sm` |
| Amount display | `font-bold text-2xl sm:text-3xl text-slate-800` (large), `text-slate-700` (tables) |
| Category badge | `rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700` |
| Payment method label | `text-xs font-medium` with method-specific styling (text only, no badge — not in §12 mapping) |
| Delete (hard) button | `variant="destructive"` + `shadow-red-500/25` |
| Edit button | `variant="primary"` |
| Empty state | `text-slate-400 text-center px-4 py-12` |
| Mobile card | Stacked label/value per `theme.md` §13 DataTable mobile ≤480px |
| Amount format | Locale-aware currency (`$X,XXX.XX`), right-aligned in tables |

### Form Field Validation (Zod)

**`createExpenseSchema`:**
- `amount`: `z.coerce.number().positive('Amount must be positive')`
- `date`: `z.coerce.date({ required_error: 'Date is required' })`
- `description`: `z.string().min(1, 'Description is required').max(500)`
- `category`: `z.string().min(1, 'Category is required').max(100)` — free text
- `vendorId`: `z.string().optional()` — must be ObjectId if provided
- `paidBy`: `z.string().min(1, 'Paid by is required')`
- `paidTo`: `z.string().min(1, 'Paid to is required').max(200)`
- `paymentMethod`: `z.enum(['cash', 'card', 'bkash', 'nagad'])`

**`updateExpenseSchema`:** Same fields, all optional.

### List Filter UI

| Filter | Type | Source |
|--------|------|--------|
| Date range | `DateRangeFilter` component | Shared component |
| Category | Text input (debounced) | Free-text, regex match on server |
| Vendor | Select dropdown | `useVendorsList` with `isActive: false` (include deactivated) |
| Payment method | Select/enum dropdown | Cash, Card, bKash, Nagad |
| Paid by | Select dropdown | Users list (admins + managers + employees) |

---

## Backend Impact

### New Files

| File | Purpose |
|------|---------|
| `backend/src/models/Expense.ts` | Mongoose model with all fields per §3.12 |
| `backend/src/modules/expenses/expenses.validation.ts` | Zod schemas for create, update, list query, param |
| `backend/src/modules/expenses/expenses.service.ts` | CRUD with date-range computation, population, hard delete |
| `backend/src/modules/expenses/expenses.controller.ts` | 5 Express handlers following the vendors pattern |
| `backend/src/modules/expenses/expenses.routes.ts` | 5 routes with middleware chain |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/app.ts` | Import `expensesRoutes`, add mutation rate limiter, mount routes after vendors |

### Service Layer Details

**`computeDateRange(filter)` — private helper:**
```ts
function computeDateRange(range: string, from?: string, to?: string): { $gte?: Date; $lte?: Date } {
  const now = new Date();
  switch (range) {
    case 'today':     return { $gte: startOfDay(now), $lte: endOfDay(now) };
    case 'week':      return { $gte: startOfWeek(now), $lte: endOfDay(now) };
    case 'month':     return { $gte: startOfMonth(now), $lte: endOfDay(now) };
    case 'custom':    return { $gte: new Date(from!), $lte: new Date(to!) };
    default:          return {};
  }
}
```

**`listExpenses(query)`:**
1. Build filter object from query params
2. Compute date filter if `range` or `from`/`to` present
3. Category filter: case-insensitive regex via `escapeRegex`
4. `vendorId`/`paidBy`: convert to ObjectId
5. Sort: `{ date: -1, createdAt: -1 }`
6. `.lean()` + `.populate('vendorId', 'name').populate('paidBy', 'name email').populate('createdBy', 'name')`
7. Paginate via `.skip().limit()` + `countDocuments`
8. Return `{ data, meta }`

**`getExpenseById(id)`:**
- Same population as list
- `404 NOT_FOUND` if missing

**`createExpense(dto, userId)`:**
- Validate `vendorId` exists if provided (allow deactivated — EXP-E-01)
- Validate `paidBy` user exists (`404 NOT_FOUND` if not)
- `Expense.create({ ...dto, createdBy: userId })`
- Return `{ data }` with `201`

**`updateExpense(id, dto)`:**
- Same reference validations as create (if fields provided)
- `findByIdAndUpdate` with `{ new: true, runValidators: true }`
- `404 NOT_FOUND` if missing

**`deleteExpense(id)`:**
- `findByIdAndDelete(id)` — hard delete
- `404 NOT_FOUND` if missing
- Return `{ data: { success: true } }`

### Controller Handlers

| Handler | Status | Response Shape |
|---------|--------|----------------|
| `handleListExpenses` | 200 | `{ data, meta }` |
| `handleGetExpense` | 200 | `{ data }` |
| `handleCreateExpense` | 201 | `{ data }` |
| `handleUpdateExpense` | 200 | `{ data }` |
| `handleDeleteExpense` | 200 | `{ data: { success: true } }` |

### Routes

```
GET    /expenses                    -> authenticate, authorize('expenses','view'), validate(listExpensesQuerySchema,'query')
GET    /expenses/:id                -> authenticate, authorize('expenses','view'), validate(objectIdParam,'params')
POST   /expenses                    -> authenticate, authorize('expenses','create'), validate(createExpenseSchema)
PUT    /expenses/:id                -> authenticate, authorize('expenses','edit'), validate(updateExpenseSchema)
DELETE /expenses/:id                -> authenticate, authorize('expenses','delete'), validate(objectIdParam,'params')
```

### Rate Limiter Registration (in `app.ts`)
```ts
const expensesMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/expenses', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return expensesMutationLimiter(req, res, next);
  }
  next();
});
```

---

## Database Impact

### New Collection: `Expense`

**Collection name:** `expenses`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `amount` | Number | ✓ | Positive, 2 decimal places |
| `date` | Date | ✓ | |
| `description` | String | ✓ | max 500 chars, trimmed |
| `category` | String | ✓ | free text, max 100 chars, trimmed |
| `vendorId` | ObjectId → Vendor | — | optional, ref to Vendor |
| `paidBy` | ObjectId → User | ✓ | staff who actually paid |
| `paidTo` | String | ✓ | recipient name, max 200 chars, trimmed |
| `paymentMethod` | String enum | ✓ | `cash \| card \| bkash \| nagad` |
| `createdBy` | ObjectId → User | ✓ | server-set from req.user.id |

**Indexes:**
- `date` (for date-range filters)
- `category` (for category filter)
- `vendorId` (for vendor filter)
- `paidBy` (for staff filter)

**Soft/hard:** Hard-deletable — no `isActive` field. Falls outside the five soft-delete collections.

---

## API Impact

### New Endpoints (5)

| Method | Path | Action | Request Body / Query |
|--------|------|--------|---------------------|
| GET | `/expenses` | `view` | `?range=&from=&to=&category=&vendorId=&paymentMethod=&paidBy=&page=&limit=` |
| GET | `/expenses/:id` | `view` | — |
| POST | `/expenses` | `create` | `{ amount, date, description, category, vendorId?, paidBy, paidTo, paymentMethod }` |
| PUT | `/expenses/:id` | `edit` | `{ amount?, date?, description?, category?, vendorId?, paidBy?, paidTo?, paymentMethod? }` |
| DELETE | `/expenses/:id` | `delete` | — |

### Request/Response Contracts

**`POST /expenses` request:**
```json
{
  "amount": 4500,
  "date": "2026-06-19",
  "description": "Weekly vegetable supply",
  "category": "Ingredients",
  "vendorId": "...",
  "paidBy": "...",
  "paidTo": "Fresh Farms Co.",
  "paymentMethod": "cash"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "...",
    "amount": 4500,
    "date": "2026-06-19T00:00:00.000Z",
    "description": "Weekly vegetable supply",
    "category": "Ingredients",
    "vendorId": { "_id": "...", "name": "Fresh Farms" },
    "paidBy": { "_id": "...", "name": "Karim", "email": "karim@restaurant.com" },
    "paidTo": "Fresh Farms Co.",
    "paymentMethod": "cash",
    "createdBy": { "_id": "...", "name": "Admin" },
    "createdAt": "2026-06-19T10:30:00.000Z",
    "updatedAt": "2026-06-19T10:30:00.000Z"
  }
}
```

**`GET /expenses` response:**
```json
{
  "data": [ /* array of expense objects, same shape as detail */ ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

---

## Authentication & Authorization

| Aspect | Implementation |
|--------|---------------|
| Module key | `expenses` |
| Available actions | `view`, `create`, `edit`, `delete` |
| Frontend gate | `<PermissionGate module="expenses" action="view\|create\|edit\|delete">` |
| Backend gate | `authorize('expenses', '<action>')` on every route |
| Admin bypass | Yes — `admin` role bypasses all permission checks per `ARCHITECTURE.md` §6 |

---

## Security Requirements

- `createdBy` is never accepted from the client — always set server-side from `req.user.id`
- All inputs validated server-side via Zod schemas before reaching controller
- Rate limiting on mutating endpoints (POST/PUT/DELETE) via shared `makeRateLimiter`
- `paidBy` user reference is validated (must be a real User) — prevents linking expenses to nonexistent staff
- `vendorId` reference is validated (must be real Vendor, even if deactivated) — prevents data integrity issues
- No sensitive data exposure — expense amounts are financial data but not PII, no special handling required beyond standard auth

---

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-1 | `vendorId` references a soft-deleted vendor (EXP-E-01) | Creation succeeds — historical reference preserved regardless of vendor's active state |
| EC-2 | `paidBy` references a deactivated user | Creation succeeds — deactivated staff can still be the payer of historical expenses |
| EC-3 | `amount` is 0 or negative (EXP-V-01) | `400 VALIDATION_ERROR` — `amount` must be positive |
| EC-4 | `paymentMethod: 'split'` (EXP-V-03) | `400 VALIDATION_ERROR` — `split` is not in the Expense payment-method enum |
| EC-5 | Missing `paidBy` or `paidTo` (EXP-V-02) | `400 VALIDATION_ERROR` — both are required |
| EC-6 | Date range `custom` without `from`/`to` | `400 VALIDATION_ERROR` — Zod refine requires both when `range === 'custom'` |
| EC-7 | `range` absent, no `from`/`to` | Return all expenses (no date filter applied) |
| EC-8 | Update with empty body or no changed fields | `400 VALIDATION_ERROR` — at least one field must be provided (Zod check) |
| EC-9 | Delete nonexistent expense | `404 NOT_FOUND` |
| EC-10 | Create expense with very long description (>500 chars) | `400 VALIDATION_ERROR` — Zod max length |
| EC-11 | List with invalid ObjectId in `vendorId`/`paidBy` query param | `400 VALIDATION_ERROR` — Zod regex check on ObjectId pattern |
| EC-12 | `amount` with more than 2 decimal places | Stored as-is but Zod does NOT enforce `.multipleOf(0.01)` per DATABASE.md §1 convention. **Flag:** should add this if the rest of the codebase enforces it on money fields. Check `Order` service for prior art. |

**Regarding EC-12:** The DATABASE.md §1 says "monetary math is rounded to 2 decimal places at the application layer (Zod `.multipleOf(0.01)')." Check whether existing modules enforce this on `Order.subtotal`/`OrderItem.lineTotal`; if yes, apply the same to `Expense.amount`.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| First hard-delete module — no pattern to follow | Medium | Follow simple `findByIdAndDelete` pattern; no downstream refs to orphan |
| WebSocket infra doesn't exist for dashboard invalidation | Low | Frontend-only `queryClient.invalidateQueries(['dashboard'])` handles the single-terminal case; backend TODO comment notes where WebSocket emit goes when infra is built |
| `paidTo` auto-fill from vendor may surprise users if vendor name is long | Low | User can manually override the auto-filled value; matches documented behavior |
| Free-text category filtering may be slow on large datasets | Low | `category` has an index; regex search is capped at 100 chars |

---

## Implementation Order

### Phase 1: Resolve Open Item
1. Update `DATABASE.md` §8.3 to close the free-text resolution

### Phase 2: Backend
2. Create `backend/src/models/Expense.ts` — Mongoose model
3. Create `backend/src/modules/expenses/expenses.validation.ts` — Zod schemas
4. Create `backend/src/modules/expenses/expenses.service.ts` — CRUD + date computation
5. Create `backend/src/modules/expenses/expenses.controller.ts` — 5 handlers
6. Create `backend/src/modules/expenses/expenses.routes.ts` — 5 middleware chains
7. Modify `backend/src/app.ts` — register routes + rate limiter
8. Verify `tsc --noEmit` on backend

### Phase 3: Frontend
9. Create `frontend/src/features/expenses/schema.ts`
10. Create `frontend/src/features/expenses/api.ts`
11. Create `frontend/src/features/expenses/components/ExpenseForm.tsx`
12. Create `frontend/src/features/expenses/components/ExpenseList.tsx`
13. Create `frontend/src/features/expenses/components/ExpenseDetail.tsx`
14. Create `frontend/src/app/(dashboard)/expenses/page.tsx`
15. Create `frontend/src/app/(dashboard)/expenses/[expenseId]/page.tsx`
16. Verify `tsc --noEmit` on frontend

### Phase 4: Verification
17. Run test cases from `TEST_CASES.md` §10 (EXP-H-01 through EXP-AUTH-01)
18. Verify full CRUD flow end to end

---

## Task Breakdown

### Task 1: Update DATABASE.md §8.3
**Description:** Close the `Expense.category` open item — confirmed free text.
**Acceptance Criteria:** Open item §8.3 is struck through with "RESOLVED: free text" annotation, matching the decision.

### Task 2: Create Expense Model
**Description:** Create Mongoose model at `backend/src/models/Expense.ts`
**Acceptance Criteria:**
- All fields per DATABASE.md §3.12
- `paymentMethod` enum: `cash | card | bkash | nagad`
- `vendorId` is optional `ObjectId` ref to Vendor
- `paidBy` and `createdBy` are required `ObjectId` refs to User
- Indexes on `date`, `category`, `vendorId`, `paidBy`
- Timestamps enabled, `versionKey: false`
- No `isActive` field (hard-deletable)

### Task 3: Create Validation Schemas
**Description:** Create `expenses.validation.ts` with Zod schemas for create, update, list query, and param.
**Acceptance Criteria:**
- `createExpenseSchema`: all required fields + `vendorId` optional, strict mode, no `createdBy`
- `updateExpenseSchema`: same fields, all optional, strict mode
- `listExpensesQuerySchema`: `range`, `from`, `to`, `category`, `vendorId`, `paymentMethod`, `paidBy`, `page`, `limit` — refine for custom range requiring from/to
- `objectIdParam`: standard Mongo ObjectId validation
- All schemas use `.strict()` to reject unknown fields
- `range` enum: `'today' | 'week' | 'month' | 'custom'`

### Task 4: Create Service Layer
**Description:** Create `expenses.service.ts` with date-range computation, CRUD, population, reference validation.
**Acceptance Criteria:**
- `computeDateRange` helper exists for all 4 range modes
- `listExpenses`: builds filter, applies date range, sorts by `{ date: -1, createdAt: -1 }`, populates references, paginates
- `getExpenseById`: single fetch with population, `404` if missing
- `createExpense`: validates vendorId exists (even if deactivated), validates paidBy user exists, sets createdBy from userId param
- `updateExpense`: validates references only if fields provided
- `deleteExpense`: `findByIdAndDelete`, `404` if missing
- `.lean()` used on all reads
- `escapeRegex` imported and used for category free-text search

### Task 5: Create Controller
**Description:** Create `expenses.controller.ts` with 5 named handler functions.
**Acceptance Criteria:**
- Named exports following vendors pattern
- `handleListExpenses` → `res.status(200).json(result)`
- `handleGetExpense` → `res.status(200).json({ data })`
- `handleCreateExpense` → `res.status(201).json({ data })`, passes `req.user.id`
- `handleUpdateExpense` → `res.status(200).json({ data })`
- `handleDeleteExpense` → `res.status(200).json({ data: { success: true } })`
- All wrapped in `try/catch/next`

### Task 6: Create Routes
**Description:** Create `expenses.routes.ts` with 5 routes and middleware chain.
**Acceptance Criteria:**
- All routes use `authenticate` + `authorize('expenses', '<action>')` + appropriate `validate` call
- Route paths match API.md §14 exactly
- Exported as default router

### Task 7: Register in App
**Description:** Modify `backend/src/app.ts` to import and mount expenses routes.
**Acceptance Criteria:**
- Import statement added after vendors
- Mutation rate limiter registered before mount
- Route mounted after `vendorsRoutes`, before `posRoutes`
- `tsc --noEmit` passes

### Task 8: Frontend Schema
**Description:** Create `frontend/src/features/expenses/schema.ts`
**Acceptance Criteria:**
- `createExpenseSchema` matches backend validation shape
- `updateExpenseSchema` with all fields optional
- Types exported for form data

### Task 9: Frontend API Hooks
**Description:** Create `frontend/src/features/expenses/api.ts`
**Acceptance Criteria:**
- `ExpenseResponse` interface matches backend response shape
- `useExpensesList(params)` — `useQuery`, key `['expenses', 'list', qs]`
- `useExpense(id)` — `useQuery`, key `['expenses', 'detail', id]`
- `useCreateExpense()` — `useMutation`, invalidates `['expenses']` AND `['dashboard']`
- `useUpdateExpense()` — `useMutation`, invalidates `['expenses']` AND `['dashboard']`
- `useDeleteExpense()` — `useMutation`, invalidates `['expenses']` AND `['dashboard']`

### Task 10: ExpenseForm Component
**Description:** Create `ExpenseForm.tsx` — modal form for create and edit.
**Acceptance Criteria:**
- Props: `open: boolean`, `expense?: ExpenseResponse`, `onClose: () => void`
- Fields: `amount` (number, step=0.01), `date` (date input), `description` (textarea), `category` (text input), `vendorId` (select from vendors including deactivated), `paidBy` (select from users), `paidTo` (text input), `paymentMethod` (select enum)
- `paidTo` auto-fills from vendor name when `vendorId` changes (user can override)
- Uses `useCreateExpense` or `useUpdateExpense` based on mode
- Zod validation with inline errors
- In edit mode, pre-populates all fields
- Success → closes modal, shows toast, invalidates queries
- Form wrapped in shadcn `Dialog` with `rounded-2xl`, `.modal-enter` animation
- Follows theme.md §13 Dialog and Input/Select specs

### Task 11: ExpenseList Component
**Description:** Create `ExpenseList.tsx` — DataTable with filters.
**Acceptance Criteria:**
- Uses `useExpensesList(params)` with current filter state
- Columns: `date` (formatted short), `description` (truncated 60 chars + tooltip), `category` (badge), `paidTo`, `vendor` (link if vendorId), `amount` (right-aligned currency), `paymentMethod` (label), `paidBy` (staff name), actions (view/edit/delete)
- Category badge: `rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700`
- Amount formatting: locale-aware currency, `font-semibold`
- Date range filter bar using `<DateRangeFilter>` + `useDateRangeFilter` hook
- Category filter: text input (debounced 300ms)
- Vendor filter: select from vendors list
- Payment method filter: select enum
- Paid by filter: select from users
- Pagination via DataTable
- Loading/empty/error states
- Mobile: card layout per `theme.md` §13 DataTable mobile spec
- Action buttons permission-gated via `<PermissionGate>`

### Task 12: ExpenseDetail Component
**Description:** Create `ExpenseDetail.tsx` — structured detail card.
**Acceptance Criteria:**
- Fetches via `useExpense(id)`
- Header: amount (large, formatted), date, category badge
- Description section: full text
- Payment section: paidTo, vendor link (if present), paymentMethod, paidBy
- Metadata: createdAt, updatedAt, createdBy
- Edit button (`PermissionGate expenses:edit`) opens ExpenseForm in edit mode
- Delete button (`PermissionGate expenses:delete`) opens ConfirmDialog
- ConfirmDialog: title "Delete Expense", body `"Are you sure you want to permanently delete this expense of {amount} from {date}? This action cannot be undone."`, confirm "Delete" (destructive style)
- Loading skeleton; error/not-found states
- Back navigation to list

### Task 13: Expenses List Page
**Description:** Create `frontend/src/app/(dashboard)/expenses/page.tsx`
**Acceptance Criteria:**
- `'use client'`
- `<PermissionGate module="expenses" action="view">` wraps page
- Title: "Expenses" with subtitle "Track your business expenses"
- "Add Expense" button (`PermissionGate expenses:create`) → opens ExpenseForm modal
- Filter section + ExpenseList composition
- Create success → close modal, invalidate queries, show toast

### Task 14: Expenses Detail Page
**Description:** Create `frontend/src/app/(dashboard)/expenses/[expenseId]/page.tsx`
**Acceptance Criteria:**
- `'use client'`
- Dynamic route: `[expenseId]` param
- Renders `<ExpenseDetail />`
- Back navigation to list
- Breadcrumb: Expenses > [date + description]
- Edit button opens ExpenseForm in edit mode

### Task 15: Verify Both Apps Compile
**Description:** Run `tsc --noEmit` on both apps.
**Acceptance Criteria:** Zero type errors on both backend and frontend.

---

## Final Approved Decisions

| # | Decision | Value | Source |
|---|----------|-------|--------|
| 1 | `Expense.category` is free text, not enum | Free text (resolved) | User confirmation during planning |
| 2 | Hard delete for Expenses | `findByIdAndDelete` | Per DATABASE.md §1 — Expense has no `isActive` field |
| 3 | `createdBy` set server-side only | Never from request body | Prevents privilege escalation |
| 4 | Populate refs on all reads | `vendorId.name`, `paidBy.name+email`, `createdBy.name` | Avoid N+1 queries |
| 5 | Dashboard invalidation | Frontend React Query only (no WebSocket) | Infra doesn't exist yet |
| 6 | `paidTo` auto-fill from vendor | Auto-fill with manual override | Matches DATABASE.md "mirrors vendor name" |
| 7 | Category filter | Case-insensitive regex via `escapeRegex` | Matches vendors search pattern |
| 8 | Date range computed server-side | `range` enum maps to `$gte`/`$lte` | Per CC-DATE test cases |
