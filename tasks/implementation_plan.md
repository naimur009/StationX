# Implementation Plan — Orders Module

> **Generated:** 2026-06-26
> **Based on:** `tasks/current_task.md` (Task 11), `docs/PRD.md` (§5), `docs/API.md` (§10, §22, §24, §25), `docs/database.md` (§3.8, §5), `docs/architecture.md` (§4, §5, §7, §8, §13), `docs/AI_rules.md` (§2–§13), `docs/theme.md` (§12, §13)
> **Backlog position:** Task 11 (depends on Task 10 — POS)

---

## Feature Overview

| Field | Value |
|---|---|
| **Feature name** | Orders Management |
| **PRD Feature** | #5 — Orders |
| **Business goal** | Provide a complete order management interface allowing staff to view, filter, search, edit (restricted fields), transition status, view/print/download bills, and delete (narrowly restricted) orders created through the POS module |
| **User value** | Staff can review past orders, correct mistakes (customer attachment, table/type changes), cancel orders with reason, print bills on demand, and audit order history — all essential for daily restaurant operations |

## Approved Scope

| Item | Status |
|---|---|
| Order list with status/date/customer/staff filters + search by order number | ✅ Included |
| Order detail view with populated customer and staff names | ✅ Included |
| Restricted edit (tableNumber, orderType, customerId only) | ✅ Included |
| Status transitions (pending→completed, pending→cancelled, completed→cancelled) | ✅ Included |
| Cancel reason required for cancellation | ✅ Included |
| Bill view/print/download (HTML + PDF via Puppeteer) | ✅ Included |
| Narrow hard-delete (same-day, pending, no coupon usage) | ✅ Included |
| Socket.io `order:statusChanged` event | ✅ Included |
| Mobile-responsive list (card layout on narrow screens) | ✅ Included |
| Order creation | ❌ Handled by POS (Task 10) — not duplicated |
| Order items/subtotal/discount/tax editing post-creation | ❌ Never editable — snapshot integrity rule |
| Hard-delete of completed/settled orders | ❌ Blocked — returns `409 ORDER_NOT_DELETABLE` |
| Bulk order operations | ❌ Not in PRD |
| Kitchen Display System (KDS) integration | ❌ Future scope per `architecture.md` §13 |

## Out of Scope (Explicitly Deferred)

- Item-level void/refund (`PATCH /orders/:id/items/:itemId/void`) — reserved extension point per `API.md` §9.5
- Order hold/park/resume (`POST /pos/holds`) — reserved per `API.md` §9.5
- Order splitting across multiple payments/customers — reserved per `API.md` §9.5
- Scheduled/automated report generation — deferred to `architecture.md` §13
- Multi-tenant order scope — out of scope for v1

## Technical Decisions

### Decision 1: Order hard-delete strategy (resolves `API.md` §25.1 / `AI_rules.md` §13.1)

**Decision:** Keep narrow hard-delete rules (Option A). No `isActive` field added to `Order` model.

**Reasoning:** The current rules (same-day, `pending`, no coupon usage) make successful hard deletes rare — they only affect mistaken/duplicate draft orders. A completed order should never be hard-deleted because it would corrupt historical Reports/Income. If hard-delete of settled orders becomes a real requirement post-v1, `isActive`/`deletedAt` can be added then with proper history-preservation semantics. Adding it now would require every list query to carry `{ isActive: { $ne: false } }` forever, even though no `isActive: false` orders will exist for months.

### Decision 2: `completed → cancelled` permission gating (resolves `API.md` §25.3 / `AI_rules.md` §13.3)

**Decision:** Gate by `orders:edit` only — no new permission action.

**Reasoning:** The `cancelReason` field already provides an audit trail for `completed → cancelled` transitions. Adding a new permission action (`approve`/`cancel`) would require a schema migration and per-user retraining for a case that's rare in a restaurant context (cancelling a completed order is effectively a void/refund). If a stricter gate is wanted later, it's a non-breaking addition — `PATCH /orders/:id/status` keeps working, just gains an additional permission check.

### Decision 3: Bill template approach

**Decision:** Server-side HTML string with inline styles, no template engine. Puppeteer renders the same HTML to PDF.

**Reasoning:** The bill is a simple receipt (<50 lines), not a complex document. String interpolation avoids adding a template engine dependency (EJS, Handlebars, etc.) for a single template. The HTML template is built in `orders.service.ts` as a `renderBillHtml()` function. The `backend/src/lib/pdf.ts` stub is made real with a Puppeteer wrapper. The template layout matches the POS `BillPreview` component's visual hierarchy closely so the on-screen and printed bills look consistent.

### Decision 4: Status transition state machine approach

**Decision:** Service-layer validation before each write, using `Order.findByIdAndUpdate` with `$set` — no `withTransaction` needed.

**Reasoning:** Status transitions are single-document writes with no multi-collection atomicity requirement (unlike POS order creation). The transition rules are simple enough to validate in the service with `if/else` checks before the DB write. `findByIdAndUpdate` is atomic at the document level, so two concurrent `PATCH` requests can't produce a corrupt state — one of them will win and the other's pre-write validation (checking current status against valid transitions) will fail because the status changed between read and write. This is acceptable: the second request gets a `400 VALIDATION_ERROR` with "Cannot transition from <new_status>" which is accurate and informative.

