# Current Task — Orders

**PRD Feature 5** | `API.md` §10 | `DATABASE.md` §3.8 | `ARCHITECTURE.md` §5, §7
**Depends on:** POS (Task 10) — `Order` model, `Counter` helper, and the `pos:order_created` socket event all exist and are reused here
**Permission module key:** `orders` — already registered in `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`
**Sidebar link:** Already exists at `/orders` with `module: 'orders'` — the route doesn't exist yet; this task creates it.

> ⚠️ **Open items carried from `API.md` §25 — resolve first, build against the resolved doc, not the open question (see below).** This is the only module that needs to decide between hard-delete and soft-delete for `Order`, and whether `completed → cancelled` needs a permission stricter than `orders:edit`.

---

## Open Items to Resolve During This Task

### 1. `API.md` §25.1 — Order hard-delete vs schema strategy

`DATABASE.md` §3.8 has no `isActive`/`deletedAt` field on `Order`. The current narrow `DELETE /orders/:id` (same-day, `pending`, no coupon usage) sidesteps the problem by making successful hard deletes extremely rare. Decide:

- **Option A — Stay narrow (v1 conservative):** Keep the current narrow hard-delete rules. If `isActive`/`deletedAt` are ever needed, it's a schema migration added in a future task. No `Order` model changes now.
- **Option B — Add `isActive` now:** Add `isActive` (Boolean, default `true`) to `DATABASE.md` §3.8 and the `Order` model now. `DELETE` becomes a soft-delete (`isActive: false`). This makes the delete endpoint uniform with every other module but adds a field to the highest-traffic collection that won't be used for queries by any v1 feature (all list queries need an `{ isActive: { $ne: false } }` filter forever, even though `isActive: false` orders won't exist for months).

**Recommendation:** Option A — don't add `isActive` to `Order` now. The narrow-delete rules are a deliberate safety measure, not an oversight. If hard-delete of a *completed* order becomes a real requirement post-v1, the schema change and the history-preservation semantics can be designed properly with the benefit of real usage data.

Update `API.md` §10 / `DATABASE.md` §8.1 with whichever decision is made. This task's implementation reflects Option A below; adjust if Option B is chosen.

### 2. `API.md` §25.3 — `completed → cancelled` permission gating

Currently gated by `orders:edit` — the same permission that allows editing `tableNumber`/`orderType`/`customerId`. Decide whether `completed → cancelled` (which has financial implications — a cancellation after payment potentially means a refund) needs its own permission action or a role gate (`admin` only).

**Recommendation:** Keep `orders:edit` for v1. The `cancelReason` requirement already provides an audit trail; adding a new permission action that doesn't exist in `DATABASE.md` §3.1 yet would require a schema migration and per-user retraining for a case that's rare in a restaurant context (cancelling a completed order is effectively a void/refund). If a stricter gate is wanted later, it's a non-breaking addition (`PATCH /orders/:id/status` keeps working, just gets an additional permission check). Update `DATABASE.md` and `API.md` with the decision.

---

## Backend (`backend/src/modules/orders/` — 4 new files, no new model files)

**No new models.** `Order` (model + all interfaces) was already built in Task 10 (POS). `Counter` and the `getNextSequence` helper also exist. This task is purely read/edit/status-transition/bill/delete logic around the existing `Order` model.

### Validation — `orders.validation.ts`

**`listOrdersQuerySchema`** (query, for `GET /orders`):
- `status` — optional enum `pending | completed | cancelled`
- `from` — optional ISO date string
- `to` — optional ISO date string
- `createdBy` — optional string (Mongo ObjectId format)
- `customerId` — optional string (Mongo ObjectId format)
- `search` — optional string, max 50 (matches `orderNumber`)
- `sort` — optional string, default `-createdAt` (only `createdAt` and `-createdAt` allowed — restrict the sort field to prevent query injection via arbitrary sort keys)
- `page` — optional, coerce to int, min 1, default 1
- `limit` — optional, coerce to int, min 1, max 100, default 20

Use `.strict()` here — no unexpected query params should pass through.

**`orderIdParamSchema`** (params, for all `/:id` routes):
- `id` — string, must be a valid Mongo ObjectId

