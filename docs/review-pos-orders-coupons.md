# Code Review — POS, Orders, Coupons

**Date:** 2026-08-13
**Scope:** `backend/src/modules/{pos,orders,coupons}/`, `backend/src/models/{Order,Coupon,Table}.ts`, `frontend/src/features/{pos,orders,coupons}/`, related middleware/lib.
**Baseline docs:** `AI_rules.md` (binding), `architecture.md` §9, `database.md` §3/§4/§5, `API.md` §2/§9/§10/§12/§23/§25/§26/§27/§28, `decision.md`, `theme.md`.
**Method:** manual code review against the docs; each finding lists severity, exact location, violated rule/doc section, and a one-line fix. Findings whose resolution is ambiguous require a decision per `AI_rules.md` §12.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 (C1, C2 resolved 2026-08-13 — see sections) |
| High | 9 |
| Medium | 12 |
| Low | 8 |
| §12 prompt-conflict flags | 4 |

## Verified clean (settled decisions and upheld conventions)

- Settled `decision.md` entries are implemented and were **not** re-litigated: dual socket emit `pos:order_created` + `order:created` (CM-FIX-03), `categorySnapshot` on items (CM-FIX-01), POST-based coupon validation (POS-FIX-01), default `pending` status with `completedAt` set only on explicit completion (POS-FIX-02), `paymentStatus` list filter (ORD-FIX-01), `completed → cancelled` allowed at `orders:edit` (API.md §28.2), narrowed order delete, per-category VAT with informational `taxAmount` (`grandTotal = subtotal - discountAmount`), `tableId`/`tableLabelSnapshot` on Order responses, hard-delete coupons, `table:statusChanged` emitted after commit.
- Every protected route uses `authenticate` + `authorize(module, action)`; module keys `pos`/`orders`/`coupons` match `API.md` §27 and `backend/src/shared/constants.ts`.
- Central `errorHandler` only; response envelope `{data}` / `{error:{code,message}}`; strict Zod schemas with `.strict()`; pagination capped (`page` ≤ 1000, `limit` ≤ 100).
- Table model matches `database.md` §3.3; Coupon index `{isEnabled, validUntil}` matches; coupon `computeStatus` matches `API.md` §12.
- `pos.controller.ts:83` sets `req.skipActivityLog = true` before the ActivityLog write inside the order-creation transaction — the correct pattern per `database.md` §5.1. (Orders status path does not follow it — see H7.)
- No hardcoded hex colors in reviewed FE directories; `PermissionGate` present on pos/orders/coupons pages and on `OrderDetail` delete (`OrderDetail.tsx:104`).
- `OrderCancelDialog.tsx` mirrors the BE `cancelReason` 3–500 validation.

---

## Critical

### C1 — Table double-booking race: check outside the transaction, write unconditional
- **Location:** `backend/src/modules/pos/pos.service.ts:253-265` (guard) and `:318-324` (in-transaction booking write).
- **Rule:** `database.md` §5.9 — "the check happens **inside the order-creation transaction** before the table-update step, so two concurrent orders racing for the same table cannot both succeed"; also requires rejecting **any** `status: 'booked'` table.
- **Issue:** the availability check runs before `withTransaction` and the in-transaction write is an unconditional `findByIdAndUpdate`. Two terminals booking the same table concurrently both pass the check, then overwrite each other (last-write-wins). Additionally the guard only rejects tables whose `currentOrderId` references a live order — a manually blocked table (`bookedBy: 'manual'`, `currentOrderId: null`) is silently overwritten.
- **Fix:** move the guard inside `withTransaction` and make the booking conditional (`findByIdAndUpdate({ _id, status: 'available' }, ...)`, aborting the transaction on no-match); reject any `booked` table per §5.9.
- **Status: RESOLVED (2026-08-13).** The booking check moved inside the order-creation transaction as a conditional `Table.findByIdAndUpdate({ _id, status: 'available' }, ...)` (`pos.service.ts:295-312`); no-match aborts with `409 TABLE_ALREADY_BOOKED`, and a `WriteConflict` from a concurrent booking is converted to the same `409`. Any `status: 'booked'` table is now rejected — including `bookedBy: 'manual'` blocks and stale bookings (the old leniency that overwrote a booked table whose referenced order was completed/cancelled is removed; staff free such tables via the manual table-status endpoint per `TEST_CASES.md` TBL-CROSS-06). The pre-transaction `Table.findById` is retained only for `TABLE_NOT_FOUND` (400) and the `tableLabelSnapshot` read.