### Decision 5: Formatted order number pattern

**Decision:** Reuse the same `ORD-YYYY-XXXXXX` format from POS (`backend/src/lib/counter.ts`). No changes needed.

**Reasoning:** The order number format is already established by POS. The Orders module reads existing orders; it never generates order numbers (that's POS's job).

## Frontend Impact

### New Pages (2)

| Route | File | Purpose |
|---|---|---|
| `/orders` | `frontend/src/app/(dashboard)/orders/page.tsx` | Order list with filters |
| `/orders/[orderId]` | `frontend/src/app/(dashboard)/orders/[orderId]/page.tsx` | Order detail view |

### New Components (9)

| Component | File | Purpose |
|---|---|---|
| `OrderFilters` | `features/orders/components/OrderFilters.tsx` | Inline filter bar (status, date range, search) |
| `OrderList` | `features/orders/components/OrderList.tsx` | DataTable with columns, mobileRender cards |
| `OrderDetail` | `features/orders/components/OrderDetail.tsx` | Full order display with all sections |
| `OrderStatusActions` | `features/orders/components/OrderStatusActions.tsx` | Status transition buttons, permission-gated |
| `OrderCancelDialog` | `features/orders/components/OrderCancelDialog.tsx` | Modal for cancel reason input |
| `OrderEditForm` | `features/orders/components/OrderEditForm.tsx` | Restricted edit form (table/type/customer) |
| `BillView` | `features/orders/components/BillView.tsx` | Bill preview, print, download |
| `schema.ts` | `features/orders/schema.ts` | Zod schemas for filters, edit, status forms |
| `api.ts` | `features/orders/api.ts` | React Query hooks for all 6 endpoints |

### API Hooks Required

| Hook | Method | Query key |
|---|---|---|
| `useOrderList(params)` | `GET /orders` | `['orders', 'list', qs]` |
| `useOrder(id)` | `GET /orders/:id` | `['orders', 'detail', id]` |
| `useUpdateOrder()` | `PUT /orders/:id` | Invalidates `['orders']` |
| `useUpdateOrderStatus()` | `PATCH /orders/:id/status` | Invalidates `['orders']` |
| `useDeleteOrder()` | `DELETE /orders/:id` | Invalidates `['orders']` |
| `useOrderBill(id, format?)` | `GET /orders/:id/bill` | `['orders', 'bill', id, format]` |

### State Management
- **React Query** for all server state (list, detail, bill)
- **React `useState`** for component-local form state (filters, dialog open/close)
- **No Zustand** needed — Orders is a read/edit module with no long-lived client state

### Theme Token Mapping

Every design decision maps to `theme.md`:

| Element | Theme reference | Value |
|---|---|---|
| Page background | `slate-50` (`--background`) | `bg-slate-50` |
| Card container | `rounded-2xl` border `slate-200` shadow-sm | Card component |
| DataTable wrapper | `rounded-xl` border `slate-200` | `DataTable` pattern |
| Status badge `pending` | `theme.md` §12 → yellow | `yellow-100` bg, `yellow-700` text |
| Status badge `completed` | `theme.md` §12 → green | `green-100` bg, `green-700` text |
| Status badge `cancelled` | `theme.md` §12 → red | `red-100` bg, `red-700` text |
| Table header | `bg-slate-50` text `slate-500` | `DataTable` pattern |
| Table row hover | `hover:bg-slate-100` | `table-row-hover` utility |
| Buttons | `rounded-xl` with tinted shadow | Button variants |
| Dialog (cancel reason) | `rounded-2xl shadow-2xl` modal-enter animation | Dialog component |
| Money formatting | `font-bold` Inter | `৳540.00` format (from POS convention) |
| Loading skeleton | `animate-pulse bg-slate-200 rounded` | `DataTable` loading state |
| Empty state | `text-slate-400` centered | `DataTable` empty state |
| Mobile list | `<md` → card layout | `DataTable.mobileRender` |
| Active voice copy | `theme.md` §19 | "Cancel order", "Mark completed" |

## Backend Impact

### New Files (4)

| File | Purpose |
|---|---|
| `backend/src/modules/orders/orders.validation.ts` | Zod schemas for all 6 endpoints |
| `backend/src/modules/orders/orders.service.ts` | Business logic: list, detail, update, status transition, bill, delete |
| `backend/src/modules/orders/orders.controller.ts` | Request/response handlers |
| `backend/src/modules/orders/orders.routes.ts` | Route → middleware → controller wiring |

### Modified Files (1)

| File | Change |
|---|---|
| `backend/src/app.ts` | Import + register orders routes + mutation rate limiter |

### Existing Code Made Real (1)

| File | Change |
|---|---|
| `backend/src/lib/pdf.ts` | Replace stub with real Puppeteer `renderPdf(html)` function |

### Service Layer — `orders.service.ts`

