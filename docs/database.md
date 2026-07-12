# Database Design — Restaurant Management Dashboard

> Derived from `PRD.md` and `ARCHITECTURE.md` (§5, §13, §14). This document is the **field-level schema** for every collection: types, constraints, relationships, indexes, and the data-integrity rules that protect them. It does not redefine decisions already made in `ARCHITECTURE.md` §1 (the assumption table) — it implements them.
>
> Database: **MongoDB (Mongoose ODM)**. Conventions below apply to every collection unless a collection explicitly overrides one.
>
> Per the Golden Rule, this is still skeleton-level: it does not specify API request/response shapes (→ `API.md`) or UI states (→ per-feature specs).

---

## 1. Conventions

| Convention | Rule |
|---|---|
| Primary key | MongoDB default `_id: ObjectId` on every collection |
| Timestamps | `{ timestamps: true }` (Mongoose) → `createdAt`, `updatedAt` on every collection except `ActivityLog`, which is append-only and omits `updatedAt` |
| Soft delete | `isActive: Boolean (default: true)` on **User, Customer, Product** — entities referenced by historical records (Order, Expense, ActivityLog). Matches `ARCHITECTURE.md` §7. Vendor and Category use hard delete. |
| Hard delete | **Coupon, Task, Salary** — no downstream historical references, may be physically removed. Salary deletion is blocked at the service layer if advances exist. |
| Reference naming | `<entity>Id` (e.g. `customerId`, `vendorId`), type `ObjectId` with `ref: '<Collection>'` |
| Money fields | Stored as `Number`, decimal currency value (e.g. `199.50`), **not** integer minor units (paise/cents). **Assumption, flag if wrong:** the PRD doesn't specify multi-currency, so minor-unit storage isn't required for v1; all monetary math is rounded to 2 decimal places at the application layer (Zod `.multipleOf(0.01)`) before persisting, to satisfy the NFR "no rounding/discount errors." |
| Enums | Stored as lowercase string literals, validated by Mongoose `enum` **and** mirrored in a shared Zod schema (per future `AI_RULES.md`) so frontend/backend never drift |
| Text search | Mongoose text indexes only where a module needs free-text search (Products in POS, Customers, Orders) — listed per collection |

---

## 2. Entity Relationship Overview

```text
User ──┬─< ActivityLog (actor)
       ├─< Task (assignedTo, assignedBy)
       ├─< Order (createdBy)
       ├─< Expense (createdBy)
       └─< PasswordResetToken (userId)

Customer ──< Order (customerId, optional)

Category ──< Product (categoryId)
Product ──< OrderItem (embedded snapshot inside Order, productId reference retained)

Coupon ──< Order (couponId, optional)

Vendor ──< Expense (vendorId, optional)

Employee ──┬─< Attendance (employee)
           ├─< Salary (employeeId)
           ├─< SalaryAdjustment (employeeId)
           └─< SalarySummary (employeeId)

Order ── embeds OrderItem[]
Order ── customerId → Customer (optional, walk-ins omit it)
Order ── createdBy → User
Order ── couponId → Coupon (optional)

Settings — singleton, no relationships
Counter — internal helper, no relationships
```

---

## 3. Collections

### 3.1 User

Authentication identity + embedded permission grants (per `ARCHITECTURE.md` §6, permission-based not just role-based).

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✓ | |
| `email` | String | ✓ | unique, lowercase, trimmed |
| `passwordHash` | String | ✓ | bcrypt, cost 12; never returned in API responses |
| `role` | String enum `admin \| manager \| employee` | ✓ | Admin bypasses granular permission checks (§6) |
| `phone` | String | — | Contact number, used in employee management |
| `address` | String | — | Physical address, used in employee management |
| `baseSalary` | Number | — | Default monthly salary rate for employee records; distinct from per-month `baseSalary` in the Salary collection (§3.12) |
| `permissions` | Array of `{ module: String, actions: [String enum `view\|create\|edit\|delete`] }` | — | Ignored/ irrelevant for `admin` role; default-deny if a module is absent for manager/employee |
| `isActive` | Boolean | ✓ (default `true`) | soft-delete / deactivate |
| `lastLoginAt` | Date | — | updated on successful login |

**Indexes:** `email` (unique), `role`, `isActive`.

