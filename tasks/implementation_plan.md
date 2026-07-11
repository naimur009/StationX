# Implementation Plan — QA Fix Batch 2026-07-11

## Cross-Module Fixes (do these first)

### CM-FIX-01: Reports byProduct uses live `$lookup` violating snapshot-pricing rule
1. **Issue ID:** `CM-FIX-01` — Cross-Module → `reports.helper.ts`, `Order` model, `pos.service.ts`, `orders.service.ts`. Traces to `DATABASE.md` §5.3, `AI_rules.md` §3.
2. **Severity:** Blocking
3. **Root cause:** `reports.helper.ts:97-118` does a `$lookup` from `Order.items.productId` into live `products` and `categories` collections to resolve category names. If a product is renamed or a category is renamed/deleted, historical reports silently show the *current* name instead of the name *at order time* — directly violating `DATABASE.md` §5.3 ("The single most important data-integrity rule").
4. **Doc(s) affected:** `database.md` §3.8 (OrderItem schema needs `categorySnapshot` field), `API.md` §19 (report response — no shape change but describe that category names come from snapshot), `decision.md` (new entry documenting the schema addition)
5. **Files to touch:** `backend/src/models/Order.ts` (add `categorySnapshot: String` to `IOrderItem` + `orderItemSchema`); `backend/src/modules/pos/pos.service.ts` (resolve and store `categorySnapshot` at creation); `backend/src/modules/orders/orders.service.ts` (resolve and store at item edit); `backend/src/modules/reports/reports.helper.ts` (replace `$lookup` with `$items.categorySnapshot` in `byProduct` and `byCategory` pipelines)
6. **Fix approach:** (a) Add `categorySnapshot: { type: String }` to `orderItemSchema` in `Order.ts`; (b) in `pos.service.ts` `createOrder`, after resolving categories for VAT calculation, also set `items[].categorySnapshot` to the resolved category name (fallback `'Uncategorized'`); (c) in `orders.service.ts` `updateOrder`, do the same for new items; (d) in `reports.helper.ts`, replace the `$lookup` → `$unwind` → `$addFields { category: '$category.name' }` pattern in `byProduct` and `byCategory` with direct access to `$items.categorySnapshot` with `$ifNull` fallback to `'Uncategorized'` for legacy orders; (e) create migration script to backfill `categorySnapshot` on existing orders (reads from Category via productId)
7. **Test cases this fix must make pass:** `XMOD-01`, `XMOD-02` (historical stability). Add `REP-CALC-02`: "rename a Category after orders exist, verify report still shows old category name."
8. **Risk / side effects:** Adding a field to `OrderItem` (embedded) is safe — existing orders without it get the `$ifNull` fallback. The migration script is read-only heavy (iterates all Orders); run during low-traffic window.
9. **Estimated effort:** M

### CM-FIX-02: POS validation schema accepts client-submitted financial fields
1. **Issue ID:** `CM-FIX-02` — Cross-Module → `pos.validation.ts`. Traces to `AI_rules.md` §3, `API.md` §9.3.
2. **Severity:** Blocking
3. **Root cause:** `pos.validation.ts:26-29` lists `discountAmount`, `taxAmount`, `subtotal`, `grandTotal` as accepted optional fields. Per `AI_rules.md` §3 ("Never trust client-submitted totals"), these must be rejected/stripped at the validation boundary, not merely ignored by the service layer. A malicious or buggy client could pass them in and create confusion (they are ignored server-side, but the response envelope is misleading).
4. **Doc(s) affected:** `API.md` §9.3 (request body already lists only what clients should send — no change needed), `decision.md` (note that validation boundary was tightened)
5. **Files to touch:** `backend/src/modules/pos/pos.validation.ts` (remove the 4 financial fields from `createOrderSchema`)
6. **Fix approach:** Delete `discountAmount`, `taxAmount`, `subtotal`, `grandTotal` from the Zod schema. The service already ignores them; this change makes it impossible for a client to send them through validation.
7. **Test cases this fix must make pass:** `POS-S-02`, `POS-S-03`, `CC-VAL-04`
8. **Risk / side effects:** Zero — removing fields from a Zod schema with `.stripUnknown` unknown handling (default) means they're silently dropped, not rejected. If `.strict()` is ever added to the schema, they would cause 400 errors.
9. **Estimated effort:** S

