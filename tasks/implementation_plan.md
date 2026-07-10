# Implementation Plan: POS Pay-Later Workflow + Category-Based VAT

## Feature Overview

**Feature name:** POS Pay-Later Workflow & Category-Based Itemized VAT

**Business goal:** Convert POS from a pay-first model to a pay-after-delivery workflow, where orders are placed without payment, can be edited before payment, and payment is captured as a separate step. Simultaneously replace the flat/configured tax rate with per-category VAT rates.

**User value:**
- Staff can take orders at a table/counter without requiring immediate payment
- Kitchen receives prep tickets (no prices) as soon as an order is placed
- Items can be added/removed before payment (e.g. customer changes mind)
- Payment is captured in a dedicated step after service is complete
- Tax is computed per-category (e.g. 6% on soft drinks, 0% on bottled water)

---

## Approved Scope

| Item | Description |
|------|-------------|
| Add `paymentStatus` field to Order | `unpaid` / `paid` axis, separate from fulfillment `status` |
| Make `payment` optional at POS creation | Removed from required schema; captured at payment step |
| Coupon usage increments at payment, not placement | `$inc usageCount` moves from POS order-creation to payment-capture |
| Widen `PUT /orders/:id` for item editing | Accept `items[]` replacement; server recalculates all financials |
| Widen `PATCH /orders/:id/status` for payment capture | Accept `paymentStatus`, `payment`, `cashTendered` to mark paid |
| Rename `Category.taxRate` to `Category.vatRate` | Required on create; existing categories get migration with previous value |
| Update `buildCancelledExcludedMatch` to `buildRevenueMatch` | Revenue aggregates now require `paymentStatus: 'paid'` |
| Update bill template | Single template, payment section shown conditionally based on `paymentStatus` |
| Add kitchen re-notification event | `order:itemsUpdated` socket event for post-completion item edits |
| Two-transaction model | Placement: Counter + Order + ActivityLog. Payment: Coupon $inc + Order update + ActivityLog |

## Out of Scope

- Full kitchen display system (KDS) -- re-notification event is the only addition
- Split-payment UI redesign -- existing `payment.splits` and `previousPayments` continue as-is
- Customer-facing portal or self-order -- staff-only flow as before
- Settings.taxConfig removal -- was never built; no action needed
- Separate Income module -- remains handled by Reports profit report

---

## Current Codebase State (Critical Context)

| Module | Status | Key Details |
|--------|--------|-------------|
| POS | Fully built (pay-first) | `POST /pos/orders` requires `payment`, increments coupon usage, defaults `status: 'completed'` |
| Orders | Fully built | `PUT /orders/:id` already allows item editing + recalc; `PATCH /orders/:id/status` handles transitions; bill template is one file with customer + kitchen copy |
| Category | Fully built | Field is `taxRate` (default 5, 0-100), not `vatRate`. Full CRUD with `CategoryForm.tsx` containing `taxRate` input |
| Order model | Built | `payment: required`; no `paymentStatus` field; `previousPayments` array exists |
| Settings | Built | No `taxConfig` field; has `vatInfo: { bin, mushak }` instead |
| Dashboard | Built (backlog incorrectly shows unchecked) | Uses `status: 'completed'` filter for revenue |
| Reports | Built (Sales + Profit + PDF export) | Uses `buildCancelledExcludedMatch()` (excludes `status: 'cancelled'`) |
| Aggregation helper | Built at `backend/src/lib/aggregation.ts` | 3 lines -- simple `{ status: { $ne: 'cancelled' } }` |

### Key behavioral findings (code differs from docs):