> **Data integrity note:** `permissions` is embedded rather than a separate collection — it's always read together with the user document (every authenticated request hydrates `req.user.permissions`), has low cardinality (≤18 modules), and is never queried independently across users. A separate `Permission` collection would only add a join on the hottest path (every protected request) for no query benefit.

---

### 3.2 PasswordResetToken

Not explicitly modeled in `ARCHITECTURE.md` §5's collection list, but required to implement the forgot-password flow described in §6. **Addition — flag if a different mechanism (e.g., signed JWT with no persistence) is preferred.**

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId → User | ✓ | |
| `tokenHash` | String | ✓ | SHA-256 of the token sent by email; raw token never stored |
| `expiresAt` | Date | ✓ | short TTL (e.g. 15–30 min) |
| `used` | Boolean | ✓ (default `false`) | set `true` on consumption; prevents replay |

**Indexes:** `tokenHash` (unique), TTL index on `expiresAt` (Mongo auto-expires/removes the document — no cron cleanup needed).

> **Note:** no `RefreshToken` collection in v1. Refresh tokens are stateless JWTs in an httpOnly cookie per §6; immediate revocation via a Redis denylist is explicitly Phase 2+ in the architecture, so nothing needs to be persisted in Mongo for it yet.

---

### 3.3 Category

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✓ | unique |
| `vatRate` | Number | ✓ (default `0`) | VAT percentage for this category (0-100) |

**Indexes:** `name` (unique).

> **Hard delete:** Categories are permanently removed from the database via `DELETE /categories/:id`. Products that reference a deleted category will retain the `categoryId` reference but `populate` will return `null` — historically ordered products are safe because orders store a `categorySnapshot` at creation time.

---

### 3.4 Product

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✓ | |
| `price` | Number | ✓ | current sell price; historical orders use a **snapshot**, not this live value (see 3.9) |
| `categoryId` | ObjectId → Category | ✓ | |
| `image` | `{ url: String, publicId: String }` | — | Cloudinary; `publicId` needed to delete/replace the asset later |
| `description` | String | — | |
| `isActive` | Boolean | ✓ (default `true`) | doubles as the PRD's "availability" toggle |

**Indexes:** `categoryId`, `isActive`, text index on `name` (POS product search per PRD Feature 4).

> **Future scope hook (no schema change needed today):** `ARCHITECTURE.md` §13 defers `stock: Number` for inventory tracking — adding it later is additive and non-breaking, exactly as noted there.

---

### 3.5 Coupon

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | String | ✓ | unique, uppercase, trimmed |
| `discountType` | String enum `flat \| percentage` | ✓ | per `ARCHITECTURE.md` §1 |
| `value` | Number | ✓ | flat amount or percentage (0–100), validated by discountType at the Zod layer |
| `maxDiscountAmount` | Number | — | caps the discount when `discountType: 'percentage'` (prevents a 90%-off coupon on a large order from exceeding business intent) |
| `minOrderAmount` | Number | — | coupon only applicable above this subtotal |
| `validFrom` | Date | ✓ | |
| `validUntil` | Date | ✓ | |
| `isEnabled` | Boolean | ✓ (default `true`) | manual on/off switch independent of the validity window |
| `usageLimit` | Number | — | total redemptions allowed; omit = unlimited |
| `usageCount` | Number | ✓ (default `0`) | incremented atomically on each successful order (see §6) |

**Indexes:** `code` (unique), compound `{ isEnabled: 1, validUntil: 1 }` (fast POS lookup of currently-usable coupons).

> Hard-delete is allowed per §1 conventions. Coupons may be permanently deleted regardless of `usageCount`. Historical orders that referenced the coupon will still exist with their `couponId` intact — the coupon document itself is removed. This is acceptable for v1 because the order's `discountAmount` is a frozen snapshot, not re-derived from the coupon document.

---

### 3.6 Customer

| Field | Type | Required | Notes |
|---|---|---|---|---|
| `name` | String | ✓ | |
| `phone` | String | ✓ | indexed for fast POS lookup/dedupe at order time |
| `email` | String | — | |
| `address` | String | — | |
| `isActive` | Boolean | ✓ (default `true`) | |
| `orderCount` | Number | ✓ (default `0`) | incremented on each POS order placed by this customer |
| `history` | Array of `{ field, oldValue, newValue, changedAt }` | — | audit trail of field changes (name, phone, email, address); pushed on every update via `updateCustomer` or POS order creation |