**`updateOrderSchema`** (body, for `PUT /orders/:id`):
- `tableNumber` — optional string, max 20, trimmed
- `orderType` — optional enum `dine-in | takeaway | delivery`
- `customerId` — optional nullable string (ObjectId format)

Use `.strict()` — reject any unexpected fields (e.g. `items`, `subtotal`, `grandTotal`) with `400 VALIDATION_ERROR`. Per `API.md` §10 and `TEST_CASES.md` ORD-V-01 / ORD-S-01, only `tableNumber`, `orderType`, and `customerId` are ever editable.

**`updateOrderStatusSchema`** (body, for `PATCH /orders/:id/status`):
- `status` — enum `pending | completed | cancelled`
- `cancelReason` — optional string, max 500, trimmed. **Required** when transitioning to `cancelled` from any status (enforced via `.refine()`, not at field level — the `cancelReason` field itself is optional on the schema; the refine only requires it when `status === 'cancelled'`)

Use `.strict()` — no extra fields.

**`billQuerySchema`** (query, for `GET /orders/:id/bill`):
- `format` — optional enum `pdf | html`, default `html`

Use `.strict()`.

**`deleteOrderParamSchema`** (params, for `DELETE /orders/:id`):
- `id` — string, Mongo ObjectId format (reuse `orderIdParamSchema`)

### Service — `orders.service.ts`

Per `ARCHITECTURE.md` §4: *"Order listing, detail, status transitions, bill generation"* lives here. All functions **read only** — no order creation (that's POS). No Mongoose transactions needed — these are all single-document operations (except delete, which may delete an ActivityLog entry too but doesn't need atomicity).

**`listOrders(filters)`**
- Build a MongoDB filter object from the validated query params:
  - `status` filter directly
  - `from`/`to` → `createdAt: { $gte, $lte }` range
  - `createdBy` → ObjectId filter
  - `customerId` → ObjectId filter
  - `search` → `orderNumber` regex (case-insensitive, anchored substring — e.g. `{ orderNumber: { $regex: search, $options: 'i' } }`). Do NOT use `$text` here — `orderNumber` is a predictable formatted string (`ORD-YYYY-XXXXXX`), not free text, and a regex on the unique-indexed field is performant for the expected order volume.
- Sort by the validated `sort` param (default `{ createdAt: -1 }`)
- Paginate using `.skip().limit()` with `total` count from `Order.countDocuments(filter)`
- `.lean()` for response speed
- Return `{ data: orders, meta: { total, page, limit } }` matching the app's standard list envelope
- **Do NOT populate** `customerId`/`createdBy` in the list view — that's for the detail endpoint only. The list response should be lean: `_id`, `orderNumber`, `orderType`, `grandTotal`, `status`, `createdAt`, `createdBy` (id only), and `customerId` (id only). `items` array is also excluded from list — the list is a summary; `items` are returned only in the detail view.

**`getOrderById(id)`**
- `Order.findById(id).populate('customerId', 'name phone').populate('createdBy', 'name').lean()`
- If not found → `createError(404, 'NOT_FOUND', 'Order not found')` — per `TEST_CASES.md` ORD-E-01
- Return `{ data: order }` with full detail including `items[]`

**`updateOrder(id, dto)`**
- `Order.findByIdAndUpdate(id, { $set: sanitizedFields }, { new: true, runValidators: true })`
- Sanitize: only `tableNumber`, `orderType`, `customerId` are allowed. Strip everything else at the validation layer (`.strict()` already handles this) — see `TEST_CASES.md` ORD-V-01 and ORD-S-01.
- If not found → `404 NOT_FOUND`
- `customerId: null` explicitly clears the customer association (walk-in stays walk-in; this is a correction endpoint, not a "must have customer" rule)
- Return `{ data: order }`