1. **`PUT /orders/:id`** already allows editing `items`, `discountPercent`, `payment`, `cashTendered` -- more permissive than `API.md` section 10 describes. The existing code recalculates subtotal, tax, discount, and grandTotal when items change.
2. **`PATCH /orders/:id/status`** currently handles fulfillment status only. It **does not** accept payment data.
3. **POS defaults to `status: 'pending'`** (not `'completed'` as `API.md` says), with `completedAt` set when `status === 'completed'`.
4. **`Category.taxRate`** is already used in tax calculation -- both in `pos.service.ts` (line 148) and `orders.service.ts` (line 457). It's referenced by `nameSnapshot` as `taxRate` in the catalog. Renaming must update every reference.
5. **Coupon usage** is checked by counting documents (line 129 `Order.countDocuments({ couponId })`) rather than reading `Coupon.usageCount`. The `$inc` on `Coupon.usageCount` happens inside the transaction at placement.

---

## Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Two independent axes: `status` (fulfillment) + `paymentStatus` (payment) | Keeps kitchen flow decoupled from payment flow |
| D2 | Items editable any time before `paymentStatus: paid` | Once paid, all financial fields freeze permanently |
| D3 | `Category.taxRate` renamed to `vatRate` (not separate field) | Avoids having two fields doing the same thing |
| D4 | `payment` optional at creation, required at payment capture | Payment is no longer a creation concern |
| D5 | Coupon `usageCount` increments at payment, not placement | Placed-but-unpaid orders with coupon don't waste usage |
| D6 | Two separate transactions: placement + payment | Avoids long-lived transaction holding a write lock |
| D7 | Revenue requires `paymentStatus: 'paid'` | Unpaid completed orders are not yet revenue |
| D8 | Settings.taxConfig was never built -- no removal needed | Settings model has `vatInfo`, not `taxConfig` |
| D9 | Kitchen re-notification on item edits after `status: completed` | New items added to a completed order need kitchen attention |
| D10 | Cancel anytime before payment; no coupon reversal needed | Coupon usage not yet incremented at cancel time |
| D11 | Bill template is single file, payment section conditional on `paymentStatus` | One code path for both unpaid and paid bills |
| D12 | `PATCH /orders/:id/status` widened for payment capture | Avoids creating a new endpoint |
| D13 | Kitchen copy remains same template (no prices) | Kitchen copy already shows only item name + quantity |

---

## Database Impact

### Order Model (`backend/src/models/Order.ts`)

**Add:**
- `paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid', required: true }`

**Change:**
- `payment: { type: paymentSchema, required: true }` to `payment: { type: paymentSchema, required: false }`

**New indexes:**
- `{ paymentStatus: 1 }` (for revenue aggregation filtering)
- Compound `{ status: 1, paymentStatus: 1, createdAt: -1 }` (for combined list queries)

### Category Model (`backend/src/models/Category.ts`)

**Rename:**
- `taxRate: number` to `vatRate: number`
- Schema: `taxRate: { type: Number, default: 5, min: 0, max: 100 }` to `vatRate: { type: Number, required: true, min: 0, max: 100 }`
- `required: true` because vatRate is required on create per user decision
- Remove `default: 5` since it's required (Zod schema will validate it)

### Aggregation Helper (`backend/src/lib/aggregation.ts`)

**Replace:**
- `buildCancelledExcludedMatch()` to `buildRevenueMatch()`
- New function: `{ status: 'completed', paymentStatus: 'paid' }` (revenue requires both)

### Data Migration Required

Existing records must be updated:
1. **Order:** Add `paymentStatus: 'paid'` to all existing orders that have `payment` set (they were created in the old pay-first model, so they are effectively paid). Add `paymentStatus: 'unpaid'` to any order without payment (edge case).
2. **Category:** Rename `taxRate` field to `vatRate` for all documents. Create a migration script.

---

## API Impact

### POS -- `POST /pos/orders` (Modified)

**Change:** `payment` field becomes optional. If omitted, order is created with `paymentStatus: 'unpaid'` and no payment data.

**Change:** Coupon `usageCount` no longer incremented here. The `$inc` inside the placement transaction is removed. The usage-limit check (`Order.countDocuments`) is removed from placement.