**Indexes:** `phone`, text index on `name` (Customers module search).

> **Note:** `phone` is the primary customer identifier. When a POS order is placed with `customerPhone` filled in, the server looks up by phone — if found, it updates the customer's name (if provided) and increments `orderCount`; if not found, it creates a new customer. No name-matching is required — phone match is sufficient.
>
> **Hard delete:** Customers are permanently removed from the database via `DELETE /customers/:id`. There is no soft-delete for customers — the `isActive` field remains for informational use.
>
> **`orderCount` is maintained automatically by the POS order-creation flow.** When a POS order is placed with `customerPhone` filled in, the server auto-creates or updates the corresponding `Customer` document and increments `orderCount`. The `updateCustomer` endpoint also preserves previous field values by pushing to `history` before applying changes.

---

### 3.7 Vendor

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✓ | |
| `contactPerson` | String | — | |
| `phone` | String | — | |
| `email` | String | — | |
| `address` | String | — | |
| `itemsSupplied` | [String] | — | free-text tags, not a Product reference (per `ARCHITECTURE.md` §1, vendor↔product linkage is explicitly v2) |
**Indexes:** `name`.

---

### 3.8 Order

The highest-traffic, highest-stakes collection — embeds line items per the read-pattern justification in `ARCHITECTURE.md` §5.

| Field | Type | Required | Notes |
|---|---|---|---|
| `orderNumber` | String | ✓ | human-readable sequential number (e.g. `ORD-000482`), generated via the `Counter` helper (3.9) — never re-derived from `_id` |
| `orderType` | String enum `dine-in \| takeaway \| delivery` | ✓ | |
| `tableNumber` | String | — | only meaningful for `dine-in`; left generic per §13 (future Table/Reservation module) |
| `customerId` | ObjectId → Customer | — | optional; walk-ins omit it |
| `items` | Array of `OrderItem` (embedded, see below) | ✓ (min 1) | |
| `couponId` | ObjectId → Coupon | — | |
| `paymentStatus` | String enum `unpaid \| paid` | ✓ (default `unpaid`) | independent axis from `status`; an order can be `status: completed, paymentStatus: unpaid` (fulfilled, not yet paid). Revenue aggregations require `paymentStatus: 'paid'` |
| `discountAmount` | Number | ✓ (default `0`) | resolved amount, computed at order creation and recomputed on every pre-payment item edit — frozen once `paymentStatus` becomes `paid` |
| `taxAmount` | Number | ✓ (default `0`) | total VAT, computed per-product as `sum(item.lineTotal × category.vatRate / 100)` at order creation, recomputed on pre-payment item edits — frozen once `paymentStatus` becomes `paid`. Stored for VAT reporting; does not affect `grandTotal` |
| `subtotal` | Number | ✓ | sum of `items[].lineTotal` before discount/tax |
| `grandTotal` | Number | ✓ | `subtotal - discountAmount` (VAT is informational — displayed on the bill as part of the total discount line, but does not affect the amount the customer pays) |
| `payment` | `{ method: enum(cash\|card\|bkash\|nagad\|split), splits?: [{ method: enum(cash\|card\|bkash\|nagad), amount: Number }] }` | — | optional at order creation; required at payment capture step |
| `status` | String enum `pending \| completed \| cancelled` | ✓ (default `pending`) | per §1; cancelled orders excluded from all revenue aggregations |
| `createdBy` | ObjectId → User | ✓ | staff member who created the order |
| `completedAt` | Date | — | set on transition to `completed` |
| `cancelledAt` | Date | — | set on transition to `cancelled` |
| `cancelReason` | String | — | required by the service layer when status → `cancelled` |

**Embedded `OrderItem`:**

| Field | Type | Notes |
|---|---|---|
| `productId` | ObjectId → Product | reference retained for reporting joins (e.g. "top 10 items") |
| `nameSnapshot` | String | product name **at order time** |
| `priceSnapshot` | Number | unit price **at order time** |
| `quantity` | Number | ✓, min 1 |
| `lineTotal` | Number | `priceSnapshot × quantity` |