### C2 — Quick-checkout orders (paid at creation) never count coupon usage and never unbook their table
- **Location:** `backend/src/modules/orders/orders.service.ts:644-652` (early return when `order.paymentStatus === 'paid'`), `backend/src/modules/pos/pos.service.ts:292-298` (order created with `paymentStatus: 'paid'` directly).
- **Rule:** `database.md` §5.1/§5.8; `API.md` §9.3 — coupon usage must be counted on every successful paid order; a paid dine-in order must unbook its table.
- **Issue:** `PATCH /orders/:id/status` with `{ paymentStatus: 'paid' }` short-circuits when the order is already paid, before the transaction that does the coupon `$inc` (`orders.service.ts:687-689`) and the table unbook (`:700-709`). Orders created already-paid via the POS quick-checkout path therefore never increment `usageCount` and never free their table — the table stays `booked` forever.
- **Fix:** when creating an order with `payment`, run the coupon `$inc` and table unbook inside the creation transaction; or remove the early return so the paid path always executes its transaction (idempotent guards already exist).
- **Status: RESOLVED (2026-08-13).** The legacy quick-checkout path was removed from the backend — `payment`/`cashTendered` are no longer accepted on `POST /pos/orders` (`pos.validation.ts`; the now-unused `paymentSchema`/`PAYMENT_METHODS` were deleted) and `pos.service.ts` no longer sets `paymentStatus: 'paid'` at creation, so every order is created `unpaid` (model default) and the only way to become paid is `PATCH /orders/:id/status`, where the coupon `$inc` and table unbooking run in the same transaction. The idempotent early return at `orders.service.ts:644-652` is **retained** — removing it would double-increment `usageCount` on repeated PATCHes; with paid-at-creation gone it is unreachable except as a repeat-request no-op. Docs updated accordingly: `API.md` §9.3 (creation is always `unpaid`), `database.md` §5.1/§5.2 (coupon `$inc` deferred to the payment-capture transaction).

---

## High

### H1 — Coupon usage-limit revalidation never implemented; `COUPON_USAGE_LIMIT_REACHED` is dead
- **Location:** `backend/src/modules/orders/orders.service.ts:687-689`.
- **Rule:** `database.md` §5.2 — "service-layer check (`usageCount < usageLimit`) re-validated within the same transaction before commit"; `API.md` §26 documents the error code.
- **Issue:** the `$inc` is unconditional; a coupon at its limit can be used again if two paid orders commit concurrently. No code path throws `COUPON_USAGE_LIMIT_REACHED`.
- **Fix:** re-fetch the coupon with the session and require `usageCount < usageLimit` before the `$inc`; throw `409 COUPON_USAGE_LIMIT_REACHED` otherwise.

### H2 — `POST /pos/orders` response shape deviates from the contract
- **Location:** `backend/src/modules/pos/pos.service.ts:361` (returns `{ orderNumber }` only); FE adapted at `frontend/src/features/pos/api.ts:89`.
- **Rule:** `API.md` §9.3 response — full order (`id, orderNumber, orderType, tableId, items, subtotal, discountAmount, taxAmount, grandTotal, paymentStatus, status, createdBy`); `AI_rules.md` §3.
- **Fix:** return the persisted order document per §9.3. Intentional-looking trim — see §12 flag 1.

### H3 — POS route set is off-contract
- **Location:** `backend/src/modules/pos/pos.routes.ts:17-21` — `/pos/catalog`, `/pos/employees`, `/pos/customers/lookup`, `/pos/customers`.
- **Rule:** `API.md` §9.1 defines `GET /pos/products?categoryId=&search=`; `decision.md` CM-FIX-04 also references `/pos/products`; `API.md` §21 forbids pos-scoped customer duplicates ("calls the Customers module's GET/POST — not a pos-scoped duplicate").
- **Fix:** rename to `/pos/products` with `categoryId`/`search`; drop the pos-scoped customer endpoints in favor of `/customers`, or amend the docs first (§12 flag 2).