**`listOrders(filters)`**
- Build MongoDB filter from validated query params
- `search` → `orderNumber` regex (case-insensitive substring)
- Sort by validated `sort` param (default `-createdAt`, only `createdAt`/`-createdAt` allowed)
- Paginate with `.skip().limit()` + `countDocuments`
- `.lean()` — no populate on list, return lean summary fields
- Return `{ data: orders, meta: { total, page, limit } }`

**`getOrderById(id)`**
- `Order.findById(id).populate('customerId', 'name phone').populate('createdBy', 'name').lean()`
- `404 NOT_FOUND` if missing
- Return full detail with items array

**`updateOrder(id, dto)`**
- `Order.findByIdAndUpdate(id, { $set: sanitizedFields }, { new: true, runValidators: true })`
- Only `tableNumber`, `orderType`, `customerId` in `$set`
- `404 NOT_FOUND` if missing
- Return updated order

**`updateOrderStatus(id, status, cancelReason?)`**
- Pre-write transition validation:
  - Fetch current order → `404 NOT_FOUND`
  - Validate transition rules against current `status`:
    - `pending → completed`: allowed, set `completedAt`, clear `cancelledAt`/`cancelReason`
    - `pending → cancelled`: allowed, requires `cancelReason`, set `cancelledAt`, clear `completedAt`
    - `completed → cancelled`: allowed, requires `cancelReason`, set `cancelledAt`
    - `cancelled → *`: rejected — terminal state
    - `completed → pending`: rejected — not in valid set
    - Same-status: no-op, return current doc unchanged
- `findByIdAndUpdate(id, { $set: fields }, { new: true })`
- On success: emit `order:statusChanged` via Socket.io
- Return updated order

**`deleteOrder(id)`**
- Fetch order → `404 NOT_FOUND` if missing
- Check preconditions:
  - `status !== 'pending'` → `409 ORDER_NOT_DELETABLE`
  - Not same day (server date) → `409 ORDER_NOT_DELETABLE`
  - Has `couponId` → `409 ORDER_NOT_DELETABLE`
- `Order.findByIdAndDelete(id)` + `ActivityLog.deleteMany({ targetId: id })`
- Return `{ data: { success: true } }`

**`getOrderBill(id, format)`**
- Fetch order with populated `customerId`, `createdBy`
- `404 NOT_FOUND` if missing
- Call `renderBillHtml(order)` to generate HTML
- If `format === 'pdf'`: call `renderPdf(html)` from `lib/pdf.ts`, return buffer with `application/pdf`
- If `format === 'html'`: return `{ data: { html } }`

**`renderBillHtml(order)`** (private function)
- Server-side HTML string with inline `<style>` block
- Layout: restaurant name header, order meta (number, date, type, table), item table (name, qty, price, total), totals section, payment method, customer name, thank-you footer
- Use `escapeHtml()` helper to prevent XSS from product names
- Use `formatBdt()` helper for money display (`৳XXX.XX`)
- Monospace font (`'Courier New'`) — receipt printer aesthetic
- No external CSS/assets — all inline, Puppeteer compatible

### Controller — `orders.controller.ts`

Named exports: `listOrders`, `getOrderById`, `updateOrder`, `updateOrderStatus`, `getOrderBill`, `deleteOrder`.
Same pattern as every module: extract from `req`, call service, `res.status().json({ data: result })`.
`getOrderBill` for PDF: `res.setHeader('Content-Type', 'application/pdf')`, `res.send(pdfBuffer)`.

### Routes — `orders.routes.ts`

```
GET    /orders                    -> authenticate, authorize('orders','view'), validate(listOrdersQuerySchema,'query'), listOrders
GET    /orders/:id                -> authenticate, authorize('orders','view'), validate(orderIdParamSchema,'params'), getOrderById
PUT    /orders/:id                -> authenticate, authorize('orders','edit'), validate(orderIdParamSchema,'params'), validate(updateOrderSchema), updateOrder
PATCH  /orders/:id/status         -> authenticate, authorize('orders','edit'), validate(orderIdParamSchema,'params'), validate(updateOrderStatusSchema), updateOrderStatus
GET    /orders/:id/bill           -> authenticate, authorize('orders','view'), validate(orderIdParamSchema,'params'), validate(billQuerySchema,'query'), getOrderBill
DELETE /orders/:id                -> authenticate, authorize('orders','delete'), validate(orderIdParamSchema,'params'), deleteOrder
```

### Module Registration — `backend/src/app.ts`

```typescript
import ordersRoutes from './modules/orders/orders.routes';

// After posRoutes, before errorHandler:
const ordersMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/orders', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return ordersMutationLimiter(req, res, next);
  }
  next();
});
app.use('/api/v1', ordersRoutes);
```

Note: `POST` in mutation list for coverage — Order creation is POS's job, but if a POST hits `/orders` it gets rate-limited like any mutation.

### Activity Logger

No changes needed. The `activityLogger.ts` already has:
- `TARGET_TYPE_MAP.orders: 'Order'` at line 65
- `STATE_TRANSITION_RULES` entry for `order.status_changed` at line 21

The global middleware will automatically log:
- `orders.updated` for `PUT /orders/:id`
- `order.status_changed` for `PATCH /orders/:id/status`
- `orders.deleted` for `DELETE /orders/:id`