**Indexes:**
- `orderNumber` (unique)
- `{ status: 1, createdAt: -1 }` — compound, covers the Dashboard/Income/Reports date-range + status filters described in `ARCHITECTURE.md` §7
- `customerId`
- `createdBy`
- `items.productId` (multikey — supports "top 10 best-selling items" aggregation)

> **Why snapshot product name/price instead of just `productId`:** if a Product's price changes next week, every past Order referencing it must still show what the customer actually paid and what the bill actually said — re-deriving historical totals from a live Product document would silently corrupt past financial reports. This is the single most important data-integrity rule in the schema.

---

### 3.9 Counter

Internal helper collection (not in `ARCHITECTURE.md` §5's diagram — small, standard addition for atomic human-readable sequence generation). Avoids races that a naive `Order.countDocuments() + 1` would have under concurrent POS terminals (per the multi-terminal real-time requirement in §2/§8).

| Field | Type | Notes |
|---|---|---|
| `_id` | String | sequence name, e.g. `'orderNumber'` |
| `seq` | Number | incremented via `findOneAndUpdate({ $inc: { seq: 1 } }, { upsert: true, new: true })` — atomic at the Mongo level |

---

### 3.10 Task

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | String | ✓ | |
| `description` | String | — | |
| `assignedTo` | ObjectId → User | ✓ | |
| `assignedBy` | ObjectId → User | ✓ | |
| `priority` | String enum `low \| medium \| high` | ✓ | |
| `deadline` | Date | ✓ | |
| `status` | String enum `pending \| in_progress \| completed` | ✓ (default `pending`) | per §1 |
| `completedAt` | Date | — | set on transition to `completed` |

**Indexes:** `{ assignedTo: 1, status: 1 }` (assignee's task list), `priority`, `deadline`.

---

### 3.11 Attendance

Tracks daily attendance per employee with status-based marking (present/absent/late/half-day).

| Field | Type | Required | Notes |
|---|---|---|---|
| `employee` | ObjectId → Employee | ✓ | The employee being marked |
| `date` | Date | ✓ | normalized to midnight UTC — one record per employee per day |
| `status` | String (enum) | ✓ | `'present'` \| `'absent'` \| `'late'` \| `'half-day'` |
| `checkInAt` | Date | — | Optional — when they arrived (meaningful for present/late) |
| `checkOutAt` | Date | — | Optional — when they left |
| `notes` | String | — | e.g. "called in sick", "left early — approved by manager" |
| `markedBy` | ObjectId → User | ✓ | Who marked/took this attendance |

**Indexes:** unique compound `{ employee: 1, date: 1 }` — guarantees one attendance record per employee per day.

> `hoursWorked` is intentionally **not stored** — derived from `checkOutAt - checkInAt` at query/report time.
>
> **Cascade delete:** When an Employee document is deleted, all Attendance records referencing that employee are automatically removed. See `Employees` module deletion logic.

---

### 3.12 Salary

Monthly salary records for employees, with advance tracking. `baseSalary` is fixed — derived from the referenced Employee record, not user-entered. When a salary is created, the `paidAmount` is stored as the first advance entry.

| Field | Type | Required | Notes |
|---|---|---|---|
| `employeeId` | ObjectId → User | ✓ | The employee whose salary this is |
| `baseSalary` | Number | ✓ | Monthly base salary amount |
| `month` | Number | ✓ | 1–12 |
| `year` | Number | ✓ | e.g. 2026 |
| `advances` | Array of `SalaryAdvance` | — | Partial salary payments made during the month |
| `status` | String enum `active \| paid \| cancelled` | ✓ (default `active`) | `paid` when total advances = base salary |

**Embedded `SalaryAdvance`:** `{ amount: Number, date: Date, note?: String, createdBy: ObjectId → User }`

**Computed fields (not stored):** `totalPaid` (sum of advance amounts), `remainingBalance` (baseSalary - totalPaid).

**Indexes:** unique compound `{ employeeId: 1, month: 1, year: 1 }`, `{ month: 1, year: 1 }`, `{ status: 1 }`.

> **Guard:**
> - A salary record with `status !== 'active'` cannot receive new advances.
> - An advance that would exceed `remainingBalance` is rejected.
> - A salary record with existing advances cannot be hard-deleted.
> - `status: 'cancelled'` is only allowed when `advances` is empty.

### 3.13 SalaryAdjustment

Records bonuses and salary cuts (deductions) for employees. Each adjustment is a single entry specifying whether it is a bonus (positive adjustment) or cut (negative adjustment).

| Field | Type | Required | Notes |
|---|---|---|---|
| `employeeId` | ObjectId → Employee | ✓ | The employee this adjustment applies to |
| `salaryId` | ObjectId → Salary | — | Optional link to a specific monthly salary record |
| `type` | String enum `bonus \| cut` | ✓ | Whether this is a bonus or a salary cut/deduction |
| `amount` | Number | ✓ | Positive amount (always stored as positive; the `type` field determines whether it adds or subtracts) |
| `reason` | String | ✓ | Free-text reason (e.g. "Late coming", "Festival bonus", "Good work") |
| `date` | Date | ✓ | Date the adjustment was applied |
| `month` | Number | ✓ | 1–12 |
| `year` | Number | ✓ | e.g. 2026 |
| `createdBy` | ObjectId → User | ✓ | Who recorded the adjustment |

**Indexes:** `{ employeeId: 1, month: 1, year: 1 }`, `{ salaryId: 1 }`, `{ type: 1 }`.

### 3.14 SalarySummary

Monthly salary summary per employee, computed from the salary record and all adjustments. Auto-created on first query if it doesn't exist, and can be regenerated on demand.

| Field | Type | Required | Notes |
|---|---|---|---|
| `employeeId` | ObjectId → Employee | ✓ | The employee |
| `month` | Number | ✓ | 1–12 |
| `year` | Number | ✓ | e.g. 2026 |
| `totalSalary` | Number | ✓ (default 0) | Base salary from the monthly Salary record |
| `totalBonus` | Number | ✓ (default 0) | Sum of all bonus adjustments for this period |
| `totalCut` | Number | ✓ (default 0) | Sum of all cut adjustments for this period |
| `totalPaid` | Number | ✓ (default 0) | Sum of all advances paid |
| `netSalary` | Number | ✓ | `totalSalary + totalBonus - totalCut` |

**Indexes:** unique compound `{ employeeId: 1, month: 1, year: 1 }`, `{ month: 1, year: 1 }`.

### 3.15 Expense

| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | Number | ✓ | |
| `date` | Date | ✓ | |
| `description` | String | ✓ | |
| `category` | String | ✓ | free-text/select (e.g. "Utilities", "Ingredients", "Maintenance") — not its own collection; PRD doesn't request expense-category CRUD, unlike Product categories |
| `vendorId` | ObjectId → Vendor | — | optional per §1 |
| `paidBy` | ObjectId → User | ✓ | staff member who actually made the payment — may differ from `createdBy`, who only recorded the entry |
| `paidTo` | String | ✓ | name of the recipient/payee; free text so it covers ad-hoc payments (e.g. a delivery rider, a utility company) not registered as a Vendor — when `vendorId` is set, this typically mirrors the vendor name for record consistency |
| `paymentMethod` | String enum `cash \| card \| bkash \| nagad` | ✓ | how the expense was paid; same method set as `Order.payment.method` (minus `split`, since an expense is recorded as a single payment) for consistency across the app |
| `createdBy` | ObjectId → User | ✓ | |

**Indexes:** `date`, `category`, `vendorId`, `paidBy`.

---

### 3.14 ActivityLog

Append-only audit trail, written by the global `activityLogger` middleware (`ARCHITECTURE.md` §4) on every mutating request.

| Field | Type | Required | Notes |
|---|---|---|---|
| `actor` | ObjectId → User | ✓ | |
| `module` | String | ✓ | matches the 18 PRD modules (e.g. `'orders'`, `'products'`) |
| `action` | String | ✓ | dot-notation taxonomy, e.g. `'order.completed'`, `'user.created'`, `'product.deleted'` — exact enum/taxonomy to be finalized in `API.md` (see §9) |
| `targetId` | ObjectId | — | id of the affected document |
| `targetType` | String | — | collection name of the affected document |
| `description` | String | ✓ | human-readable, e.g. `"Order #482 completed by Employee X"` — generated server-side, never user-supplied free text, to keep the audit trail tamper-resistant |
| `metadata` | Mixed | — | optional structured diff/context (e.g. `{ before, after }` for edits) |

No `updatedAt` — log entries are immutable once written.

**Indexes:** `{ actor: 1, createdAt: -1 }`, `{ module: 1, createdAt: -1 }`, `createdAt: -1` (default reverse-chronological feed).

> **Integrity rule:** no API route ever allows update on this collection — enforced by simply never registering `PUT`/`PATCH` handlers for it. A single `DELETE /activity-log` endpoint exists to clear all entries, gated by the `activity-log:delete` permission (admin-only in practice).

---

### 3.15 Settings

Singleton — exactly one document for the whole restaurant (single-tenant per `ARCHITECTURE.md` §1).

| Field | Type | Required | Notes |
|---|---|---|---|
| `restaurantName` | String | ✓ | |
| `address` | String | — | |
| `logo` | `{ url: String, publicId: String }` | — | |
| `contactNumber` | String | — | |
| `businessHours` | `[{ day: String, open: String, close: String }]` | — | |
| `vatInfo` | `{ bin: String, mushak: String }` | — | VAT registration details — BIN (Business Identification Number) and Mushak number |

**Enforcing singleton:** fixed, well-known `_id` (e.g. the string `'restaurant-settings'`) so `upsert` always targets the same document — simpler and more explicit than an app-level "only one document" check.

---

## 4. Indexing Strategy — Summary

| Collection | Index | Purpose |
|---|---|---|
| User | `email` (unique) | login lookup |
| PasswordResetToken | `tokenHash` (unique), TTL on `expiresAt` | reset flow + auto-cleanup |
| Category | `name` (unique) | dedupe, list sort |
| Category | — | no `isActive` index — hard-deleted, no status filter needed |
| Product | `categoryId`, `isActive`, text(`name`) | filtered lists, POS search |
| Coupon | `code` (unique), `{isEnabled, validUntil}` | redemption lookup |
| Customer | `phone`, text(`name`) | POS lookup, search |
| Vendor | `name` | list/search |
| Order | `orderNumber` (unique), `{status, createdAt}`, `customerId`, `createdBy`, `items.productId` | listing, date-range reports, top-sellers |
| Task | `{assignedTo, status}`, `priority`, `deadline` | assignee views, filters |
| Attendance | `{employee, date}` (unique) | one record/day per employee |
| Salary | `{employeeId, month, year}` (unique), `{month, year}`, `{status}` | per-employee monthly records, reports |
| SalaryAdjustment | `{employeeId, month, year}`, `{salaryId}`, `{type}` | lookups by employee, period, or type |
| SalarySummary | `{employeeId, month, year}` (unique), `{month, year}` | monthly summary queries |
| Expense | `date`, `category`, `vendorId` | reports, filters |
| ActivityLog | `{actor, createdAt}`, `{module, createdAt}` | audit views |

All `isActive`-bearing collections additionally get an index on `isActive` where it's a common list-filter predicate (Product, Customer) — omitted above where the field is rarely filtered on its own (User already covered by other compound use).

---

## 5. Data Integrity & Transactions

1. **Order creation transaction** (per `ARCHITECTURE.md` §5): a single Mongo multi-document transaction covers (a) `Counter` increment for `orderNumber`, (b) the `Order` insert, (c) `Coupon.usageCount` atomic `$inc` if a coupon was applied, and (d) the `ActivityLog` write. If any step fails, the whole transaction rolls back — no partial order, no double-counted coupon usage, no missing audit entry.
2. **Coupon usage race condition:** two POS terminals applying the same near-limit coupon simultaneously is resolved by the atomic `$inc` happening *inside* the transaction in step 1, combined with a service-layer check (`usageCount < usageLimit`) re-validated within the same transaction before commit — not checked-then-acted-on as two separate operations.
3. **Snapshot pricing** (3.8): protects historical financial accuracy against later Product price edits — the single most important rule in this schema, called out again here because it touches both Reports and Income accuracy (NFR: "no rounding/discount errors").
4. **Cancelled orders excluded from revenue:** every aggregation pipeline (Dashboard metrics, Income, Sales Report) must filter `status: { $ne: 'cancelled' }` — this is a query-discipline rule, not a schema constraint, and should be centralized in one shared aggregation helper rather than repeated per endpoint to avoid one module forgetting it.
5. **Referential soft-delete:** Product/Customer soft-deletes never cascade-delete or null-out the foreign key on existing Orders/Expenses — old documents keep pointing at the (now-inactive) referenced document so historical detail views and reports remain fully reconstructable. Vendor and Category hard-deletes naturally null-populate references (Mongoose `.populate()` returns `null` for deleted refs); existing Order data remains intact via snapshot fields.
6. **Attendance uniqueness:** the `{employee, date}` unique index is the actual guard against duplicate check-ins (not just service-layer logic), so it holds even under a retried/duplicated request.

---

## 6. Normalization Notes

- **Order embeds OrderItems** — justified in `ARCHITECTURE.md` §5: line items are read as part of the whole order far more often than queried independently; embedding avoids a join on the hottest read path (order detail, bill printing, reports) and keeps a bill a single document fetch.
- **User embeds permissions** — see 3.1 rationale: always co-read with the user, low cardinality, never queried cross-user.
- **Expense.category is a free-text field, not a reference** — unlike Product's Category collection, the PRD doesn't request CRUD or filtering UI for expense categories beyond a simple filter dropdown; introducing a second "Category" concept (Product categories vs Expense categories) under one collection would conflate two different domains. If expense-category management (add/rename/merge) becomes a real need, promote it to its own `ExpenseCategory` collection then — no other schema impacted.
- **Vendor.itemsSupplied is a string array, not a Product reference** — matches `ARCHITECTURE.md` §1's explicit decision that vendor↔product linkage is out of v1 scope.

---

## 7. Scaling Considerations (Forward-Looking, No Action Needed Now)

Mirrors `ARCHITECTURE.md` §13 — listed here only where it has a *specific* schema consequence, so a future implementer knows exactly what to touch:

| Future Enhancement | Schema Touchpoint |
|---|---|
| Multi-location/multi-tenant | Add `restaurantId: ObjectId` to **every** collection above (most invasive single change in this document); all unique indexes (e.g. `Coupon.code`, `Category.name`) would need to become compound with `restaurantId` |
| Product inventory/stock | Add `Product.stock: Number`; Order-creation transaction (§5) would gain a stock-decrement step |
| Vendor↔Product linkage | Add `Product.vendorId` or a join collection `ProductVendor` |
| Online payment gateway | New `Payment` collection (gateway transaction id, status, webhook events) referenced from `Order.payment` instead of the current record-keeping-only object |
| Table/reservation management | New `Table`/`Reservation` collections; `Order.tableNumber` (already a generic string field) becomes a proper `tableId` reference |
| QR self-ordering | `Order` gains a `source: enum(staff\|qr)` field; no other structural change |

---

## 8. Open Items Carried Forward to `API.md`

1. **ActivityLog `action` taxonomy** — the exact enum/string list (e.g. `order.completed`, `order.cancelled`, `user.created`, `product.deleted`, …) should be finalized when each module's endpoints are defined, so every mutating endpoint maps to exactly one action string.
2. ~~**Settings.taxConfig mode** — confirm whether v1 needs `itemized` (per-category tax rates) or whether a single flat `rate` covers all current requirements; affects POS tax-calculation logic and `Order.taxAmount` derivation.~~ **RESOLVED:** The system uses a per-category VAT model (`Category.vatRate`). The old `taxConfig` has been removed. VAT is calculated per line item and is informational (does not inflate `grandTotal`).
3. ~~**Expense.category values** — confirm whether this should be a fixed enum (cleaner filtering, matches "Filter expenses by category" in PRD Feature 9) or free text (more flexible, harder to filter cleanly). Leaning enum; needs sign-off before `API.md` defines the validation schema.~~ **RESOLVED:** free text, not enum. Both `DATABASE.md` §3.12 (field definition) and the §6 normalization note already describe `category` as free-text; confirmed during Expense implementation planning. See `tasks/implementation_plan.md`.
4. **Coupon `usageLimit` scope** — confirm whether the limit is global (current schema: total redemptions across all customers) or per-customer; the latter would require a `CouponRedemption` join collection instead of a single `usageCount` field.

---