### H4 — `PUT /orders/:id` tableId change leaves both tables corrupt
- **Location:** `backend/src/modules/orders/orders.service.ts:454-456`.
- **Rule:** `AI_rules.md` §6 (status/`currentOrderId` invariant); `API.md` §11.1 (side-effects owned by order writes).
- **Issue:** changing `tableId` never unbooks the old table and never checks/books the new one — the old table stays `booked`, and a dine-in order can be moved onto an already-booked table.
- **Fix:** on tableId change, unbook the old table and conditionally book the new one in the same write, emitting `table:statusChanged`.

### H5 — `DELETE /orders/:id` never unbooks the table
- **Location:** `backend/src/modules/orders/orders.service.ts:856-866`.
- **Rule:** `AI_rules.md` §6 invariant.
- **Issue:** the order is deleted but `Table.currentOrderId` keeps pointing at a nonexistent order; the table can never be rebooked by POS or orders.
- **Fix:** inside the delete transaction, if `order.tableId` is set and `table.currentOrderId === order._id`, reset to `available` and emit `table:statusChanged`.

### H6 — Cancel-path table unbooking is a separate, non-atomic write
- **Location:** `backend/src/modules/orders/orders.service.ts:790-797` (second write after the status `findByIdAndUpdate`; no session).
- **Rule:** `database.md` §5.8 — "the unbooking runs in the same write operation as the status transition". (The paid path at `:700-709` does this correctly inside its transaction; the cancel path does not.)
- **Fix:** fold the table reset into the same `findByIdAndUpdate`/transaction as the status transition.

### H7 — Double ActivityLog on payment capture, with the wrong actor
- **Location:** `backend/src/modules/orders/orders.service.ts:691-698`.
- **Rule:** `AI_rules.md` §11 (inherit the middleware; no module-specific logging substitute; actor must be the acting user).
- **Issue:** the service writes its own `pos.order_paid` entry inside the transaction with `actor = order.createdBy`, while the global `activityLogger` middleware (`app.ts:101`, no `skipActivityLog` set for this route) also writes `order.status_changed` with the real `req.user` — two entries per payment, and the in-transaction one misattributes the actor.
- **Fix:** set `skipActivityLog` on this route and write one entry with `req.user.id`, or drop the manual write and keep the middleware's.

### H8 — Socket events `order:updated` / `order:deleted` are not in API.md §25
- **Location:** `backend/src/modules/orders/orders.service.ts:609` and `:869`; FE listeners at `frontend/src/features/orders/page.tsx:32-33` (file `frontend/src/app/(dashboard)/orders/page.tsx`).
- **Rule:** `AI_rules.md` §7 — events must match `API.md` §25 exactly.
- **Fix:** add both events (with payloads) to `API.md` §25 or remove the emissions (§12 flag 4).

### H9 — Order model drifts from DATABASE.md §3.8
- **Location:** `backend/src/models/Order.ts:29-43`.
- **Rule:** `AI_rules.md` §2 — "If a model needs a field DATABASE.md doesn't list, update DATABASE.md first; don't let schema drift silently into code".
- **Issue:** `customerName`, `customerPhone`, `servedBy`, `discountPercent`, `cashTendered`, `changeAmount`, `previousPayments` are undocumented; conversely `payment.splits` (documented in §3.8) was replaced by `payment.transactionId` without a doc update.
- **Fix:** reconcile `database.md` §3.8 with the model (§12 flag 3).

---

## Medium

### M1 — Orders reimplements date filtering instead of the shared `range` contract
- **Location:** `backend/src/modules/orders/orders.validation.ts:5-17` (rejects `range`), `backend/src/modules/orders/orders.service.ts:366-375` (inline from/to), `frontend/src/features/orders/components/OrderFilters.tsx` (module-specific picker).
- **Rule:** `API.md` §2 (`?range=today|week|month|custom&from=&to=`); `AI_rules.md` §3/§8 — shared `normalizeDateRange`/`useDateRangeFilter` are used by dashboard, expenses, incomes, reports; Orders does not.
- **Fix:** accept `range` and use `normalizeDateRange`; swap the FE to the shared hook.