**Change:** Default `status` remains `'pending'` (already the case in code). `completedAt` only set when `status: 'completed'` explicitly passed.

**Change:** `cashTendered` and `changeAmount` become optional and are only processed when `payment` is also provided.

### Orders -- `PUT /orders/:id` (Modified)

**Change:** Items (`items[]`) can be sent for full replacement. Server recalculates all financial fields. This already works in the current code -- no behavioral change needed.

**Guard:** If `paymentStatus` is `'paid'`, reject the item edit with `400 ORDER_ALREADY_PAID`.

**New socket event:** `order:itemsUpdated` emitted when items change on a completed order (kitchen re-notification).

### Orders -- `PATCH /orders/:id/status` (Modified)

**Change:** Accept new fields for payment capture:
- `{ "paymentStatus": "paid", "payment": { "method": "cash" }, "cashTendered": 500 }`

**Existing status transitions still work unchanged:**
- `{ "status": "completed" }`
- `{ "status": "cancelled", "cancelReason": "Customer left" }`

**Validation:**
- `paymentStatus: 'paid'` requires `payment.method` to be set
- `payment.method === 'cash'` requires `cashTendered >= grandTotal`
- `paymentStatus: 'paid'` can be set regardless of `status` (approved: "Can pay anytime")
- Once `paymentStatus: 'paid'`, it cannot be changed back to `'unpaid'`

**New behavior inside transaction (on payment capture):**
- If `couponId` is set, increment `Coupon.usageCount` via `$inc` (inside transaction with Order update + ActivityLog)
- Set `paymentStatus: 'paid'`, store `payment`, `cashTendered`, `changeAmount`
- Write ActivityLog entry: `pos.order_paid`

### Orders -- `GET /orders/:id/bill` (Modified)

**Change:** Single template, conditional rendering:
- If `paymentStatus: 'paid'`: show full payment section (method, cash tendered, change)
- If `paymentStatus: 'unpaid'`: show "UNPAID" watermark/banner, hide payment details
- Kitchen copy always renders (no prices, no financial data)

### Aggregation -- All Revenue Queries

All revenue queries must use `buildRevenueMatch()`:
- `dashboard.service.ts` -- `getMetrics` and `getTopItems` pipelines
- `reports.helper.ts` -- sales and profit report pipelines

Old filter: `{ status: 'completed' }` or `{ status: { $ne: 'cancelled' } }`
New filter: `{ status: 'completed', paymentStatus: 'paid' }`

---

## Frontend Impact

### POS -- Checkout Screen (`features/pos/`)

**Change:** Remove payment step from the primary checkout flow.
- `Cart.tsx`: Remove payment method selector and cash-tendered input from the create-order flow
- `PaymentMethodSelector.tsx`: Can be kept for the "pay at POS" path (legacy compatibility)
- Create order button submits without payment data
- Add option: "Pay Now" (capture payment at POS) vs "Place Order" (no payment, created unpaid)

### Orders -- Order Detail Page (`features/orders/`)

**Change:** Add payment capture action.
- `OrderDetail.tsx`: Show "Mark as Paid" button when `paymentStatus: 'unpaid'`
- Payment capture dialog using `PaymentMethodSelector` component
- Payment capture calls `PATCH /orders/:id/status` with `paymentStatus: 'paid'`

**Change:** Add item editing guard.
- `OrderEditForm.tsx`: If `paymentStatus: 'paid'`, disable editing and show "Order already paid"
- Show `paymentStatus` badge in order header alongside `status`

### Orders -- Order List (`features/orders/`)

**Change:** Show `paymentStatus` column/badge.
- `OrderList.tsx`: Add `paymentStatus` to table columns
- Add `paymentStatus` filter option

### Categories -- `CategoryForm.tsx`

**Change:** Rename `taxRate` field label to "VAT Rate (%)".
- Update label text, placeholder, and Zod schema field name

### Bill View -- `BillView.tsx` / `renderBillHtml()`