**`updateOrderStatus(id, status, cancelReason?)`**
- Validate transition rules **before** the database write:
  - `pending → completed`: allowed. Set `completedAt = new Date()`. Clear `cancelledAt` and `cancelReason` if somehow set.
  - `pending → cancelled`: allowed. Set `cancelledAt = new Date()`. Requires `cancelReason` (enforced at validation layer, but double-check in service as defense-in-depth). Clear `completedAt` if somehow set.
  - `completed → cancelled`: allowed. Requires `cancelReason`. Set `cancelledAt = new Date()`. This is the "void/refund acknowledgment" path.
  - `cancelled → anything`: **REJECTED** — `cancelled` is terminal per `API.md` §10. Throw `400 VALIDATION_ERROR`.
  - `completed → pending`: **REJECTED** — not in the allowed transition set. Throw `400 VALIDATION_ERROR`.
  - Same-status no-op: e.g. `pending → pending`. Technically valid but pointless — silently succeed without writing (return the current document unchanged).
- If order not found → `404 NOT_FOUND`
- Use `Order.findByIdAndUpdate(id, { $set: updateFields }, { new: true })` — atomic, no read-then-write race needed since status transitions are idempotent and the set of valid transitions is exhaustive
- After a successful transition, emit the socket event (see below)
- Return `{ data: order }`

**`deleteOrder(id)`**
- Hard-delete per the narrow rules from `API.md` §10:
  - Fetch the order first (single query, no need for transaction)
  - If not found → `404 NOT_FOUND`
  - If `status !== 'pending'` → `409 ORDER_NOT_DELETABLE`, message: `"Only pending orders can be deleted. Use 'Cancel' instead."`
  - If created on a **different day** (server-local date, not client-supplied) → `409 ORDER_NOT_DELETABLE`, message: `"Only same-day orders can be deleted."`
  - If `couponId` is set → `409 ORDER_NOT_DELETABLE`, message: `"Orders with coupon usage cannot be deleted. Use 'Cancel' instead."`
  - Otherwise: `Order.findByIdAndDelete(id)`. Also delete the associated `ActivityLog` entry (by `targetId`) — this is a genuine mistaken/duplicate draft, so its log entry is noise, not a record.
  - Return `{ data: { success: true } }`

**`getOrderBill(id, format)`**
- Fetch order with populated `customerId` and `createdBy`
- If not found → `404 NOT_FOUND`
- Generate the bill:
  - **HTML format:** render a **server-side template** (not a React component — this is a Puppeteer print path, not a page). Build the HTML string with inline styles (no CSS framework, no Tailwind — the PDF renderer has no JS runtime; inline styles guarantee consistent output). The template should match the visual layout of the POS `BillPreview` component closely enough that the cashier doesn't see two different "receipt" designs.
  - **PDF format:** use Puppeteer to render the same HTML template, return `application/pdf` binary
  - Return `{ data: { html } }` for HTML format, or `{ data: { pdf: Buffer } }` with `application/pdf` content-type for PDF format
  - Per `API.md` §9.4, this endpoint also serves the POS screen's "print" button — POS never needs its own bill-rendering endpoint.

**Socket.io events — emitted from the service after successful mutations:**

```
getIO().emit('order:statusChanged', { orderId: order.id, status: order.status, orderNumber: order.orderNumber });
```

Per `TEST_CASES.md` ORD-RT-01. The `orders:statusChanged` event is registered in `activityLogger.ts`'s `STATE_TRANSITION_RULES` (already exists — see line 21 of that file). The frontend socket listener (built in Dashboard Task 12) will consume this to invalidate metrics.

### Controller — `orders.controller.ts`

- Named exports: `listOrders`, `getOrderById`, `updateOrder`, `updateOrderStatus`, `getOrderBill`, `deleteOrder`
- Same pattern as every other module: extract from `req.query`/`req.body`/`req.params`, call service, `res.status(200).json({ data: result })` or `res.status(200).json(result)` for paginated list
- `getOrderBill` for PDF format: set `res.setHeader('Content-Type', 'application/pdf')` and `res.setHeader('Content-Disposition', inline|attachment)`, then `res.send(pdfBuffer)`. For HTML: wrap in the standard `{ data: { html } }` envelope.
- `import * as ordersService from './orders.service'`

### Routes — `orders.routes.ts`