### CM-FIX-03: Socket event names and emissions mismatch API.md §22
1. **Issue ID:** `CM-FIX-03` — Cross-Module → `pos.service.ts`, `orders.service.ts`, frontend socket listeners. Traces to `API.md` §22, `AI_rules.md` §7.
2. **Severity:** Blocking
3. **Root cause:** Three mismatches between code and `API.md` §22: (a) POS emits `pos:order_created` (wrong name — should be `order:created`); (b) Orders emits `order:updated` (not in API.md at all); (c) neither POS order creation nor payment capture emit `dashboard:metricsInvalidate` as required by `API.md` §22.
4. **Doc(s) affected:** `API.md` §22 (add `order:updated` event to the table if it should be a stable event, or confirm it should be removed from code). `AI_rules.md` §7 (no change — rule already says "check §22 first").
5. **Files to touch:** `backend/src/modules/pos/pos.service.ts` (rename emit, add `dashboard:metricsInvalidate`); `backend/src/modules/orders/orders.service.ts` (rename `order:updated` to appropriate event, add `dashboard:metricsInvalidate` to payment-capture path); `frontend/src/features/orders/api.ts` (update socket listener key if frontend listens to any of these); `frontend/src/features/dashboard/api.ts` (add `dashboard:metricsInvalidate` listener)
6. **Fix approach:** (a) In `pos.service.ts:241`, change `getIO().emit('pos:order_created', ...)` → `getIO().emit('order:created', ...)` AND add `getIO().emit('dashboard:metricsInvalidate');` right after; (b) In `orders.service.ts:584`, change `getIO().emit('order:updated', ...)` → if status changed, emit `order:statusChanged`; if items changed and order is completed, emit `order:itemsUpdated`; if payment captured, emit `order:paid` + `dashboard:metricsInvalidate`; (c) In `order:paid` emission block, add `dashboard:metricsInvalidate` emit.
7. **Test cases this fix must make pass:** `POS-RT-01`, `ORD-RT-01`, `CC-RT-01`
8. **Risk / side effects:** Frontend socket listeners keyed on `pos:order_created` will break until updated. Deploy backend + frontend changes in same batch or add a backward-compatibility emit (both `pos:order_created` and `order:created` for one release cycle).
9. **Estimated effort:** S

### CM-FIX-04: `authorize` array-form for POS catalog route is a security concern
1. **Issue ID:** `CM-FIX-04` — Cross-Module → `pos.routes.ts` line 18. Traces to `API.md` §24, `AI_rules.md` §5.
2. **Severity:** Blocking
3. **Root cause:** `GET /pos/catalog` uses `authorize(['pos', 'orders'], 'view')`, meaning a user with `orders:view` but WITHOUT `pos:view` can still see the POS product catalog. Per `API.md` §24, the POS catalog requires `pos:view`. The `orders` module permission should not implicitly grant POS catalog access.
4. **Doc(s) affected:** `API.md` §9.1 (no change needed — already specifies `pos:view`)
5. **Files to touch:** `backend/src/modules/pos/pos.routes.ts` (change `authorize(['pos', 'orders'], 'view')` → `authorize('pos', 'view')`)
6. **Fix approach:** Remove `'orders'` from the array. The POS catalog is a POS-specific route, not an Orders module concern.
7. **Test cases this fix must make pass:** `POS-AUTH-01`, `CC-AUTH-06`, `CC-AUTH-07`
8. **Risk / side effects:** Any user who previously relied on `orders:view` to browse the POS catalog will lose that access. Audit existing permission configurations before deploying.
9. **Estimated effort:** S