**Change:** Conditional rendering based on `paymentStatus`.
- If unpaid: show "UNPAID" watermark, hide payment details
- If paid: show full payment section as currently rendered

---

## Authentication & Authorization

| Action | Permission | Notes |
|--------|-----------|-------|
| Create order (POS) | `pos:create` | Unchanged |
| Edit order items | `orders:edit` | Existing permission reused |
| Capture payment | `orders:edit` | Widened from existing `PATCH /orders/:id/status` |
| Cancel order | `orders:edit` | Unchanged |
| View orders | `orders:view` | Unchanged |
| Edit category vatRate | `categories:edit` | Unchanged |

No new permission keys needed. The existing `orders:edit` action covers both item editing and payment capture.

---

## Security Requirements

1. **Payment fields are server-calculated:** `grandTotal`, `taxAmount`, `subtotal`, `discountAmount` are always computed server-side. Client-submitted values are advisory only -- this is already implemented and unchanged.
2. **Freeze on payment:** Once `paymentStatus: 'paid'`, `PUT /orders/:id` must reject all financial field edits. This is a service-layer guard, not just UI.
3. **Coupon increment atomicity:** The `Coupon.usageCount $inc` happens inside a Mongo transaction at payment time. If the transaction fails, the coupon is not consumed.
4. **Existing data migration:** Migration scripts must run before new code deploys to prevent schema validation errors on existing documents.

---

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Pay an order with zero items (all removed before payment) | `PUT /orders/:id` requires min 1 item. Block removal of last item. |
| Pay an order that already has a coupon applied | Coupon `usageCount` increments atomically at payment time |
| Pay an order after kitchen has marked it completed | Works -- `paymentStatus: 'paid'` can be set regardless of `status` |
| Pay an order that is still `status: pending` | Works -- "Can pay anytime" decision |
| Edit items on an order after payment | Rejected with `400 ORDER_ALREADY_PAID` |
| Edit items removes coupon applicability (min order not met) | Coupon removed from order, discount recalculated to 0. No refund of usageCount (was never incremented). |
| Cancel an unpaid order that used a coupon | No coupon reversal needed (usageCount was not incremented at placement) |
| Cancel a paid order | Existing `completed -> cancelled` transition works. Revenue recalculation handled by `buildRevenueMatch()` excluding cancelled + filtered by paymentStatus. |
| Concurrent edits by two staff on same order | Last `findByIdAndUpdate` wins (Mongoose default). No optimistic locking in v1. |
| Create order with `paymentStatus: 'paid'` directly from POS | Supported -- legacy path for quick checkout. `PUT` can still be used to edit. |
| Duplicate payment capture request | Once `paymentStatus: 'paid'`, second request returns success (idempotent by checking current state) or error. |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Existing orders missing `paymentStatus` field after schema change | Migration script runs before deployment |
| Existing Category documents losing `taxRate` field during rename | Migration script renames field atomically |
| POS checkout UI change confuses staff who are used to pay-first flow | Keep "Pay Now" option; "Place Order" is new default |
| Coupon usage race condition at payment time | Mongo transaction ensures atomic `$inc` |
| Revenue reporting temporarily inaccurate if migration runs late | Migration runs as part of deployment, before any new paid orders are created |

---

## Doc Updates Required

### 1. `database.md` -- Order Model (section 3.8)

**Current:** `payment` is required. No `paymentStatus` field. `discountAmount` note says "computed once at order time -- never recomputed from a live coupon later". `taxAmount` note says "computed from `Settings.taxConfig` at order time, then frozen".

**New:** Add `paymentStatus: String enum 'unpaid' | 'paid'` (default: `'unpaid'`). Change `payment` to optional. Update notes: "computed at order creation and recomputed on every pre-payment item edit (`PUT /orders/:id`) up until `paymentStatus` becomes `paid`. Once `paymentStatus` is `paid`, these fields are permanently frozen."