```
GET    /orders                    -> authenticate, authorize('orders','view'), validate(listOrdersQuerySchema,'query'), listOrders
GET    /orders/:id                -> authenticate, authorize('orders','view'), validate(orderIdParamSchema,'params'), getOrderById
PUT    /orders/:id                -> authenticate, authorize('orders','edit'), validate(orderIdParamSchema,'params'), validate(updateOrderSchema), updateOrder
PATCH  /orders/:id/status         -> authenticate, authorize('orders','edit'), validate(orderIdParamSchema,'params'), validate(updateOrderStatusSchema), updateOrderStatus
GET    /orders/:id/bill           -> authenticate, authorize('orders','view'), validate(orderIdParamSchema,'params'), validate(billQuerySchema,'query'), getOrderBill
DELETE /orders/:id                -> authenticate, authorize('orders','delete'), validate(orderIdParamSchema,'params'), deleteOrder
```

Export default router.

### Module Registration — `backend/src/app.ts`

- `import ordersRoutes from './modules/orders/orders.routes';`
- Mount: `app.use('/api/v1', ordersRoutes);` (after `posRoutes`, before `errorHandler`)
- Add mutation rate limiter:
```ts
const ordersMutationLimiter = makeRateLimiter(env.RATE_LIMIT_MAX);
app.use('/api/v1/orders', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return ordersMutationLimiter(req, res, next);
  }
  next();
});
```
- Note: `POST` is in the mutation list for coverage consistency, even though this module has no `POST` endpoint (order creation is POS's job). If a `POST` ever hits `/orders`, it gets rate-limited like any other mutation.

### Activity Logger Configuration — No Code Changes Needed

The `activityLogger.ts` middleware already has:
- `TARGET_TYPE_MAP.orders: 'Order'` (line 65)
- `STATE_TRANSITION_RULES` for `order.status_changed` (line 21)

The logger will automatically capture:
- `orders.updated` for `PUT /orders/:id`
- `order.status_changed` for `PATCH /orders/:id/status`
- `orders.deleted` for `DELETE /orders/:id`

No `skipActivityLog` flag needed here — unlike POS's order creation (which writes its own `ActivityLog` inside a transaction), the Orders module's mutations are simple single-document operations that the global middleware handles correctly.

---

## Frontend (`frontend/src/features/orders/` — schema.ts, api.ts, 4 components + 2 pages)

### Already Done (No Changes Needed)
- Permission module key `orders: ['view', 'edit', 'delete']` registered in `frontend/src/lib/constants.ts`
- Sidebar nav link `/orders` with `module: 'orders'` already exists in `Sidebar.tsx` — permission-gated automatically
- `DataTable` shared component exists for the list view
- `PermissionGate` shared component exists

### Schema — `schema.ts`

**`listOrdersQuerySchema`** — mirrors the backend's `listOrdersQuerySchema` for use in filter state (Zod is the single validation source; the frontend schema can be a lighter version that just types the filter form):

```ts
export const ordersFilterSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(50).optional(),
});

export type OrdersFilterFormData = z.infer<typeof ordersFilterSchema>;
```

**`updateOrderSchema`** (edit form):
```ts
export const updateOrderSchema = z.object({
  tableNumber: z.string().max(20).optional(),
  orderType: z.enum(['dine-in', 'takeaway', 'delivery']).optional(),
  customerId: z.string().nullable().optional(),
});

export type UpdateOrderFormData = z.infer<typeof updateOrderSchema>;
```

**`updateStatusSchema`** (status change):
```ts
export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']),
  cancelReason: z.string().max(500).optional(),
}).refine(
  (data) => data.status !== 'cancelled' || (data.cancelReason && data.cancelReason.trim().length > 0),
  { message: 'Cancel reason is required when cancelling an order', path: ['cancelReason'] }
);

export type UpdateStatusFormData = z.infer<typeof updateStatusSchema>;
```

### API — `api.ts`

- `'use client'` at top
- Response types matching `API.md` §10 response shapes exactly:

```ts
export interface OrderListItem {
  id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  grandTotal: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: string;    // user id
  customerId: string | null;
}

export interface OrderDetail extends OrderListItem {
  tableNumber?: string;
  items: Array<{
    productId: string;
    nameSnapshot: string;
    priceSnapshot: number;
    quantity: number;
    lineTotal: number;
  }>;
  couponId?: string | null;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  payment: {
    method: 'cash' | 'card' | 'bkash' | 'nagad' | 'split';
    splits?: Array<{ method: 'cash' | 'card' | 'bkash' | 'nagad'; amount: number }>;
  };
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdBy: { _id: string; name: string } | string;
  customerId: { _id: string; name: string; phone: string } | string | null;
  updatedAt: string;
}
```

- `useOrderList(params)` — `useQuery`, key `['orders', 'list', qs]`
- `useOrder(id)` — `useQuery`, key `['orders', 'detail', id]`, enabled only when `id` is truthy
- `useUpdateOrder()` — `useMutation`, invalidates `['orders']` on success
- `useUpdateOrderStatus()` — `useMutation`, invalidates `['orders']` on success
- `useDeleteOrder()` — `useMutation`, invalidates `['orders']` on success
- `useOrderBill(id, format?)` — `useQuery`, key `['orders', 'bill', id, format]`, returns HTML string or PDF blob URL. For PDF, fetch as blob via `apiClient` with `responseType: 'blob'`, create an object URL for the print/download button. For HTML, return the string for an iframe/inline preview.
- Query keys follow: `['orders', 'list', qs]`, `['orders', 'detail', id]`, `['orders', 'bill', id, format]`

### Components

#### `OrderFilters.tsx`
- Inline filter bar (not a separate page or modal — filters live directly above the order list)
- Status dropdown (All / Pending / Completed / Cancelled)
- Date range: From + To date inputs (native `date` inputs, matching the convention set by `useDateRangeFilter` in Dashboard Task 12 — but since Dashboard hasn't been built yet, use standalone date inputs here that will be easy to replace with the shared component later)
- Search text input for `orderNumber` (debounced ~300ms)
- All filters update the query params (or filter state) immediately — no "Apply" button, auto-submit on change
- A "Clear filters" action when any filter is active
- Match the same filter-bar visual pattern used by Coupons/Products/Customers lists

#### `OrderList.tsx`
- Uses `useOrderList(params)` with current filter state
- Renders `DataTable` with columns:
  - `orderNumber` — link to the detail page
  - `orderType` — badge-style label
  - `grandTotal` — formatted with the currency convention decided in POS (e.g. `৳540.00`)
  - `status` — status badge with color coding matching the POS bill preview's convention (pending: yellow/amber, completed: green, cancelled: red)
  - `createdAt` — formatted date/time
  - Actions column (view, edit, delete) — permission-gated individually
- Row click → navigate to `[orderId]` detail page
- **Mobile degradation:** Use `mobileRender` on `DataTable` to render order cards (orderNumber prominent, status badge, grandTotal, date) — per `TEST_CASES.md` ORD-MOB-01
- Loading: `DataTable` skeleton. Empty: "No orders found. Orders appear here once a POS sale is completed."

#### `OrderDetail.tsx`
- Fetches via `useOrder(id)`
- Displays full order information in a structured layout:
  - **Header:** `orderNumber`, status badge, `createdAt` timestamp
  - **Order info section:** `orderType`, `tableNumber` (if dine-in), customer name/phone (if attached), staff name who created it
  - **Items table:** product name (snapshot), unit price, qty, line total
  - **Totals section:** subtotal, discount (if any, with coupon code label), tax, grand total — right-aligned, receipt-style
  - **Payment section:** method, amount. For split payments: list each split method + amount
  - **Actions section:** status transition buttons (permission-gated per action), edit link, bill view/print/download
  - **Status history:** `completedAt` or `cancelledAt`/`cancelReason` displayed if set
- Cancel reason shown as a quoted block when present
- Loading: content skeleton. Error/not-found: dedicated error state matching the app's pattern

#### `OrderStatusActions.tsx`
- Renders inside `OrderDetail` — the set of available status transition buttons based on the current order status
- **Pending order:**
  - "Mark Completed" button → calls `useUpdateOrderStatus({ status: 'completed' })`
  - "Cancel Order" button → opens a cancel-reason modal/dialog first, then calls `useUpdateOrderStatus({ status: 'cancelled', cancelReason })`
- **Completed order:**
  - "Cancel / Void" button → opens a cancel-reason modal/dialog that explains "This acknowledges a refund/void of a completed order" (per `API.md` §10, `completed → cancelled` is the refund acknowledgment path), then calls `useUpdateOrderStatus({ status: 'cancelled', cancelReason })`
- **Cancelled order:**
  - No status actions — `cancelled` is terminal. Show a muted "Order cancelled" indicator.
- All buttons wrapped in `<PermissionGate module="orders" action="edit">`
- Loading state: buttons disabled with spinner during mutation
- On success: `queryClient.invalidateQueries({ queryKey: ['orders'] })` and show a success toast
- On error: surface the error message

#### `OrderCancelDialog.tsx`
- Modal dialog with:
  - Title: "Cancel Order" (for pending) or "Void / Refund Order" (for completed)
  - Descriptive text explaining the implications
  - Textarea for `cancelReason` (required, max 500 chars)
  - "Proceed" button (disabled until reason is entered) + "Go Back" button
- Validation: reason required, min 3 chars, max 500
- Error state: show inline validation and API errors

#### `OrderEditForm.tsx`
- Inline form (or dialog) for editing the restricted fields: `tableNumber`, `orderType`, `customerId`
- Pre-populated with current values
- CustomerId: reuse the customer search/picker pattern from POS's `CustomerPicker` (debounced search, select from results, clear to set walk-in)
- On save: calls `useUpdateOrder()`, invalidates queries, closes the form
- Wrapped in `<PermissionGate module="orders" action="edit">`
- Cancel button to discard changes

#### `BillView.tsx`
- Tab/mode toggle: Preview / Print / Download
- **Preview:** renders the bill HTML inline (via iframe or `dangerouslySetInnerHTML` with sanitized HTML) — only when the fetched bill format is HTML
- **Print:** opens the bill HTML in a new window with `window.print()` called on load, or triggers the browser's print dialog
- **Download:** triggers PDF download via blob URL when `format=pdf`
- Fetches via `useOrderBill(id, format)` — fetch HTML eagerly for preview, fetch PDF on demand for download
- Handle the case where the order is cancelled (bill should still render, showing the cancelled status and possibly reflecting zero/refund amounts)
- Handle the case where the order doesn't exist → show appropriate error

### Pages

#### `frontend/src/app/(dashboard)/orders/page.tsx`
- `'use client'`
- `<PermissionGate module="orders" action="view">` wraps the whole page
- Title: "Orders" with subtitle "View and manage all orders"
- No "Create" button (orders are only created via POS)
- Composition: `<OrderFilters />` → `<OrderList />`
- Standard layout matching other list pages (Coupons, Products, Customers)

#### `frontend/src/app/(dashboard)/orders/[orderId]/page.tsx`
- `'use client'`
- Dynamic route: `[orderId]` param
- Fetches order by ID, renders `<OrderDetail />`
- Back navigation to the orders list
- Breadcrumb: Orders > [orderNumber]

---

## Design

- **Order status badge colors:** reuse the same convention established in POS's `BillPreview` — the three statuses appear in both modules.
  - `pending` → amber/yellow (`bg-amber-100 text-amber-800` or equivalent from `theme.md`'s tokens)
  - `completed` → green (`bg-green-100 text-green-800`)
  - `cancelled` → red (`bg-red-100 text-red-800`)
  - These should be defined as a shared constant/utility so POS, Orders, and Dashboard all render the same badge.
- **Cancel-reason input:** modal prompt (not inline). A modal forces the staff member to explicitly acknowledge the cancellation rather than accidentally tapping a button. The modal title differs based on current status (`pending` → "Cancel Order" vs `completed` → "Void / Refund Order").
- **Orders list mobile degradation pattern:** per `TEST_CASES.md` ORD-MOB-01 — the `DataTable` component already supports `mobileRender` for card-style layout. Each card shows: `orderNumber` (prominent), status badge, `grandTotal`, and `createdAt`. The detail page's bill/print action must remain reachable — position the bill download button prominently in the detail page header, not buried at the bottom.
- **Bill template layout:** match the POS `BillPreview` component's visual hierarchy:
  - Restaurant name/logo (placeholder — `Settings.restaurantName` is not wired into the template yet since this is a server-side template, not a React component; add a TODO in the template to wire it in once Settings has a public read path)
  - Order number, date, type, table if dine-in
  - Item lines (name, qty, price, total)
  - Totals (subtotal, discount, tax, grand total)
  - Payment method summary
  - Footer: "Thank you" message
- **Money formatting:** reuse the format decided in POS (e.g. `৳540.00`). Since this is a server-side HTML template, the formatting is done in TypeScript on the backend (a simple `formatBDT(n)` helper in `orders.service.ts` or a shared formatting utility). Do NOT introduce a second format — the POS on-screen preview and the printed bill must use the same convention.

---

## Implementation Notes

### Files to Create

**Backend (4 new files):**
1. `backend/src/modules/orders/orders.validation.ts`
2. `backend/src/modules/orders/orders.service.ts`
3. `backend/src/modules/orders/orders.controller.ts`
4. `backend/src/modules/orders/orders.routes.ts`

**Modify (backend):**
- `backend/src/app.ts` — register Orders routes + mutation rate limiter

**Frontend (9 new files):**
1. `frontend/src/features/orders/schema.ts`
2. `frontend/src/features/orders/api.ts`
3. `frontend/src/features/orders/components/OrderFilters.tsx`
4. `frontend/src/features/orders/components/OrderList.tsx`
5. `frontend/src/features/orders/components/OrderDetail.tsx`
6. `frontend/src/features/orders/components/OrderStatusActions.tsx`
7. `frontend/src/features/orders/components/OrderCancelDialog.tsx`
8. `frontend/src/features/orders/components/OrderEditForm.tsx`
9. `frontend/src/features/orders/components/BillView.tsx`

**Pages (2 new files):**
1. `frontend/src/app/(dashboard)/orders/page.tsx`
2. `frontend/src/app/(dashboard)/orders/[orderId]/page.tsx`

### Patterns to Follow / Patterns That Are New

- **Follow exactly:** controller/service/routes file shape from `categories`/`coupons` modules — named exports, `import * as service`, `try/catch/next`, `validate` middleware, `authenticate`/`authorize` chain.
- **Follow the DataTable pattern** from `coupons`/`products` list pages — column definition, `mobileRender`, loading/empty/error states.
- **New to the codebase, no prior file to copy:**
  - Server-side bill template rendering (HTML string with inline styles, no JSX/React — this is the first server-rendered template in the app). The template is just string interpolation — no template engine dependency needed.
  - Puppeteer PDF generation from the HTML template — `backend/src/lib/pdf.ts` is already a stub placeholder; this task makes it real. Only the `orders.service.ts` calls it; the library should be generic enough for Reports (Task 18) to reuse.
  - Status transition state machine — this is the first module with a non-trivial state machine (3 states, 3 valid transitions, 2 terminal-emission rules). The POS module had a simpler model (order created as `completed` or `pending`, no post-creation transitions).
  - Narrow hard-delete with business-logic preconditions (same-day, pending-only, no coupon). This is the app's first delete endpoint that doesn't just toggle `isActive`.
  - The `customerId` editable field requires reusing the customer search/picker from POS's `CustomerPicker` — confirm that component is modular enough to import into Orders. If not, extract it to `components/shared/`.

### Already Done (No Changes Needed)
- `Order` model + all interfaces (`IOrder`, `IOrderItem`, `IPayment`, `IPaymentSplit`) exist
- `Counter` model + `getNextSequence` helper exist
- Permission module key `orders` registered (fixed list since Task 3)
- Sidebar nav link `/orders` already exists and is permission-gated
- `activityLogger.ts` already has `orders: 'Order'` in `TARGET_TYPE_MAP` and `order.status_changed` in `STATE_TRANSITION_RULES`
- `ActivityLog` model exists and the global middleware handles logging for this module's mutations automatically

### Puppeteer / PDF Utility — `backend/src/lib/pdf.ts`

This file exists as a placeholder from Task 0. Make it real:

```ts
import puppeteer from 'puppeteer';

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
```

The bill template calls `renderPdf(billHtml)` to generate the PDF. See also `TEST_CASES.md` ORD-H-09 (valid PDF binary, `application/pdf` content-type).

### Bill Template — server-side HTML string

Create a `renderBillHtml(order)` function in `orders.service.ts` (or a separate `orders.bill.ts` file — choose whichever keeps the service file focused). The function takes a populated `Order` document and returns an HTML string:

```ts
function renderBillHtml(order: PopulatedOrder): string {
  const lineItems = order.items.map(item => `
    <tr>
      <td>${escapeHtml(item.nameSnapshot)}</td>
      <td style="text-align: center">${item.quantity}</td>
      <td style="text-align: right">${formatBdt(item.priceSnapshot)}</td>
      <td style="text-align: right">${formatBdt(item.lineTotal)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bill - ${order.orderNumber}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 16px; }
  h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
  .meta { text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; }
  td { padding: 4px 0; }
  .total-row td { border-top: 1px dashed #000; padding-top: 8px; font-weight: bold; }
  .footer { text-align: center; margin-top: 24px; font-size: 10px; }
</style></head><body>
<h1>${escapeHtml(restaurantName)}</h1>
<div class="meta">
  <p>${order.orderNumber}</p>
  <p>${formatDate(order.createdAt)}</p>
  <p>${order.orderType}${order.tableNumber ? ` · Table ${order.tableNumber}` : ''}</p>
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
  <tbody>${lineItems}</tbody>
  <tfoot>
    <tr><td colspan="3" style="text-align: right">Subtotal</td><td style="text-align: right">${formatBdt(order.subtotal)}</td></tr>
    ${order.discountAmount > 0 ? `<tr><td colspan="3" style="text-align: right">Discount</td><td style="text-align: right">-${formatBdt(order.discountAmount)}</td></tr>` : ''}
    <tr class="total-row"><td colspan="3" style="text-align: right">Grand Total</td><td style="text-align: right">${formatBdt(order.grandTotal)}</td></tr>
  </tfoot>
</table>
<div class="meta" style="margin-top: 16px">
  <p>Paid: ${order.payment.method.toUpperCase()}${order.payment.splits ? ' · ' + order.payment.splits.map(s => s.method.toUpperCase() + ' ' + formatBdt(s.amount)).join(' + ') : ''}</p>
</div>
${order.customerId ? `<p>Customer: ${escapeHtml(typeof order.customerId === 'object' ? order.customerId.name : '')}</p>` : ''}
<p style="margin-top: 24px; text-align: center">Thank you!</p>
</body></html>`;
}
```

- `escapeHtml` — basic HTML entity escape (prevents product name injection into the template)
- `formatBdt` — `৳${n.toFixed(2)}` matching POS's money format
- `formatDate` — locale-friendly date string
- The `<style>` block uses **inline styles in the HTML** (not Tailwind, not a CSS-in-JS solution — Puppeteer doesn't load external resources by default and the PDF path has no JS runtime)
- A `<link>` to the restaurant's font or Cloudinary-hosted logo could be added later; for v1, keep it plain monospace (the "receipt printer" aesthetic is standard for restaurant bills)

### Verification

- `tsc --noEmit` passes clean on both apps
- `npm run dev` — full flow works end to end:
  - Can browse orders (after creating one via POS first)
  - Can filter by status, date range, search `orderNumber`
  - Can view full order detail with populated customer/staff names
  - Can edit `tableNumber`, `orderType`, `customerId`
  - Can transition status: `pending → completed`, `pending → cancelled`, `completed → cancelled`
  - Can cancel an order with a reason (both from pending and completed)
  - Can view/print/download bill as HTML and PDF
  - Can delete a same-day, pending, no-coupon order
- Run the relevant `TEST_CASES.md` §6 (Orders) cases explicitly — at minimum:
  - **Happy paths:** ORD-H-01 through ORD-H-05 (list, filter, search, detail, edit customerId)
  - **Happy status transitions:** ORD-H-06 through ORD-H-08
  - **Validation:** ORD-V-01 (reject items edit), ORD-V-02 (cancel reason required)
  - **Security:** ORD-S-01 (reject financial field edit), ORD-AUTH-01 (permission gating)
  - **Errors:** ORD-E-01 (not found), ORD-E-02/03 (invalid transitions)
  - **Bill:** ORD-H-09 (PDF binary, correct content-type), ORD-H-10 (HTML renders), ORD-E-04 (not found)
  - **Delete:** ORD-DEL-01 through ORD-DEL-05 (happy + all rejection cases + day boundary)
  - **Real-time:** ORD-RT-01 (confirm `order:statusChanged` fires, observable from a second connected client)
  - **Mobile:** ORD-MOB-01 (list degrades to cards, detail actions remain reachable)