### CM-FIX-05: API.md §24 out of sync with code (activity-log delete, salary key)
1. **Issue ID:** `CM-FIX-05` — Cross-Module → `API.md` §24, `backend/src/shared/constants.ts`, `frontend/src/lib/constants.ts`. Traces to `decision.md` [19] and [Salary — Independent Dashboard Section].
2. **Severity:** Non-blocking
3. **Root cause:** `API.md` §24 table shows `activity-log: view` only — missing the `delete` action that was added by `decision.md` [19]. Also, `backend/src/shared/constants.ts` includes `salary` module key which is not listed in `API.md` §24.
4. **Doc(s) affected:** `API.md` §24 (two rows to update)
5. **Files to touch:** `docs/API.md` §24 (activity-log: add `delete` action; salary: add row with "reserved" note)
6. **Fix approach:** (a) Change `activity-log` action cell from `view` to `view, delete`; (b) Add new row `salary | view, create, edit, delete | Reserved — not used by any backend route in v1. Listed for forward compatibility.`
7. **Test cases this fix must make pass:** None (doc alignment). Verify against `LOG-CLR-01`.
8. **Risk / side effects:** None — doc only.
9. **Estimated effort:** S

### CM-FIX-06: API.md §10 description of PUT /orders/:id out of date
1. **Issue ID:** `CM-FIX-06` — Cross-Module → `API.md` §10. Traces to `implementation_plan.md` Task 5.
2. **Severity:** Non-blocking
3. **Root cause:** `API.md` §10 describes `PUT /orders/:id` as "intentionally narrow: only `tableNumber`, `orderType`, and `customerId` are editable." The approved implementation plan widened this to support `items`, `payment`, `discountPercent`, `cashTendered`. The doc was not updated to reflect the widening.
4. **Doc(s) affected:** `API.md` §10 (rewrite the "Restricted edit" paragraph)
5. **Files to touch:** `docs/API.md` §10
6. **Fix approach:** Replace the "intentionally narrow" paragraph with: "Accepts `tableNumber`, `customerId`, `items`, `payment`, `discountPercent`, `cashTendered`, `changeAmount`. `items` replacement triggers server-side recalculation of all financial fields (subtotal, tax, discount, grandTotal). Items are editable until `paymentStatus` becomes `paid`; once paid, any attempt to edit financial fields returns `400 ORDER_ALREADY_PAID`. `tableNumber` and `customerId` remain editable even after payment."
7. **Test cases this fix must make pass:** None (doc update). Verify against `ORD-S-01`, `ORD-H-05`, `ORD-V-01`.
8. **Risk / side effects:** None — doc only.
9. **Estimated effort:** S

---

## Per-Module Fixes

### POS Module