### 2. `database.md` -- Category Model (section 3.3)

**Current:** No `vatRate`/`taxRate` field in the documented schema (the code has `taxRate` but `database.md` section 3.3 only lists `name` and `isActive`).

**New:** Add `vatRate: Number (required, 0-100)` field. Update the Category collection table.

### 3. `database.md` -- Open Items (section 8)

**Current:** Item 2 references `Settings.taxConfig.mode: itemized`. Item 5 references coupon usage limit scope.

**New:** Item 2: Mark as resolved -- VAT now handled per-category via `Category.vatRate`. `Settings.taxConfig` was never implemented and is not needed.

### 4. `API.md` -- POS (section 9.3)

**Current:** `payment` is required at order creation. `status` defaults to `completed`.

**New:** `payment` is optional at order creation. `status` defaults to `pending`. Coupon `usageCount` is NOT incremented at order creation.

### 5. `API.md` -- Orders (section 10)

**Current:** `PUT /orders/:id` is "intentionally narrow: only `tableNumber`, `orderType`, and `customerId` are editable. `items`... are **never** editable post-creation."

**New:** `PUT /orders/:id` accepts a full `items` array for replacement. Server recalculates all financial fields. Items are editable until `paymentStatus: paid`. Once paid, all financial fields are frozen.

**Current:** `PATCH /orders/:id/status` handles fulfillment status transitions only.

**New:** `PATCH /orders/:id/status` also accepts `paymentStatus: 'paid'` + `payment` object for payment capture. When `paymentStatus: 'paid'`, increments `Coupon.usageCount` atomically if a coupon was applied.

### 6. `API.md` -- Real-Time Events (section 22)

**Current:** Events: `order:created`, `order:statusChanged`, `dashboard:metricsInvalidate`.

**New:** Add `order:itemsUpdated` (emitted on pre-payment item edits). Add `order:paid` (emitted on payment capture, distinct from `order:statusChanged`).

### 7. `API.md` -- Open Items (section 25)

**Current:** Item 2 (taxConfig mode) open. Item 5 (coupon usage scope) open.

**New:** Item 2: Resolved -- VAT handled per-category via `Category.vatRate`. Item 5: Resolved -- global limit, incremented at payment time.

### 8. `API.md` -- Error Code Reference (section 24)

**New:** Add `400 ORDER_ALREADY_PAID` for attempts to edit financial fields on a paid order.

### 9. `AI_rules.md` -- Snapshot/don't re-derive (section 3)

**Current:** "Any new write to Order financial fields outside of order creation is a bug."

**New:** "Any new write to Order financial fields outside of order creation or a pre-payment item edit (PUT /orders/:id) is a bug. Once `paymentStatus` is `paid`, all financial fields are permanently frozen."

### 10. `AI_rules.md` -- Transaction boundary (section 6)

**Current:** "Order creation (Counter increment, Order insert, Coupon `usageCount` `$inc`, ActivityLog write) is one Mongo transaction."

**New:** "Order creation (Counter increment, Order insert, ActivityLog write) is one Mongo transaction. Coupon `usageCount` `$inc` happens in a separate transaction at payment time (`PATCH /orders/:id/status` with `paymentStatus: paid`), not at order creation."

### 11. `AI_rules.md` -- Open Items (section 13)

**Current:** Item 5 references `Settings.taxConfig.mode: itemized`.

**New:** Item 5: Resolved -- VAT handled per-category via `Category.vatRate`. Remove from open items.

### 12. `backlog.md` -- Progress Tracker

**Current:** Task 12 (Dashboard) marked `[ ]`. Task 13 (Income) marked `[ ]`. Task 18 (Reports) marked `[ ]`.

**New:** Task 12 updated to `[ok]` (Dashboard is fully built). Task 13 (Income) -- confirm whether still needed or can be removed (folded into Reports profit report). Task 18 updated to `[ok]` (Reports is fully built).