### Socket.io Events

| Event | Trigger | Payload | Already registered? |
|---|---|---|---|
| `order:statusChanged` | `PATCH /orders/:id/status` succeeds | `{ orderId, status, orderNumber }` | Yes — `API.md` §22 |

Emitted from `orders.service.ts` after a successful status transition. No `dashboard:metricsInvalidate` emit here — that's owned by Dashboard (Task 12) which will listen to `order:statusChanged`.

## Database Impact

| Collection | Change |
|---|---|
| `Order` | **No changes** — model already exists from Task 10 (POS) |
| `Counter` | **No changes** — already exists from Task 10 |
| `ActivityLog` | **No changes** — already exists from Task 1 |
| All indexes | Already exist — `orderNumber` (unique), `{status, createdAt}`, `customerId`, `createdBy`, `items.productId` |

**Order model** (already built, no modifications):
- All fields per `database.md` §3.8
- `orderNumber` auto-generated via `Counter` helper
- Embedded `OrderItem` with snapshot pricing
- `status` enum with `pending`, `completed`, `cancelled`
- All indexes already created

## API Impact

### New Endpoints (6)

| Method | Path | Action | Request validation | Response |
|---|---|---|---|---|
| `GET` | `/orders` | `view` | `listOrdersQuerySchema` (query) | `{ data: [...], meta: { total, page, limit } }` |
| `GET` | `/orders/:id` | `view` | `orderIdParamSchema` (params) | `{ data: OrderDetail }` |
| `PUT` | `/orders/:id` | `edit` | `orderIdParamSchema` + `updateOrderSchema` | `{ data: OrderDetail }` |
| `PATCH` | `/orders/:id/status` | `edit` | `orderIdParamSchema` + `updateOrderStatusSchema` | `{ data: OrderDetail }` |
| `GET` | `/orders/:id/bill` | `view` | `orderIdParamSchema` + `billQuerySchema` | `{ data: { html } }` or `application/pdf` binary |
| `DELETE` | `/orders/:id` | `delete` | `orderIdParamSchema` | `{ data: { success: true } }` |

### Existing Error Codes (reused)

| HTTP | Code | Endpoint |
|---|---|---|
| 400 | `VALIDATION_ERROR` | All (Zod validation, invalid transitions) |
| 404 | `NOT_FOUND` | `GET /:id`, `PUT /:id`, `PATCH /:id/status`, `GET /:id/bill`, `DELETE /:id` |
| 409 | `ORDER_NOT_DELETABLE` | `DELETE /:id` only |

### New Error Codes

None needed — all error conditions map to existing codes in `API.md` §23.

## Authentication & Authorization

| Endpoint | Middleware chain |
|---|---|
| `GET /orders` | `authenticate` → `authorize('orders', 'view')` |
| `GET /orders/:id` | `authenticate` → `authorize('orders', 'view')` |
| `PUT /orders/:id` | `authenticate` → `authorize('orders', 'edit')` |
| `PATCH /orders/:id/status` | `authenticate` → `authorize('orders', 'edit')` |
| `GET /orders/:id/bill` | `authenticate` → `authorize('orders', 'view')` |
| `DELETE /orders/:id` | `authenticate` → `authorize('orders', 'delete')` |

**Permission model:** `orders` module key has `view`, `edit`, `delete` actions. No `create` action — orders are created via `pos:create` only (per `API.md` §24).

**Admin** bypasses all permission checks per `architecture.md` §6.

**Rate limiting:** All mutating endpoints (`PUT`, `PATCH`, `DELETE`) under `/api/v1/orders` are rate-limited by the `ordersMutationLimiter` at `env.RATE_LIMIT_MAX` (same pattern as coupons, customers, etc.).

## Security Requirements

| Requirement | Implementation |
|---|---|
| Server-side Zod validation | All 6 endpoints validate via `validate` middleware before controller runs |
| Financial field immutability | `updateOrderSchema` uses `.strict()` — rejects `items`, `subtotal`, `grandTotal`, `discountAmount`, `taxAmount` |
| No client-trusted totals | List/detail/bill endpoints only read — they never accept totals from client |
| Permission enforcement | Every route passes `authorize('orders', action)` — checked server-side |
| Bill template XSS prevention | `escapeHtml()` helper in `renderBillHtml()` sanitizes product names and customer names |
| Rate limiting | Mutation rate limiter on all write endpoints |
| Hard-delete guard | Service-layer precondition checks (status, date, coupon) before delete |
| Same-day enforcement | Server-local date computed from `new Date()`, not from client request |
| Activity logging | Automatic via global `activityLogger` middleware — no manual logging needed |
| No password exposure | N/A — Orders has no authentication data |
| No raw MongoDB queries | All queries use Mongoose methods |

## Edge Cases