#### POS-FIX-01: Coupon validation endpoint is `GET /pos/coupon` not `POST /pos/coupons/validate`
1. **Issue ID:** `POS-FIX-01` — POS → `pos.routes.ts`, `pos.controller.ts`, `pos.service.ts`, `pos.validation.ts`. Traces to `API.md` §9.2, `TEST_CASES.md` POS-H-04 through POS-INT-01.
2. **Severity:** Blocking
3. **Root cause:** `API.md` §9.2 specifies `POST /pos/coupons/validate` with `{ code, subtotal, customerId }` in the request body. The actual implementation is `GET /pos/coupon?code=` — different HTTP method, different path, different request shape. The response also differs: API spec says `{ valid: true/false, reason, ... }` but code returns `{ type, value, couponId }` or throws 404. This is a complete contract violation — no part of the existing endpoint matches the spec.
4. **Doc(s) affected:** `API.md` §9.2 (no change — code must catch up to spec)
5. **Files to touch:** `backend/src/modules/pos/pos.validation.ts` (add `validateCouponSchema`), `backend/src/modules/pos/pos.controller.ts` (add/replace `handleValidateCoupon`), `backend/src/modules/pos/pos.service.ts` (add `validateCoupon` with full validation), `backend/src/modules/pos/pos.routes.ts` (replace route), `frontend/src/features/pos/api.ts` (update frontend call)
6. **Fix approach:** (a) Create `validateCouponSchema` in `pos.validation.ts`: `z.object({ code: z.string(), subtotal: z.number().nonnegative().multipleOf(0.01), customerId: z.string().optional() }).strict()` (matching API.md §9.2); (b) Create `handleValidateCoupon` in controller that calls `posService.validateCoupon(dto)`; (c) Replace `posService.getCouponDiscount` with `posService.validateCoupon` that returns the full API.md §9.2 response envelope: `{ valid: true, couponId, discountType, value, discountAmount }` for valid coupons, and `{ valid: false, reason }` for all failure modes (`NOT_FOUND | DISABLED | NOT_YET_VALID | EXPIRED | BELOW_MIN_ORDER | USAGE_LIMIT_REACHED`); (d) The route changes from `GET /pos/coupon` → `POST /pos/coupons/validate` with `authorize('pos', 'view')` (it's a read-only preview); (e) Update frontend `api.ts` hook to call the new route.
7. **Test cases this fix must make pass:** `POS-H-04`, `POS-E-03` through `POS-E-09`, `POS-INT-01`, `POS-V-01`. Add `POS-H-12` for happy path with percentage + maxDiscountAmount cap.
8. **Risk / side effects:** Removing the old `GET /pos/coupon` route and old `getCouponDiscount` service method breaks any frontend code that calls them. Must update frontend in the same batch. The old POS checkout flow currently calls `GET /pos/coupon` — this will break until the frontend is also updated.
9. **Estimated effort:** M

#### POS-FIX-02: Default order status is `completed` instead of `pending`
1. **Issue ID:** `POS-FIX-02` — POS → `pos.service.ts` line 218. Traces to `API.md` §9.3, `implementation_plan.md` D1/D4.
2. **Severity:** Blocking
3. **Root cause:** `pos.service.ts:218` has `status: rest.status || 'completed'`. The approved implementation plan specifies that default status should be `'pending'` (pay-after-delivery model). The `API.md` §9.3 also shows `"status": "pending"` in the example request and response. The code never made this change during the POS pay-later implementation.
4. **Doc(s) affected:** `API.md` §9.3 (no change — spec already says pending)
5. **Files to touch:** `backend/src/modules/pos/pos.service.ts` line 218 (change `'completed'` → `'pending'`); line 220 `completedAt` logic accordingly (only set when status is explicitly `'completed'`)
6. **Fix approach:** Change `status: rest.status || 'completed'` → `status: rest.status || 'pending'`. Change the `completedAt` logic from `...(rest.status === 'completed' || !rest.status ? { completedAt: new Date() } : {})` to `...(rest.status === 'completed' ? { completedAt: new Date() } : {})`.
7. **Test cases this fix must make pass:** `POS-H-05` (no coupon, no status → `status` defaults to `pending`), `POS-H-08` (`"status": "pending"` explicitly passed → created as `pending`). `POS-H-06` (order with coupon, default pending). Verify `DASH-H-03` still passes (revenue aggregation filters by `completed + paid`, not by status alone).
8. **Risk / side effects:** All existing POS-aware frontend code that assumes orders default to `completed` will need updating. The Orders list, Dashboard, and Reports all filter by `status: 'completed'` for revenue — this is correct (they filter by `status + paymentStatus`), but the default change means newly placed orders won't appear as "completed" until explicitly transitioned.
9. **Estimated effort:** S

#### POS-FIX-03: POS catalog payload includes more fields than specified
1. **Issue ID:** `POS-FIX-03` — POS → `pos.service.ts` lines 47-55. Traces to `API.md` §9.1, `TEST_CASES.md` POS-H-01.
2. **Severity:** Non-blocking
3. **Root cause:** `API.md` §9.1 specifies the POS catalog returns a lean payload: `id, name, price, image.url, categoryId`. The current `getCatalog()` returns `id, name, price, image` (full image object with `url` and `publicId`), `category`, `categoryId`, `vatRate`. The extra fields (`publicId`, `category` name, `vatRate`) are unnecessary for the POS grid and increase payload size — contradicting the "fast loading for POS" NFR and the explicit spec of a separate lean route.
4. **Doc(s) affected:** None (API.md spec is correct — code is bloated)
5. **Files to touch:** `backend/src/modules/pos/pos.service.ts` (trim the returned fields)
6. **Fix approach:** Change `getCatalog()` return to match `API.md` §9.1: `{ id, name, price, image: { url: p.image?.url || null }, categoryId }`. Remove `vatRate` (not needed by POS grid), `category` name (not in spec), and `image.publicId` (admin-only concern).
7. **Test cases this fix must make pass:** `POS-H-01` (lean payload), `CC-MOB-06` (fast loading on throttled connection)
8. **Risk / side effects:** Any frontend POS code that reads `product.image.publicId` or `product.vatRate` or `product.category` (name) will break. Check POS frontend components before deploying.
9. **Estimated effort:** S

### Orders Module

#### ORD-FIX-01: `listOrders` does not support `paymentStatus` filter
1. **Issue ID:** `ORD-FIX-01` — Orders → `orders.service.ts`, `orders.validation.ts`. Traces to `TEST_CASES.md` ORD-H-02, `implementation_plan.md` Task 10.
2. **Severity:** Blocking
3. **Root cause:** The implementation plan (Task 10) says the Orders list should show a `paymentStatus` column and filter. The `listOrdersQuerySchema` (validation) doesn't accept a `paymentStatus` filter param, and `listOrders` (service) doesn't filter by it. The `paymentStatus` field exists on the model and is returned in responses, but users cannot filter the list by `unpaid`/`paid`.
4. **Doc(s) affected:** `API.md` §10 (add `paymentStatus` to Orders list query params table)
5. **Files to touch:** `backend/src/modules/orders/orders.validation.ts` (add `paymentStatus: z.enum(['unpaid', 'paid']).optional()`), `backend/src/modules/orders/orders.service.ts` (add `paymentStatus` filter logic in `listOrders`)
6. **Fix approach:** (a) Add `paymentStatus` field to `listOrdersQuerySchema`; (b) In `listOrders`, add `if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;`
7. **Test cases this fix must make pass:** `ORD-H-02` (orders list with status + date filter — add `paymentStatus` variant). Add `ORD-H-11`: "List orders filtered by `paymentStatus=unpaid` returns only unpaid orders."
8. **Risk / side effects:** None — additive, non-breaking.
9. **Estimated effort:** S

#### ORD-FIX-02: Payment capture does not validate non-cash payment methods
1. **Issue ID:** `ORD-FIX-02` — Orders → `orders.service.ts` lines 637-641. Traces to `API.md` §10, `TEST_CASES.md` POS-H-07.
2. **Severity:** Non-blocking
3. **Root cause:** `updateOrderStatus` validates `cashTendered >= grandTotal` for `cash` payment but does NOT validate that `card`/`bkash`/`nagad` payment methods have the required fields (e.g., `transactionId` for card). The schema allows `payment.method: 'card'` with no `transactionId`, which is operationally incomplete even if technically valid.
4. **Doc(s) affected:** `API.md` §9.3 (add note about `transactionId` requirement for card/bkash/nagad)
5. **Files to touch:** `backend/src/modules/orders/orders.validation.ts` (add refinement for non-cash methods), `backend/src/modules/orders/orders.service.ts` (add validation for non-cash methods)
6. **Fix approach:** (a) In `updateOrderStatusSchema`, add refinement: `if (payment.method !== 'cash' && !payment.transactionId) → fail`; (b) In `updateOrderStatus` service, mirror the same check defensively.
7. **Test cases this fix must make pass:** `POS-H-07` (split payment still works — unaffected). Add `ORD-V-03`: "Marking order as paid with `method: 'card'` but no `transactionId` returns 400."
8. **Risk / side effects:** Existing orders paid via card without transactionId will still be fine (this only affects new payment captures).
9. **Estimated effort:** S

### Dashboard Module

#### DASH-FIX-01: Missing `Cache-Control` header
1. **Issue ID:** `DASH-FIX-01` — Dashboard → `dashboard.service.ts`, `dashboard.controller.ts`. Traces to `API.md` §7, `TEST_CASES.md` DASH-CACHE-01.
2. **Severity:** Non-blocking
3. **Root cause:** `API.md` §7 specifies "responses carry `Cache-Control: private, max-age=15`". The dashboard service and controller do not set this header.
4. **Doc(s) affected:** None
5. **Files to touch:** `backend/src/modules/dashboard/dashboard.controller.ts` (set `Cache-Control` header before sending response)
6. **Fix approach:** In both `handleGetMetrics` and `handleGetTopItems`, add `res.setHeader('Cache-Control', 'private, max-age=15');` before `res.json(...)`.
7. **Test cases this fix must make pass:** `DASH-CACHE-01`
8. **Risk / side effects:** None
9. **Estimated effort:** S

### Reports Module

#### REP-FIX-01: Salary filtering in profit report uses `createdAt` instead of `month`/`year`
1. **Issue ID:** `REP-FIX-01` — Reports → `reports.service.ts` lines 106-108. Traces to `API.md` §20, `DATABASE.md` §3.12.
2. **Severity:** Non-blocking
3. **Root cause:** The profit report filters Salary records by `createdAt: { $gte: dateRange.from, $lte: dateRange.to }`. But Salary records have dedicated `month` (1-12) and `year` fields that represent the accounting period. Filtering by `createdAt` can include/exclude salaries that are in a different period than intended — e.g., a salary created on July 5 for the June period would be included in a July report but excluded from June.
4. **Doc(s) affected:** `API.md` §20 (no shape change, but note that salary period matching uses `month`/`year` not `createdAt`)
5. **Files to touch:** `backend/src/modules/reports/reports.service.ts` (change profit report salary filtering)
6. **Fix approach:** Replace `createdAt` range filter with month/year range filter. For a report covering June 1-June 30, filter salaries with `{ month: 6, year: 2026 }` instead of a date range. For cross-month reports (e.g., "Last 30 Days"), include salaries whose month/year falls within the range: `{ $or: [ { year: fromYear, month: { $gte: fromMonth } }, { year: toYear, month: { $lte: toMonth } } ] }`.
7. **Test cases this fix must make pass:** `REP-CALC-01` (profit calculation accuracy for salary). Add `REP-CALC-03`: "Profit report for June includes a salary created on July 1st but with month=6, year=2026."
8. **Risk / side effects:** Changes profit calculation — if any existing reports depend on the createdAt-based filtering, they will see different numbers after this fix. Communicate to stakeholders.
9. **Estimated effort:** S

### Activity Log Module

#### LOG-FIX-01: `DELETE /activity-log` route may not exist
1. **Issue ID:** `LOG-FIX-01` — Activity Log → `activity-log.routes.ts`. Traces to `API.md` §21, `TEST_CASES.md` LOG-CLR-01–04.
2. **Severity:** Blocking
3. **Root cause:** I cannot confirm the `DELETE /activity-log` route exists without reading the route file. If it was never implemented despite being documented in `API.md` §21 and `decision.md` [19], that's a missing feature.
4. **Doc(s) affected:** `API.md` §21 (if route doesn't exist)
5. **Files to touch:** `backend/src/modules/activity-log/` (route, controller, service files)
6. **Fix approach:** Check if `DELETE /activity-log` exists in `activity-log.routes.ts`. If not, implement it: controller calls `ActivityLog.deleteMany({})`, service returns `{ data: { success: true } }`, route wired with `authenticate` + `authorize('activity-log', 'delete')`.
7. **Test cases this fix must make pass:** `LOG-CLR-01` through `LOG-CLR-04`
8. **Risk / side effects:** None — additive.
9. **Estimated effort:** S (or already done — verify first)

#### LOG-FIX-02: ActivityLog model not in sync with `API.md` §21 response shape
1. **Issue ID:** `LOG-FIX-02` — Activity Log → `database.md` §3.14. Traces to `API.md` §21.
2. **Severity:** Non-blocking
3. **Root cause:** `API.md` §21 response includes `targetId` and `targetType` fields. The `database.md` §3.14 describes these as optional. If the `activityLogger` middleware doesn't populate `targetId` and `targetType` consistently, the response may have gaps.
4. **Doc(s) affected:** None (defensive check)
5. **Files to touch:** `backend/src/middleware/activityLogger.ts` (if `targetId`/`targetType` missing)
6. **Fix approach:** Verify `activityLogger` always sets `targetId` and `targetType`. If not, extract route params/decode request body to populate them.
7. **Test cases this fix must make pass:** `LOG-INT-01`, `LOG-H-02`
8. **Risk / side effects:** Minimal
9. **Estimated effort:** S

### Frontend Issues

#### FE-FIX-01: Frontend POS checkout still assumes pay-first model
1. **Issue ID:** `FE-FIX-01` — Frontend POS → `frontend/src/app/(dashboard)/pos/page.tsx`, `frontend/src/features/pos/api.ts`, `store.ts`. Traces to `implementation_plan.md` Task 9.
2. **Severity:** Blocking
3. **Root cause:** The POS frontend likely still shows the payment step (method selector, cash tendered) as mandatory during order creation, matching the old pay-first model. The Pay-later implementation plan (Task 9) specifies removing payment from the primary flow and adding a "Place Order" (no payment) vs "Pay Now" (with payment) toggle.
4. **Doc(s) affected:** None
5. **Files to touch:** `frontend/src/app/(dashboard)/pos/page.tsx`, `frontend/src/features/pos/api.ts`, `frontend/src/features/pos/store.ts`, `frontend/src/features/pos/components/Cart.tsx`
6. **Fix approach:** (a) Remove `payment` field from the create-order mutation payload as mandatory; (b) Add a toggle: "Place Order" (no payment, `paymentStatus: unpaid`) vs "Pay Now" (with payment fields); (c) Update the POS store to track whether payment is being collected at order time; (d) Keep legacy `PaymentMethodSelector` for the "Pay Now" path.
7. **Test cases this fix must make pass:** `POS-H-05` (valid order with no payment), `POS-MOB-01` (full order flow on tablet)
8. **Risk / side effects:** Staff workflow changes — orders are now placed unpaid by default and paid later in Orders page. Need training/communication.
9. **Estimated effort:** M

#### FE-FIX-02: Frontend Orders list missing `paymentStatus` column and filter
1. **Issue ID:** `FE-FIX-02` — Frontend Orders → `frontend/src/features/orders/components/OrderList.tsx`. Traces to `implementation_plan.md` Task 10.
2. **Severity:** Non-blocking
3. **Root cause:** The frontend Orders list doesn't show `paymentStatus` as a column or offer a filter dropdown. The implementation plan specifies both.
4. **Doc(s) affected:** None
5. **Files to touch:** `frontend/src/features/orders/api.ts` (add `paymentStatus` query param), `frontend/src/features/orders/components/OrderList.tsx` (add column + filter), `frontend/src/features/orders/components/OrderFilters.tsx` (add paymentStatus filter dropdown)
6. **Fix approach:** (a) Add `paymentStatus` column to OrderList table with badge color (green=paid, yellow=unpaid); (b) Add paymentStatus filter dropdown alongside existing status filter; (c) Add query param to the list query hook.
7. **Test cases this fix must make pass:** None (UI only). Verify `ORD-MOB-01` still passes.
8. **Risk / side effects:** None
9. **Estimated effort:** S

#### FE-FIX-03: Frontend Orders detail page missing payment capture UI
1. **Issue ID:** `FE-FIX-03` — Frontend Orders → `frontend/src/features/orders/components/OrderDetail.tsx`. Traces to `implementation_plan.md` Task 10.
2. **Severity:** Non-blocking
3. **Root cause:** The Orders detail page needs a "Mark as Paid" button for unpaid orders, `paymentStatus` badge display, and the `OrderPaymentCaptureDialog` component.
4. **Doc(s) affected:** None
5. **Files to touch:** `frontend/src/features/orders/components/OrderDetail.tsx`, `frontend/src/features/orders/components/OrderPaymentCaptureDialog.tsx` (already exists per exploration), `frontend/src/features/orders/api.ts` (payment capture mutation)
6. **Fix approach:** (a) Verify `OrderPaymentCaptureDialog.tsx` exists and is wired; (b) Show `paymentStatus` badge in OrderDetail header; (c) Show "Mark as Paid" button when `paymentStatus: 'unpaid'`; (d) Wire the button to the PATCH mutation.
7. **Test cases this fix must make pass:** None (UI verification)
8. **Risk / side effects:** None — these components may already be implemented.
9. **Estimated effort:** S (or already done — verify first)

---

## Suggested Execution Order

| Order | Issue ID | Reason |
|-------|----------|--------|
| 1 | `CM-FIX-02` | Smallest fix, lowest risk — removes accepted fields from Zod schema. Unblocks all other POS-related fixes by tightening validation. |
| 2 | `CM-FIX-04` | Security fix — tighten POS catalog authorization. Small change, high impact. Roll first before any POS refactoring. |
| 3 | `CM-FIX-01` | Snapshot-pricing violation that creates data integrity debt with every new order. Fix early so new orders get `categorySnapshot` before the reports helper refactor. |
| 4 | `CM-FIX-03` | Socket event naming must be correct before frontend listens for events. Blocks `POS-FIX-01` (frontend depends on event names). |
| 5 | `CM-FIX-05` + `CM-FIX-06` | Doc changes — can be done in parallel, zero risk, fast wins. |
| 6 | `POS-FIX-02` | Changes default `status` — affects how POS creates orders. Must be done before frontend POS refactor (`FE-FIX-01`). |
| 7 | `POS-FIX-01` | Full coupon validation endpoint rewrite — the biggest single backend change. Depends on `CM-FIX-02` (schema) and `CM-FIX-03` (events). |
| 8 | `POS-FIX-03` | Leaner catalog payload — small change, depends on nothing. |
| 9 | `ORD-FIX-01` | Add `paymentStatus` filter — small additive change. Can be done independently. |
| 10 | `ORD-FIX-02` | Payment method validation — small additive change. Depends on nothing. |
| 11 | `REP-FIX-01` | Salary period filtering — depends on `CM-FIX-01` (snapshot fix) being done first for consistency. |
| 12 | `DASH-FIX-01` | Cache header — trivial, independent. |
| 13 | `LOG-FIX-01` + `LOG-FIX-02` | Activity Log — verify/implement routes. Independent. |
| 14 | `FE-FIX-01` | Frontend POS refactor — depends on `POS-FIX-02` (default status) and `CM-FIX-03` (events). Largest frontend change. |
| 15 | `FE-FIX-02` + `FE-FIX-03` | Frontend Orders UI — depends on `ORD-FIX-01` (backend filter) and `CM-FIX-03` (events). |

---

## Decisions Needed Before Starting

1. **`salary` module key — keep or remove?** (`CM-FIX-05`)
   - `backend/src/shared/constants.ts` includes `salary` module key. `API.md` §24 doesn't list it. The `decision.md` says it's "retained for forward compatibility." Option A: Add to `API.md` §24 as "reserved." Option B: Remove from backend constants (requires migrating any user permission rows that include `salary`). Option A is zero-risk; Option B is cleaner but has a migration cost. **Recommend Option A.**

2. **Backward-compatible socket events vs hard rename?** (`CM-FIX-03`)
   - The event name change from `pos:order_created` → `order:created` will break any frontend client that hasn't been updated. If deploying backend and frontend in separate releases, consider emitting BOTH old and new event names for one release cycle as a migration path. **Recommend:** emit both for one cycle, remove old event name in the next.

3. **`completedAt` auto-set on `completed` status — should it also be auto-set on `paid`?** (`POS-FIX-02`)
   - Current code sets `completedAt` when `status: 'completed'`. With the new default of `'pending'`, an order could be in `status: 'pending', paymentStatus: 'paid'`. Should `completedAt` be set when `paymentStatus` transitions to `paid`? The implementation plan D1 says "two independent axes" — so `completedAt` relates to fulfillment status, not payment. **Confirm this interpretation:** `completedAt` stays tied to `status: 'completed'`, not `paymentStatus`.

4. **Category snapshot for legacy orders — what fallback to use?** (`CM-FIX-01`)
   - Existing orders (before this fix) won't have `categorySnapshot` on their items. The reports helper must handle missing snapshots. Options: (a) `$ifNull: ['$categorySnapshot', 'Uncategorized']` (best effort, some historical data loses category grouping), (b) live lookup as fallback (defeats the purpose), (c) backfill migration that iterates all orders and resolves category names. **Recommend option (a) for speed + option (c) as a background migration for complete coverage.**