---

## Implementation Order

The tasks should be implemented in this order:

1. **Task 1:** Rename Category.taxRate to vatRate (migration + all references)
2. **Task 2:** Add paymentStatus to Order model (schema + migration)
3. **Task 3:** Refactor POS order creation (payment optional, coupon not incremented)
4. **Task 4:** Widen PATCH /orders/:id/status for payment capture
5. **Task 5:** Guard PUT /orders/:id for paymentStatus (paid = frozen)
6. **Task 6:** Emit kitchen re-notification on item edits
7. **Task 7:** Update revenue aggregation (buildRevenueMatch)
8. **Task 8:** Update bill template conditional payment section
9. **Task 9:** Frontend -- POS checkout remove payment step
10. **Task 10:** Frontend -- Orders payment capture UI

Task 1 must come first (schema rename cascades to every other task). Tasks 2+3 can be done in parallel (both are Order-related schema changes). Tasks 4-8 depend on 2+3 being done. Tasks 9-10 are frontend and depend on their respective backend tasks.

---

## Task Breakdown

### Task 1: Rename Category.taxRate to vatRate (Database + Backend + Frontend)

**Description:** Rename the `taxRate` field on Category to `vatRate`. Update all references across the stack.

**Backend changes:**
- `backend/src/models/Category.ts`: Rename field `taxRate` to `vatRate`, change to `required: true`, remove `default: 5`
- `backend/src/modules/pos/pos.service.ts`: Line 45 (populate), line 54 (taxRate mapping), line 148 (taxRate in tax calc) -- all rename to vatRate
- `backend/src/modules/orders/orders.service.ts`: Line 457 (taxRate in tax calc) -- rename to vatRate
- `backend/src/modules/categories/categories.validation.ts`: Rename field in Zod schema

**Frontend changes:**
- `frontend/src/features/categories/schema.ts`: Rename `taxRate` to `vatRate`
- `frontend/src/features/categories/components/CategoryForm.tsx`: Update label from "Tax Rate" to "VAT Rate (%)"

**Migration script** (`backend/src/migrations/rename-taxrate-to-vatrate.ts`):
```ts
// Rename taxRate to vatRate on all Category documents
await Category.updateMany({}, { $rename: { taxRate: 'vatRate' } });
// Set vatRate for any documents that somehow lack it
await Category.updateMany({ vatRate: { $exists: false } }, { $set: { vatRate: 5 } });
```

**Acceptance criteria:**
- Category model has `vatRate` field, required, 0-100
- All backend references to `taxRate` updated to `vatRate`
- Category form shows "VAT Rate (%)" label
- Migration script renames existing data
- `npm run tsc --noEmit` passes in both backend and frontend

---

### Task 2: Add paymentStatus to Order Model (Backend)

**Description:** Add `paymentStatus` field to Order schema. Make `payment` optional. Create migration.

**Backend changes:**
- `backend/src/models/Order.ts`:
  - Add: `paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid', required: true }`
  - Change: `payment: { type: paymentSchema, required: true }` to `payment: { type: paymentSchema, required: false }`
  - Add indexes: `{ paymentStatus: 1 }`, compound `{ status: 1, paymentStatus: 1, createdAt: -1 }`
- `backend/src/modules/pos/pos.validation.ts`:
  - Make `payment` optional: `payment: paymentSchema.optional()`
  - Remove the `.refine` for cashTendered (payment not required at creation)
- `backend/src/modules/orders/orders.validation.ts`:
  - Widen `updateOrderStatusSchema` to accept `paymentStatus`, `payment`, `cashTendered`, `changeAmount`
- Update `OrderDetailItem` and `OrderListItem` interfaces in `orders.service.ts` to include `paymentStatus`