### M2 — FE/BE update-schema drift breaks the table edit feature
- **Location:** FE sends `tableNumber` — `frontend/src/features/orders/schema.ts:24`, `frontend/src/features/orders/api.ts:126`, `OrderEditForm.tsx:108`; BE expects ObjectId `tableId` in a `.strict()` schema (`backend/src/modules/orders/orders.validation.ts:34,41`) → every table edit 400s. FE types read `tableNumber` that BE never returns (`orders/api.ts:10,33`, `OrderList.tsx:45,74`, `OrderDetail.tsx:167`); BE returns only `tableId` + `tableLabelSnapshot` (`orders.service.ts:94-95,113-114`) — the Table column/row never renders.
- **Rule:** `AI_rules.md` §4 (FE/BE wire-shape parity).
- **Fix:** use `tableId` + `tableLabelSnapshot` on the FE.

### M3 — `vatRate` contract mismatch
- **Location:** FE requires `vatRate` — `frontend/src/features/pos/api.ts:20`, `ProductGrid.tsx:78`, `OrderEditForm.tsx:16`; BE catalog response omits it (`pos.service.ts:45-70`; `API.md` §9.1 field list).
- **Rule:** `AI_rules.md` §4; `API.md` §9.1.
- **Fix:** include `vatRate` in the catalog response or resolve it from the categories query on the FE.

### M4 — Client preview math diverges from the server
- **Location:** FE caps total discount at subtotal and ignores the coupon cap (`frontend/src/app/(dashboard)/pos/page.tsx:102`, `BillPreview.tsx:19`); BE caps only via `maxDiscountAmount`, never at subtotal (`pos.service.ts:169-188`).
- **Rule:** `AI_rules.md` §3 (server is source of truth; the preview must mirror it).
- **Fix:** make the preview use the server-returned `discountAmount` and identical formulas.

### M5 — ORD-FIX-02 (settled decision) not enforced
- **Location:** `backend/src/modules/pos/pos.validation.ts:6-9`, `backend/src/modules/orders/orders.validation.ts:28-31` (no refine); `pos.service.ts:295` silently drops a missing `transactionId`.
- **Rule:** `decision.md` QA Fix Batch ORD-FIX-02 — `transactionId` required when `payment.method !== 'cash'`, with a service-layer guard.
- **Fix:** add the Zod refine + service check.

### M6 — `any` cast
- **Location:** `(err as any).code === 11000` at `backend/src/modules/coupons/coupons.service.ts:107` (also `tables.service.ts:68`, out of scope).
- **Rule:** `AI_rules.md` §1 (strict TS, no `any`).
- **Fix:** narrow via `mongoose.mongo.MongoServerError`.

### M7 — Coupon `maxDiscountAmount`/`minOrderAmount` unmanageable via the API
- **Location:** model `backend/src/models/Coupon.ts:7-8` and honored by POS validate (`pos.service.ts:25,92`), but absent from create/update validation, the response mapper, and the FE form.
- **Rule:** `database.md` §3.5; `AI_rules.md` §4 shape parity.
- **Fix:** add both to `coupons.validation.ts`, `toResponse`, and `CouponForm`.

### M8 — Customer upsert runs outside the order-creation transaction
- **Location:** `backend/src/modules/pos/pos.service.ts:217-243`.
- **Rule:** `AI_rules.md` §6 — "any new step added to this flow joins the same transaction".
- **Issue:** a failed order leaves `orderCount`/`history` incremented on the customer.
- **Fix:** move the customer lookup/create/update inside `withTransaction`.

### M9 — Money fields missing `.multipleOf(0.01)`
- **Location:** `cashTendered` (`backend/src/modules/pos/pos.validation.ts:26`); Coupon `value` flat type (`backend/src/modules/coupons/coupons.validation.ts:6,22` and `frontend/src/features/coupons/schema.ts:6`).
- **Rule:** `AI_rules.md` §4; `database.md` §1.
- **Fix:** add `multipleOf(0.01)` on both sides.

### M10 — API calls outside `features/<module>/api.ts`
- **Location:** `frontend/src/features/orders/components/OrderEditForm.tsx:46` calls `apiClient('/pos/catalog')` directly (a `useCatalog` hook already exists); `frontend/src/app/(dashboard)/pos/page.tsx:72` does a manual `useEffect` + `AbortController` lookup instead of React Query.
- **Rule:** `AI_rules.md` §2/§8.
- **Fix:** move both into the module `api.ts` as React Query hooks.