| ID | Edge Case | Expected Behavior |
|---|---|---|
| EC-01 | `DELETE` a `pending` order created at 23:59:59, request comes at 00:00:01 next day | `409 ORDER_NOT_DELETABLE` — server date boundary crossed |
| EC-02 | `DELETE` a `pending` order with a coupon applied but never redeemed (usage count check fails because the coupon was never actually used — the order was created with `status: pending` and the coupon's `usageCount` *was* incremented in POS's transaction) | `409 ORDER_NOT_DELETABLE` — `couponId` is set, regardless of whether the coupon was "fully" used. The POS transaction atomically increments `Coupon.usageCount` at order creation time, so any order with `couponId` has already consumed one usage slot |
| EC-03 | `PATCH /orders/:id/status` twice with the same transition from two simultaneous requests | Both pass pre-validation (both see the current status), but only the first write succeeds. The second write's `findByIdAndUpdate` succeeds (idempotent, sets the same values) — the pre-write validation reads the current doc before the first write commits. This is acceptable: setting `completedAt` twice is harmless. For `pending→cancelled`, the second write would also succeed (same idempotent behavior). No data corruption |
| EC-04 | Same-status request (`PATCH` with `status: 'completed'` on an already-`completed` order) | No-op — return the current document unchanged without emitting a socket event |
| EC-05 | `GET /orders/:id/bill` for a cancelled order | Bill renders with the cancelled status shown. No special error — the order exists, it just has `status: cancelled` and `cancelledAt` populated |
| EC-06 | `GET /orders/:id/bill` for an order that doesn't exist | `404 NOT_FOUND` |
| EC-07 | `PUT /orders/:id` setting `customerId` to `null` (explicitly clearing a previously-attached customer) | Succeeds — `customerId: null` is a valid value, converts a customer-linked order to walk-in |
| EC-08 | `PUT /orders/:id` with `customerId` set to a non-existent ObjectId | Mongoose doesn't validate `ref` existence at write time — the `customerId` is stored as-is. The detail view's `.populate('customerId')` will return `null` for that field if the customer was deleted. No explicit validation needed at write time (matches how POS's order creation handles customer IDs) |
| EC-09 | `GET /orders?search=` with no results | Empty array in `data`, correct `meta.total = 0` |
| EC-10 | `GET /orders` with no orders in the database | Empty array in `data`, `meta.total = 0` |
| EC-11 | `PATCH /orders/:id/status` transitioning `completed → cancelled` without a `cancelReason` | `400 VALIDATION_ERROR` — `.refine()` on schema enforces this |
| EC-12 | `PATCH /orders/:id/status` transitioning `cancelled → completed` | `400 VALIDATION_ERROR` — `cancelled` is terminal |
| EC-13 | `PATCH /orders/:id/status` transitioning `completed → pending` | `400 VALIDATION_ERROR` — not in valid transition set |
| EC-14 | Bill format requested as `format=docx` (invalid format) | `400 VALIDATION_ERROR` — only `pdf` and `html` are valid in the enum |
| EC-15 | `GET /orders?from=2026-06-26&to=2026-06-25` (from after to) | Acceptable — returns empty array since no orders fall in that window. No need to error |
| EC-16 | `GET /orders?sort=grandTotal` (invalid sort field) | `400 VALIDATION_ERROR` — only `createdAt` and `-createdAt` are allowed |
| EC-17 | Puppeteer fails during PDF generation (server resource exhaustion) | Catch error, return `500 INTERNAL_ERROR` with generic message |
| EC-18 | Order list with `limit=1` and more orders in DB | Returns 1 order, `meta.total` reflects actual total count |

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Puppeteer resource usage (memory/CPU) on bill PDF generation | Server slowdown under concurrent bill requests | Each PDF request opens/closes a browser instance. Limit: rate limiter on mutations covers `GET` via a separate limiter if needed. In practice, bill generation is on-demand (one staff at a time). Add a per-IP rate limiter `GET /orders/:id/bill` if abuse is observed post-launch |
| Race condition on simultaneous status transition + delete of the same order | One operation could succeed while the other is mid-flight | `findByIdAndUpdate` and `findByIdAndDelete` are atomic at the document level. If a `DELETE` removes the document just before a `PATCH`, the `PATCH` gets `null` back from `findByIdAndUpdate` and returns `404 NOT_FOUND` — acceptable |
| Missing `cancelReason` for `completed → cancelled` bypassed via direct API call | Audit trail integrity violated | Validation enforced at two levels: (1) Zod `.refine()` rejects requests without `cancelReason` when `status === 'cancelled'`, (2) Service-layer defense-in-depth check re-validates before write |
| Staff with `orders:delete` permission could delete a pending order with coupon usage | Coupon usage slot consumed but order deleted, losing the sale | Service-layer check: if `couponId` is set, delete is blocked regardless of `orders:delete` permission. The coupon usage increment is atomic at POS creation time and can't be rolled back without a full transaction — blocking the delete is the correct behavior (point user to cancel instead) |
| `same-day` check using server timezone doesn't match restaurant's timezone | Orders near midnight may be incorrectly classified as "not same day" if server is in UTC and restaurant is in a different timezone | Decision: use server-local date for the `same-day` check. The timezone mismatch is documented and acceptable for v1. If it becomes a real issue (staff working past midnight), add a restaurant timezone setting in Settings and use that for the comparison |
| Bill template rendering differs between on-screen POS preview and printed PDF | Inconsistent customer experience | Mitigation: the `BillPreview` component in POS was designed to match the expected bill template visual hierarchy. The `renderBillHtml()` function replicates that layout. A manual visual diff during testing confirms consistency |

## Open Questions

| # | Question | Impact | Status |
|---|---|---|---|
| Q1 | Should `same-day` comparison use server timezone or a restaurant-configured timezone? | Determines whether orders created after midnight in a +6 timezone (server in UTC) are deletable | **Resolved:** Use server timezone in v1. Document as known limitation. Add Settings-based timezone in future if needed |
| Q2 | Should `PATCH /orders/:id/status` return the full `OrderDetail` or just `{ success: true }`? | Frontend needs updated status for UI refresh | **Resolved:** Return full updated order — matches the pattern established by other modules' state-transition endpoints (e.g., coupon toggle returns full coupon) |

## Doc Updates Required

The following upstream doc edits must be applied **before** implementation starts. Each edit resolves an open item that this feature closes.

### 1. API.md §25.1 — Order hard-delete decision

**File:** `docs/API.md`
**Section:** §25.1 (line ~548)

Old text:
```
1. **`Order` deletion vs. schema** (§10): the PRD's "Delete order" feature doesn't cleanly map to `DATABASE.md`'s schema — `Order` has no `isActive` field (so it isn't in the soft-delete bucket) but a true hard delete would corrupt historical Reports/Income. Current behavior restricts real deletion to same-day, never-completed, no-coupon-used draft orders only. **Decide:** either accept this restriction permanently, or add `Order.isActive` / a dedicated `deletedAt` field to `DATABASE.md` §3.8 to support a real soft-delete of settled orders.
```

New text:
```
1. **`Order` deletion vs. schema** (§10): **RESOLVED — narrow hard-delete rules accepted for v1.** `Order` gets no `isActive` field. `DELETE /orders/:id` succeeds only for orders that are `status: pending`, created the same day (server date), and have no `couponId` set. All other orders return `409 ORDER_NOT_DELETABLE`. Decision rationale: see `tasks/implementation_plan.md` Decision 1.
```

### 2. API.md §25.3 — `completed → cancelled` permission

**File:** `docs/API.md`
**Section:** §25.3 (line ~550)

Old text:
```
3. **`completed → cancelled` transition** (§10): currently gated by the same `orders:edit` action as any other status change, since `DATABASE.md`'s permission-action enum (`view|create|edit|delete`) has no `approve`/`cancel` action. If post-payment cancellations should require a stricter check than a normal edit, that needs a schema-level decision (new action type) before it can be enforced here.
```

New text:
```
3. **`completed → cancelled` transition** (§10): **RESOLVED — gated by `orders:edit` for v1.** No new permission action added. The `cancelReason` field provides the audit trail. If a stricter gate is wanted later, it's a non-breaking addition. Decision rationale: see `tasks/implementation_plan.md` Decision 2.
```

### 3. AI_rules.md §13.1 — Order hard-delete

**File:** `docs/AI_rules.md`
**Section:** §13.1 (line ~161)

Old text:
```
1. Order hard-delete scope (`API.md` §25.1) — code must keep the narrow same-day/pending/no-coupon restriction.
```

New text:
```
1. Order hard-delete scope (`API.md` §25.1) — **RESOLVED:** narrow same-day/pending/no-coupon restriction accepted for v1. No `isActive` field added to `Order`. See `tasks/implementation_plan.md` Decision 1.
```

### 4. AI_rules.md §13.3 — `completed → cancelled` permission

**File:** `docs/AI_rules.md`
**Section:** §13.3 (line ~163)

Old text:
```
3. `completed → cancelled` gated by plain `orders:edit` (`API.md` §25.3) — do not add a stricter check unilaterally; that needs a schema-level `approve`/`cancel` action first.
```

New text:
```
3. `completed → cancelled` gated by plain `orders:edit` (`API.md` §25.3) — **RESOLVED:** kept at `orders:edit` for v1. See `tasks/implementation_plan.md` Decision 2.
```

### 5. Decision Log — `docs/decision.md`

Add new entry:

```
### [11] Orders — 2026-06-26

**Open items resolved:** `API.md §25.1`, `API.md §25.3`, `AI_rules.md §13.1`, `AI_rules.md §13.3`

**Decision 1 (hard-delete):** Narrow hard-delete rules accepted for v1. No `isActive` on `Order`. DELETE succeeds only for same-day, pending, no-coupon orders. See `tasks/implementation_plan.md` Decision 1.

**Decision 2 (completed→cancelled permission):** Gated by `orders:edit` for v1. No new permission action. The `cancelReason` field provides audit trail. See `tasks/implementation_plan.md` Decision 2.

**Doc(s) updated:** `API.md §25.1`, `API.md §25.3`, `AI_rules.md §13.1`, `AI_rules.md §13.3`
```

---

## Implementation Order

The build sequence is ordered to produce a testable backend first, then the frontend.

### Phase 1: Backend Foundation

| Step | Task | Files | Verification |
|---|---|---|---|
| 1.1 | Create validation schemas | `orders.validation.ts` | `tsc --noEmit` passes |
| 1.2 | Create service with all business logic | `orders.service.ts` | `tsc --noEmit` passes |
| 1.3 | Create controller | `orders.controller.ts` | `tsc --noEmit` passes |
| 1.4 | Create routes | `orders.routes.ts` | `tsc --noEmit` passes |
| 1.5 | Register module in app.ts + rate limiter | `app.ts` | `tsc --noEmit` passes, server starts |
| 1.6 | Implement `lib/pdf.ts` | `pdf.ts` | `tsc --noEmit` passes |

### Phase 2: Backend Testing

| Step | Task | Verification |
|---|---|---|
| 2.1 | Test `GET /orders` with various filter combinations | All filter params work, pagination correct, empty states handled |
| 2.2 | Test `GET /orders/:id` with valid + nonexistent ID | `200` with populated data, `404` on missing |
| 2.3 | Test `PUT /orders/:id` with valid + invalid fields | Restricted fields accepted, financial fields rejected |
| 2.4 | Test `PATCH /orders/:id/status` all 6 transitions | Valid transitions succeed, invalid rejected, socket event fires |
| 2.5 | Test `GET /orders/:id/bill` HTML + PDF formats | HTML rendered, PDF binary with correct content-type |
| 2.6 | Test `DELETE /orders/:id` all 4 precondition scenarios | Happy path succeeds, 3× `409 ORDER_NOT_DELETABLE` |
| 2.7 | Test permission gating | `view` / `edit` / `delete` actions enforced correctly |
| 2.8 | Run `TEST_CASES.md` §6 (Orders) — all 17 cases | All pass |

### Phase 3: Frontend Foundation

| Step | Task | Files | Verification |
|---|---|---|---|
| 3.1 | Create schema.ts | `features/orders/schema.ts` | `tsc --noEmit` passes |
| 3.2 | Create api.ts with all hooks | `features/orders/api.ts` | `tsc --noEmit` passes |
| 3.3 | Create OrderFilters component | `OrderFilters.tsx` | Renders with all filter controls |
| 3.4 | Create OrderList component | `OrderList.tsx` | Renders DataTable with columns, mobile cards |
| 3.5 | Create OrderDetail component | `OrderDetail.tsx` | Displays full order, populated references |
| 3.6 | Create OrderStatusActions component | `OrderStatusActions.tsx` | Shows correct buttons per status |
| 3.7 | Create OrderCancelDialog component | `OrderCancelDialog.tsx` | Modal with reason textarea, validation |
| 3.8 | Create OrderEditForm component | `OrderEditForm.tsx` | Restricted form, customer picker |
| 3.9 | Create BillView component | `BillView.tsx` | Tab toggle: preview/print/download |
| 3.10 | Create orders list page | `orders/page.tsx` | Standard list page layout |
| 3.11 | Create order detail page | `orders/[orderId]/page.tsx` | Dynamic route with back navigation |

### Phase 4: Frontend Integration & Testing

| Step | Task | Verification |
|---|---|---|
| 4.1 | Full end-to-end flow: browse orders → view detail → edit → status transition → view bill → cancel → delete | All actions work, UI updates correctly |
| 4.2 | Mobile viewport testing | List degrades to cards, detail actions reachable per ORD-MOB-01 |
| 4.3 | Permission gating in UI: `view`/`edit`/`delete` actions hidden per PermissionGate | Matches user's permission set |
| 4.4 | Error handling: `404`, `409`, `400` errors surface correctly | Toast/dialog messages use active voice per `theme.md` §19 |
| 4.5 | Loading/empty/error states for all components | Skeleton, empty message, error message all present |

---

## Task Breakdown

### Task 1: Backend Validation Schemas

**Description:** Create `orders.validation.ts` with Zod schemas for all 6 endpoints.

**Acceptance Criteria:**
- `listOrdersQuerySchema` validates: status enum, from/to dates, createdBy/customerId ObjectId, search string (max 50), sort enum (`createdAt`/`-createdAt`), page/limit pagination. Uses `.strict()`.
- `orderIdParamSchema` validates `id` as a 24-char hex string.
- `updateOrderSchema` validates: tableNumber (max 20, optional), orderType enum (optional), customerId (nullable ObjectId, optional). Uses `.strict()` — rejects extra fields.
- `updateOrderStatusSchema` validates: status enum (required), cancelReason (max 500, optional). Has `.refine()` requiring cancelReason when status === 'cancelled'. Uses `.strict()`.
- `billQuerySchema` validates: format enum (pdf/html, optional, default html). Uses `.strict()`.

### Task 2: Backend Service Layer

**Description:** Create `orders.service.ts` with all business logic.

**Acceptance Criteria:**
- `listOrders` builds correct MongoDB filter, paginates, returns `{ data, meta }` without populating references.
- `getOrderById` populates `customerId` (name, phone) and `createdBy` (name), returns `404` on missing.
- `updateOrder` only sets `tableNumber`/`orderType`/`customerId`, rejects all other fields.
- `updateOrderStatus` enforces all transition rules, sets `completedAt`/`cancelledAt` accordingly, emits `order:statusChanged` on success.
- `deleteOrder` enforces all 3 preconditions (status, date, coupon) before deleting.
- `getOrderBill` generates HTML, renders PDF via Puppeteer when format=pdf.
- `renderBillHtml` produces valid HTML with inline styles, no external dependencies.

### Task 3: Backend Controller & Routes

**Description:** Create `orders.controller.ts` and `orders.routes.ts`.

**Acceptance Criteria:**
- Controller has 6 named exports calling service functions.
- Routes wire middleware correctly: `authenticate` → `authorize('orders', action)` → `validate(...)` → controller.
- PDF bill returns `application/pdf` with correct Content-Type header.
- All responses use the standard envelope `{ data: ... }`.

### Task 4: Module Registration in app.ts

**Description:** Register Orders module in backend entry point.

**Acceptance Criteria:**
- Import added for `ordersRoutes`.
- Routes mounted at `/api/v1` after `posRoutes`.
- Mutation rate limiter applied to `PUT`, `PATCH`, `DELETE` on `/orders`.
- `tsc --noEmit` passes, server starts without errors.

### Task 5: Puppeteer PDF Library

**Description:** Implement `backend/src/lib/pdf.ts`.

**Acceptance Criteria:**
- `renderPdf(html: string): Promise<Buffer>` function exported.
- Launches Puppeteer headless with `--no-sandbox` flag.
- Sets HTML content, waits for `networkidle0`, generates A4 PDF with 10mm margins.
- Properly closes browser in `finally` block.
- `tsc --noEmit` passes.

### Task 6: Frontend Schema & API

**Description:** Create `schema.ts` and `api.ts` for the Orders feature.

**Acceptance Criteria:**
- `schema.ts` exports `ordersFilterSchema`, `updateOrderSchema`, `updateStatusSchema` with matching types.
- `api.ts` exports `OrderListItem` and `OrderDetail` response interfaces.
- All 6 React Query hooks exported: `useOrderList`, `useOrder`, `useUpdateOrder`, `useUpdateOrderStatus`, `useDeleteOrder`, `useOrderBill`.
- Query keys follow existing convention: `['orders', 'list', qs]`, `['orders', 'detail', id]`, `['orders', 'bill', id, format]`.
- Mutations invalidate `['orders']` on success.

### Task 7: Frontend Components

**Description:** Create all 7 shared components.

**Acceptance Criteria:**
- `OrderFilters`: Status dropdown, date range inputs, search input with debounce, clear button. Auto-submits on change.
- `OrderList`: DataTable with all columns, clickable rows navigating to `[orderId]`, `mobileRender` card layout.
- `OrderDetail`: Displays all order sections, loading skeleton, error state, 404 state.
- `OrderStatusActions`: Shows correct buttons per status (pending→complete, pending→cancel, completed→cancel, cancelled=none). Permission-gated.
- `OrderCancelDialog`: Modal with reason textarea, "Proceed" button disabled until reason entered, max 500 chars, active-voice copy.
- `OrderEditForm`: Restricted fields, customer picker (reuse pattern from POS), save/cancel buttons.
- `BillView`: Tab toggle between preview/print/download. HTML previews inline, PDF downloads via blob URL.

### Task 8: Frontend Pages

**Description:** Create the 2 page files.

**Acceptance Criteria:**
- List page: `PermissionGate('orders', 'view')`, filter bar, list component, standard layout.
- Detail page: Dynamic `[orderId]` route, fetches order by ID, renders detail with all sections, back navigation.
- Both pages use `<PermissionGate>` at the page level.

### Task 9: Verification

**Description:** Run verification per `current_task.md` and `TEST_CASES.md` §6.

**Acceptance Criteria:**
- `tsc --noEmit` passes on both frontend and backend.
- `npm run dev` — end-to-end flow works: browse, filter, view detail, edit, status transitions, bill view, delete.
- All 17 `TEST_CASES.md` §6 cases pass (ORD-H-01 through ORD-H-10, ORD-E-01 through ORD-E-04, ORD-V-01/V-02, ORD-S-01, ORD-DEL-01 through ORD-DEL-05, ORD-RT-01, ORD-AUTH-01, ORD-MOB-01).
- Socket event `order:statusChanged` observable from a second connected client.
- Permission gating verified: user with only `orders:view` gets `403` on mutations.

---

## Final Approved Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | Narrow hard-delete for Orders (no `isActive` field) | Completed orders must never be hard-deleted; `isActive` on all list queries adds overhead for no benefit in v1 |
| D2 | `completed → cancelled` gated by `orders:edit` | No new permission action needed; `cancelReason` provides sufficient audit trail |
| D3 | Server-side inline HTML bill template (no template engine) | Template is small; avoids adding a dependency for a single use case |
| D4 | Status transitions use `findByIdAndUpdate` (not transaction) | Single-document writes, no multi-collection atomicity needed |
| D5 | Same-day check uses server date (not restaurant timezone) | Acceptable v1 limitation; Settings-based timezone can be added later |
| D6 | `PATCH /orders/:id/status` returns full order (not `{ success }`) | Matches existing app pattern for state-transition endpoints |
| D7 | No `skipActivityLog` flag on Orders mutations | Global `activityLogger` handles all Orders mutations correctly; only POS needed the flag because it writes its own ActivityLog inside a transaction |