**Migration script** (`backend/src/migrations/add-paymentstatus-to-orders.ts`):
```ts
// Set paymentStatus: 'paid' on orders that have payment data
await Order.updateMany(
  { payment: { $exists: true, $ne: null } },
  { $set: { paymentStatus: 'paid' } }
);
// Set paymentStatus: 'unpaid' on any order without payment (edge case)
await Order.updateMany(
  { paymentStatus: { $exists: false } },
  { $set: { paymentStatus: 'unpaid' } }
);
```

**Acceptance criteria:**
- Order model has `paymentStatus` field with `unpaid`/`paid` enum, default `unpaid`
- `payment` is optional in schema and validation
- Existing orders get `paymentStatus` set via migration
- `npm run tsc --noEmit` passes in backend

---

### Task 3: Refactor POS Order Creation (Backend)

**Description:** Modify `POST /pos/orders` to make payment optional, remove coupon usage increment from placement.

**Backend changes to `pos.service.ts`:**
- Destructure `payment` as optional
- Remove coupon usage-limit check (lines 128-133: `Order.countDocuments`)
- Remove coupon `usageCount $inc` (lines 229-231)
- Wrap payment/cashTendered/changeAmount processing in `if (dto.payment)` block
- Set `paymentStatus: 'paid'` when payment provided; omit when not
- Update ActivityLog description to reflect payment status
- Transaction now only: Counter increment + Order insert + ActivityLog

**Acceptance criteria:**
- Creating order without `payment` succeeds (order: `paymentStatus: 'unpaid'`)
- Creating order with `payment` creates order with `paymentStatus: 'paid'` (legacy path)
- Coupon `usageCount` NOT incremented at placement
- `npm run tsc --noEmit` passes

---

### Task 4: Widen PATCH /orders/:id/status for Payment Capture (Backend)

**Description:** Modify status transition endpoint to accept payment capture data. Add coupon usage increment at payment time inside a transaction.

**Backend changes to `orders.service.ts` -- `updateOrderStatus`:**
- Add payment capture block:
  - Validate `payment.method` provided when `paymentStatus: 'paid'`
  - Validate cash payment covers grandTotal
  - If `couponId` set, increment `Coupon.usageCount` via `$inc` (inside transaction)
  - Store payment, cashTendered, changeAmount
  - Set `paymentStatus: 'paid'`
  - Write ActivityLog entry (`pos.order_paid`)
  - Emit `order:paid` socket event
- Wrap payment capture + coupon $inc + ActivityLog in a Mongo transaction
- If payment already captured (`paymentStatus === 'paid'`), return success (idempotent)

**Backend changes to `orders.validation.ts`:** Widen schema as described in API Impact section above.

**Acceptance criteria:**
- Payment capture works via `PATCH /orders/:id/status`
- Coupon `usageCount` increments atomically at payment time
- Existing status transitions (`pending`, `completed`, `cancelled`) continue working
- Cannot pay twice (second call returns success or error)
- `npm run tsc --noEmit` passes

---

### Task 5: Guard PUT /orders/:id for paymentStatus (Backend)

**Description:** Ensure `PUT /orders/:id` rejects item/financial edits when `paymentStatus: 'paid'`.

**Backend changes to `orders.service.ts` -- `updateOrder`:**
- At start, if `order.paymentStatus === 'paid'` and dto has `items`, `discountPercent`, `payment`, `cashTendered`, or `changeAmount`, throw `400 ORDER_ALREADY_PAID`
- Allow `tableNumber`, `customerId` edits even when paid

**Acceptance criteria:**
- Item edit on paid order returns `400 ORDER_ALREADY_PAID`
- Table number edit on paid order succeeds
- `npm run tsc --noEmit` passes

---

### Task 6: Emit Kitchen Re-Notification on Item Edits (Backend)

**Description:** Add `order:itemsUpdated` socket event when items changed on a completed order.

**Backend changes to `orders.service.ts` -- `updateOrder`:**
- After successful item update, if `updated.status === 'completed'`, emit `order:itemsUpdated` with `{ orderId, orderNumber }`