### M11 — Bill/display total diverges from the validated total
- **Location:** bill template `backend/src/modules/orders/orders.service.ts:189-193` and FE `frontend/src/features/orders/components/OrderDetail.tsx:318-358` both display `Math.floor(subtotal - discountAmount)` with an undocumented "Auto Round" line; stored `order.grandTotal` (round2, no floor) is what payment capture validates against (`orders.service.ts:663`).
- **Rule:** `database.md` §1 (money/rounding policy); `AI_rules.md` §3.
- **Issue:** the bill can show up to 0.99 below the amount the cashier must collect; a customer paying the displayed total is rejected.
- **Fix:** display the stored `grandTotal`; remove the "Auto Round" math or document it as a policy decision in `database.md` §1.

### M12 — Coupon CRUD buttons not PermissionGate-wrapped
- **Location:** `frontend/src/features/coupons/components/CouponList.tsx:176-205` (toggle/edit/delete) and `DeleteCouponDialog.tsx` — active controls visible to users with only `coupons:view`. The analogous delete in `OrderDetail.tsx:104` is gated.
- **Rule:** `AI_rules.md` §9 (every CRUD button wrapped in `PermissionGate` with the action it triggers).
- **Fix:** wrap toggle/edit/delete in `PermissionGate module="coupons" action={...}`.

---

## Low

- **L1** `orders.service.ts:396-415` — `servedBy` is populated but absent from the list projection → always `null` in list items.
- **L2** Event payload extras not in `API.md` §25: `order:statusChanged` carries `orderNumber` (`orders.service.ts:800-804`); `table:statusChanged` carries `source` (`pos.service.ts:355`, `orders.service.ts:727,812`).
- **L3** `pos.service.ts:271` — orderNumber format `ORD-YYYY-000001` vs documented example `ORD-000482` (`database.md` §3.8).
- **L4** ActivityLog taxonomy drift — actions `pos.order_created`/`pos.order_paid` (`pos.service.ts:310`, `orders.service.ts:694`) don't match the documented dot-taxonomy (`database.md` §3.13; middleware uses `order.status_changed`).
- **L5** `orders.service.ts:857-863` — unreachable coupon `$inc: -1` branch in `deleteOrder` (guard at `:848` already rejects paid+coupon); also `API.md` §28.1 says "no couponId set" while code allows unpaid+coupon deletion (defensible; docs should match).
- **L6** `frontend/src/app/(dashboard)/pos/page.tsx:265` — loyalty banner `bg-purple-100 text-purple-800`; purple is accent-only per `theme.md` §2 (gradients). Use a defined token/badge combo.
- **L7** `pos/page.tsx:118-120` — UI never sends `orderType`, so every order defaults to `dine-in` even for takeaway/delivery.
- **L8** `CouponList.tsx:150` — dead ternary (`? 'off' : 'off'`).

---

## §12 prompt-conflict flags (intentional-looking deviations)

Per `AI_rules.md` §12, these four code-vs-doc deviations look deliberate and need an explicit decision plus a doc amendment, rather than a silent fix or silent acceptance:

1. **`POST /pos/orders` response trimmed to `{ orderNumber }`** (H2) — contradicts `API.md` §9.3's response shape.
2. **`/pos/catalog` + pos-scoped customer endpoints** (H3) — contradicts `API.md` §9.1/§21 and the `decision.md` CM-FIX-04 text itself.
3. **Order model superset** (H9) — 7 extra fields + `payment.transactionId` replacing `splits`, none reflected in `database.md` §3.8.
4. **Undocumented events `order:updated` / `order:deleted`** (H8) — new event names shipped without `API.md` §25 entries.

Each requires either code alignment or an upstream doc amendment (`API.md`/`database.md`/`AI_rules.md` + a `decision.md` entry) before the next PR — the docs remain the binding contract.

## Suggested fix order

1. ~~**C1, C2**~~ **RESOLVED** (data corruption / floor-state) — backend, `pos.service.ts` + `pos.validation.ts` + doc alignment (`API.md` §9.3, `database.md` §5.1/§5.2).
2. **H1, H4, H5, H6** (integrity guards) — backend transaction boundaries.
3. **H7** (audit integrity) — backend, plus the skipActivityLog pattern.
4. **§12 doc reconciliation** (H2, H3, H8, H9) — decide trim/rename vs. docs first, per `AI_rules.md` §12.
5. **H3** route rename — touches FE (`features/pos/api.ts`, `OrderEditForm.tsx`) and backend routes.
6. **M-series + L-series** — FE/BE parity fixes, PermissionGate, `multipleOf`, shared date-range, `any` removal.