**Acceptance criteria:**
- `order:itemsUpdated` fires when items added to completed order
- No event for non-completed orders or metadata-only edits

---

### Task 7: Update Revenue Aggregation (Backend)

**Description:** Update shared aggregation helper and all revenue queries.

**Backend changes:**
- `backend/src/lib/aggregation.ts`: Rename to `buildRevenueMatch()`, return `{ status: 'completed', paymentStatus: 'paid' }`
- `dashboard.service.ts`: Replace `status: 'completed'` with `buildRevenueMatch()`
- `reports.helper.ts`: Replace `buildCancelledExcludedMatch()` with `buildRevenueMatch()`

**Acceptance criteria:**
- Dashboard metrics only count paid completed orders
- Reports exclude unpaid orders
- `npm run tsc --noEmit` passes

---

### Task 8: Update Bill Template (Backend)

**Description:** Modify `renderBillHtml()` for conditional payment section.

**Backend changes to `orders.service.ts` -- `renderBillHtml`:**
- Read `paymentStatus` from order
- If `'unpaid'`: replace payment section with "UNPAID" notice, hide payment details
- If `'paid'`: show full payment section as currently rendered
- Kitchen copy remains unchanged

**Acceptance criteria:**
- Unpaid orders show "UNPAID" on bill
- Paid orders show full payment details
- Kitchen copy unaffected

---

### Task 9: Frontend -- POS Checkout Remove Payment Step

**Description:** Modify POS checkout flow.

**Frontend changes:**
- `Cart.tsx`: Remove payment method selector and cash-tendered input from primary flow
- Add "Place Order" (no payment) vs "Pay Now" (with payment) toggle
- `api.ts`: Update mutation to conditionally send payment fields
- `store.ts`: Remove payment-related cart fields

**Acceptance criteria:**
- Staff can create order without payment info
- "Pay Now" quick checkout still works for backward compatibility

---

### Task 10: Frontend -- Orders Payment Capture UI

**Description:** Add payment capture to Orders detail page.

**Frontend changes:**
- `OrderDetail.tsx`: Show `paymentStatus` badge; "Mark as Paid" button when unpaid
- New payment capture dialog (reuses `PaymentMethodSelector`)
- `OrderEditForm.tsx`: Disable editing when `paymentStatus: 'paid'`
- `OrderList.tsx`: Add `paymentStatus` column and filter

**Acceptance criteria:**
- "Mark as Paid" button shown for unpaid orders
- Payment capture triggers `PATCH /orders/:id/status`
- Paid orders show green "Paid" badge; unpaid show yellow "Unpaid"
- Cannot edit items on paid order from UI (button disabled)

---

## Final Approved Decisions

| ID | Decision | Source |
|----|----------|--------|
| D1 | Two independent axes: `status` + `paymentStatus` | current_task.md Decision 1 |
| D2 | Items editable until `paymentStatus: paid` | current_task.md Decision 2 |
| D3 | VAT on Category via `vatRate` (rename from `taxRate`) | current_task.md Decision 3 + user |
| D4 | `payment` optional at creation | User approved |
| D5 | Coupon `usageCount` at payment, not placement | User approved |
| D6 | Two transactions: placement + payment | User approved |
| D7 | Revenue requires `paymentStatus: 'paid'` | User approved |
| D8 | Settings.taxConfig never built -- no action | Codebase audit |
| D9 | Kitchen re-notification on item edits | User approved |
| D10 | Cancel anytime before payment; no coupon reversal | User approved |
| D11 | Single bill template, conditional | User approved |
| D12 | Payment via widened `PATCH /orders/:id/status` | User approved |
| D13 | Kitchen copy: no prices, no payment info | User approved (no prices) + codebase (already no prices) |
| D14 | `Category.vatRate` required on create, 0-100 range | User approved |
| D15 | `PATCH /orders/:id/status` accepts payment fields | User approved (chose widening over new endpoint) |
