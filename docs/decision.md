# Decisions Log — Restaurant Management Dashboard

> Append-only running log of decisions made while implementing a feature that resolve an "open item" tracked in `AI_rules.md` §13, `database.md` §8, or `API.md` §25 — or that otherwise deviate from / clarify an upstream doc.
>
> **This file is the history of *why*. The upstream docs (`PRD.md`, `architecture.md`, `database.md`, `API.md`, `AI_rules.md`) remain the *current truth*.** Don't let a decision live only here — if you log a decision below, the corresponding doc must already reflect it.
>
> Workflow: per `backlog.md`'s "How to Use This File" step 5, copy `current_task.md`'s "Notes / Decisions Made During This Task" section here right before clearing that file for the next pick.

---

## Format

```
### [Backlog #] Task Name — YYYY-MM-DD

**Open item resolved:** (cite source, e.g. `API.md §25.4`)
**Decision:**
**Doc(s) updated:** (file + section)
**Reasoning:**
```

---

## Log

### [—] Permission List Alignment: Sidebar Uses `salary` Module Key — 2026-07-17

**Open item resolved:** Sidebar Salaries nav item used `module: 'expenses'` while the backend routes used `salary` and the page used `PermissionGate module="salary"`. This mismatch meant a user with `expenses:view` could see the Salaries nav link but then be denied by the page's `salary` permission gate.

**Decision:** Changed the Salaries nav item in `Sidebar.tsx` from `module: 'expenses'` to `module: 'salary'` — the correct permission key that matches the backend routes and page gate. The `salary` module key was already fully defined in both `MODULE_ACTIONS` constants (`view`, `create`, `edit`, `delete`).

**Doc(s) updated:**
- `API.md` §24 (salary: removed "Reserved — not used" note, added active description)
- `decision.md` (this entry)

**Files changed:**
- `frontend/src/components/shared/Sidebar.tsx` (changed Salaries module from `'expenses'` to `'salary'`)

**Reasoning:** Every feature should use its own module key for permission checks. Using `expenses` for Salaries was a leftover from the initial implementation when salaries were a tab inside Expenses. Now that Salaries is a standalone section, it should use its own `salary` permission key consistently across sidebar, page gate, and backend routes.

### [—] QA Fix Batch — Category Snapshot, Coupon Validate, Default Status, Payment Filter — 2026-07-11

**Open items resolved:** Multiple — see individual decisions below.

**Decision:** Batch of 22 QA fixes addressing priority items from the implementation plan. Key architectural decisions:

1. **Order item category snapshot** (`CM-FIX-01`): Added `categorySnapshot` (`{ categoryId, name }`) to `IOrderItem`/`orderItemSchema`. Resolved from live `Category` at order creation (`pos.service.ts`) and item edit (`orders.service.ts`). Report pipelines (`byProduct`/`byCategory`) replaced `$lookup` joins with direct `$items.categorySnapshot` reads — no cross-collection aggregation.

2. **Socket event naming** (`CM-FIX-03`): POS order creation emits both legacy `pos:order_created` and canonical `order:created` + `dashboard:metricsInvalidate`. The `order:paid` path also emits `dashboard:metricsInvalidate`.

3. **Default status `pending`, `completedAt` only on explicit completion** (`POS-FIX-02`): POS order creation defaults to `pending` (was `completed`). `completedAt` is only set when status is explicitly transitioned to `completed`.

4. **Coupon validation as POST** (`POS-FIX-01`): Changed from `GET /pos/coupon?code=` to `POST /pos/coupons/validate` with `{ code, subtotal, customerId? }`. Returns `{ valid, reason?, couponId?, discountType?, value?, discountAmount? }` with typed reason codes (`NOT_FOUND`, `DISABLED`, `NOT_YET_VALID`, `EXPIRED`, `BELOW_MIN_ORDER`, `USAGE_LIMIT_REACHED`).

5. **`paymentStatus` filter** (`ORD-FIX-01`): Added to Orders list query params for filtering by `unpaid`/`paid`.

6. **Non-cash payment `transactionId` validation** (`ORD-FIX-02`): Zod refine requiring `transactionId` when `payment.method !== 'cash'`; service-layer check prevents `null` transactionId from persisting.

7. **Salary report filtering** (`REP-FIX-01`): Changed from `createdAt` date range to `month`/`year` integer fields.

8. **Tightened POS catalog auth** (`CM-FIX-04`): `GET /pos/products` authorization narrowed from `authorize(['pos', 'orders'], 'view')` to `authorize('pos', 'view')`.

9. **Stripped client financial fields from POS validation** (`CM-FIX-02`): Removed `discountAmount`, `taxAmount`, `subtotal`, `grandTotal` from POS create-order validation — server always recalculates.

**Doc(s) updated:**
- `decision.md` (this entry)
- `API.md` §10 (widened PUT `/orders/:id` description), §24 (salary reserved row)

**Files changed:**
- `backend/src/models/Order.ts` (added `categorySnapshot` to item schema)
- `backend/src/modules/pos/pos.service.ts` (category snapshot resolution, coupon validation, socket events, default status)
- `backend/src/modules/pos/pos.validation.ts` (stripped financial fields, validateCouponSchema)
- `backend/src/modules/pos/pos.routes.ts` (auth scope fix, new coupon route)
- `backend/src/modules/pos/pos.controller.ts` (coupon validate handler)
- `backend/src/modules/orders/orders.service.ts` (category snapshot on item edit, non-cash payment validation, socket event)
- `backend/src/modules/orders/orders.validation.ts` (paymentStatus filter, non-cash transactionId refine)
- `backend/src/modules/reports/reports.helper.ts` (removed $lookup, uses categorySnapshot)
- `backend/src/modules/reports/reports.service.ts` (salary month/year filter)
- `frontend/src/features/pos/api.ts` (coupon mutation to POST)
- `frontend/src/features/pos/components/CouponInput.tsx` (rewritten for new response shape)
- `frontend/src/features/orders/components/OrderFilters.tsx` (paymentStatus dropdown)
- `frontend/src/features/orders/api.ts` (paymentStatus param)
- `frontend/src/features/orders/schema.ts` (paymentStatus filter schema)
- `frontend/src/app/(dashboard)/orders/page.tsx` (paymentStatus integration, socket listener update)

**Reasoning:**
- Category snapshot follows the established snapshot pattern (`nameSnapshot`/`priceSnapshot`), ensuring reports remain accurate even when categories are renamed later. Replacing `$lookup` with a snapshot field eliminates a slow cross-collection aggregation step in report generation.
- Dual socket emit (`pos:order_created` + `order:created`) maintains backward compatibility while moving toward a canonical event namespace.
- Defaulting to `pending` (not `completed`) allows cashiers to explicitly review and complete orders, preventing accidental automatic completion before payment is confirmed.
- POST-based coupon validation supports a request body with `subtotal` and `customerId`, enabling server-side computation of `discountAmount` and `minOrderAmount` checks that a GET query string couldn't cleanly express. Structured response with typed reason codes gives the frontend deterministic error display for each failure mode.
- `paymentStatus` filter matches the existing `status` filter pattern and supports the "show unpaid orders only" workflow on the Orders page.
- Requiring `transactionId` for non-cash payments prevents incomplete payment records from being persisted with a null transaction reference.
- Salary reports by `month`/`year` integers (rather than `createdAt` range) aligns with the Salary model's compound index on `{employeeId, month, year}` and avoids date-range ambiguity at month boundaries.

### [—] Salary — Independent Dashboard Section — 2026-07-08

**Open item resolved:** N/A — structural reorganization of existing feature.

**Decision:** Extracted the Salaries tab (previously embedded in the Expenses page) into its own standalone dashboard section. Created `/salaries` page independent from `/expenses`. Added a "Salaries" nav item in the sidebar using the `expenses` permission module key. The backend API routes (already at `/salaries`, `/salary-adjustments`, `/salary-summary`) continue to use the `expenses` permission key — no new module key was invented. The `salary` module key in `frontend/src/lib/constants.ts` is retained for forward compatibility but is not used by any backend route.

**Doc(s) updated:**
- `API.md` §14 (removed salaries subsections), §15 (new top-level Salaries section), renumbered all subsequent sections (§16–§26)
- `decision.md` (this entry)

**Files changed:**
- Created `frontend/src/app/(dashboard)/salaries/page.tsx`
- Modified `frontend/src/app/(dashboard)/expenses/page.tsx` (removed salaries tab, dialogs, state)
- Modified `frontend/src/components/shared/Sidebar.tsx` (added Salaries nav item)

**Reasoning:**
- Salaries are now a first-class section alongside other modules, not buried as a tab inside Expenses.
- No backend changes needed — the salary API routes were already registered independently under `/salaries`.
- Using `expenses` permission key for the sidebar item keeps the security check consistent with the backend routes, avoiding a new permission key that would need backend updates.
- The `salary` frontend constant entry exists but unused — it was added previously and removing it could break permission configurations. Left in place for future use if the backend ever adopts a dedicated `salary` permission key.

### [7a/7b] Salary Bonus & Cut (Adjustments + Summary) — 2026-07-08

**Open item resolved:** N/A — enhancement of existing Salary feature.

**Decision:** Added a `SalaryAdjustment` collection with `type` (bonus/cut), `amount`, `reason`, and `date` fields to support per-employee bonuses and salary deductions. Added a `SalarySummary` collection for monthly per-employee computed summaries (`totalSalary`, `totalBonus`, `totalCut`, `netSalary` = `totalSalary + totalBonus - totalCut`).

**Backend:**
- `SalaryAdjustment` model with compound index `{employeeId, month, year}`, optional `salaryId` link
- `SalarySummary` model with unique compound index `{employeeId, month, year}`
- 5 new service functions: `listAdjustments`, `getAdjustmentById`, `createAdjustment`, `deleteAdjustment`, `getOrCreateSalarySummary`
- 5 new controller handlers, 5 new routes under existing salaries router with `expenses` permission
- Validation schemas for create adjustment, list adjustments query, and summary query

**Frontend:**
- `SalaryAdjustmentDialog` (new) — modal with employee select, type toggle (bonus/cut), amount, reason (preset options + custom), date picker
- `SalaryList` — added Bonus, Cut, Net columns; Gift (bonus) and Minus (cut) action buttons
- `SalaryDetailDialog` — added adjustments list with delete button; summary section now shows Bonus, Cut, Net Salary, Paid
- Navbar buttons for "Add Bonus" / "Add Cut" quick actions

**Doc(s) updated:**
- `database.md` §3.13 (SalaryAdjustment schema), §3.14 (SalarySummary schema), §4 (new index entries)
- `API.md` §15.1 (adjustments endpoints), §15.2 (summary endpoint), §24 (ADJUSTMENT_EXCEEDS_SALARY error code)
- `TEST_CASES.md` §20 (20 adjustment test cases: ADJ-H-01–ADJ-E-02), §21 (6 summary test cases: SUM-H-01–SUM-H-03), renumbered subsequent sections
- `decision.md` (this entry)

**Reasoning:**
- Separate `SalaryAdjustment` collection (not embedded) allows independent CRUD and querying by type/employee/period without loading the entire salary document.
- `SalarySummary` is a pre-computed read model that avoids recomputing net salary on every view. Auto-created on first query — no separate write workflow.
- Financial fields are snapshot-only (no edits to adjustments post-creation) to maintain audit integrity.
- Reuses `expenses` permission module key, consistent with the existing Salary sub-feature.
- The `amount` field is always stored as a positive absolute value; the `type` field (`bonus`/`cut`) determines whether it adds or subtracts from net salary, avoiding confusion with negative numbers.

### [10/11] Bill / Receipt Generation (Template + Endpoint) — 2026-07-01

**Open items resolved:** N/A — all four open items from the planning phase were already resolved by prior work:
- Item 4 (Settings BIN/VAT form reference) → resolved by decision [4b] (Settings vatInfo)
- Item 3 (Cash payment tendered/returned) → already existed as `Order.cashTendered`/`changeAmount`
- Item 2 (Auto Round) → implemented as display-only computed value at render time, no schema change
- Item 1 (VAT conditionally rendered) → uses `Settings.vatInfo.bin` presence + `order.taxAmount > 0` as trigger

**Decision:** Enhanced the existing `renderBillHtml` template to produce a full thermal-receipt-style bill matching the reference design. The template now consumes `Settings` data (logo, restaurant name, address, phone, BIN, Mushak) for the header, displays all order fields (table, waiter, date/time, invoice, items, subtotal, discount, VAT, auto-round, grand total), payment details (method, cash tendered, change returned), and a footer. The `getOrderBill` service method fetches the `Settings` singleton and passes it to the template. Auto-round is computed as `Math.round(grandTotal) - grandTotal` and shown as a display-only line when non-zero. VAT line only renders when both `vatInfo.bin` is populated AND `taxAmount > 0`.

**Doc(s) updated:** None — the template lives in `orders.service.ts`; the bill endpoint, route, and schema already existed. Tests updated with new assertions matching the enhanced output.

**Files changed:**
- `backend/src/modules/orders/orders.service.ts` (renderBillHtml: full receipt template; getOrderBill: fetches Settings)
- `backend/tests/orders.test.ts` (updated renderBillHtml tests, added Settings mock to getOrderBill tests)

**Reasoning:** The basic template already shipped with the Orders module was functional but minimal — it didn't use Settings data, omitted cash tendered/change, and lacked the receipt-style layout the reference design calls for. These enhancements make the bill production-ready for both on-screen preview and PDF print/download, without changing the endpoint contract. Auto-round is intentionally display-only (never stored) to avoid schema complexity for a cosmetic rounding line.

### [3] Users & Permissions — 2026-06-22

**Open items resolved:** `API.md §25.4`, `AI_rules.md §13.4`
**Decision:** Admin sets password directly on `POST /users` (Option B, not email-based invite). `GET /users/:id` returns `200` with `isActive: false` for inactive users.
**Doc(s) updated:** `API.md §5` (removed "also used for first-time account setup"), `API.md §6` (replaced reset-flow note with admin-sets-password explanation), `API.md §25.4` (marked resolved), `AI_rules.md §13.4` (marked resolved)
**Reasoning:** Option B is simpler, removes email-provider dependency, gives admin immediate certainty the account is usable. Returning 200 for inactive users allows the client to decide rendering.

### [6] Customer Phone-First Matching, Auto-Refresh & Hard Delete — 2026-06-30

**Open item resolved:** `DATABASE.md` §3.6 (Customer — soft-delete vs hard-delete), `PRD.md` §17 (Customers — "should be linked to their order history")

**Decision:**
1. **Phone is the primary customer identifier.** POS order creation matches solely by `customerPhone`. If a phone match is found, the customer record is updated (name changed if provided, `orderCount` incremented) — no name-matching required. If no match, a new customer is created.
2. **Hard delete** — `DELETE /customers/:id` permanently removes the document (`findByIdAndDelete`). The `isActive` field remains on the model for informational use but is not returned in API responses.
3. **Auto-refresh** — React Query's `['customers']` key is invalidated after POS order creation, so the customer list auto-refreshes without manual page reload.
4. **`isActive` removed from API response** — The response no longer includes `isActive`. Displayed fields are: name, phone, orderCount.

**Doc(s) updated:**
- `DATABASE.md` §3.6 (updated notes — hard delete, phone-primary matching)
- `API.md` §18 (response shapes — removed `isActive`, hard delete docs)
- `TEST_CASES.md` §14 (updated CUST-H-06–H-08, added CUST-CROSS-04)
- `backend/src/modules/pos/pos.service.ts` (simplified customer matching)
- `backend/src/modules/customers/customers.service.ts` (hard delete, removed isActive from response)
- `frontend/src/features/customers/api.ts` (removed isActive from response type)
- `frontend/src/features/customers/components/CustomerList.tsx` (removed isActive filter, Status column, changed Deactivate to Delete)
- `frontend/src/app/(dashboard)/customers/DeleteCustomerDialog.tsx` (hard delete confirmation)
- `frontend/src/features/pos/api.ts` (auto-refresh customers after order)

**Reasoning:** Phone is the most practical unique identifier for restaurant customers (many share names, few share phones). Hard delete matches the user's operational preference — admins want to permanently remove customers, not just deactivate them. Auto-refresh removes a friction point where staff had to manually refresh the customers page after placing an order.

### [6] Vendor Hard Delete — 2026-07-01

**Open item resolved:** `PRD.md` §10 (Vendors — specifies "delete" not "deactivate"), `DATABASE.md` §3.7 (Vendor — previously soft-delete via `isActive`)

**Decision:** Vendors switch from soft-delete (`isActive: false`) to hard delete (`findByIdAndDelete`). The `isActive` field is removed from the model, validation schemas, service response, and all frontend types. Delete buttons replace deactivate/reactivate buttons in the UI. The existing DELETE endpoint changes from `findByIdAndUpdate` with `isActive: false` to `findByIdAndDelete`.

**Doc(s) updated:**
- `DATABASE.md` §1 (removed Vendor from soft-delete list), §3.7 (removed isActive from Vendor schema), §5 (updated index note), §7.5 (updated referential soft-delete note)
- `API.md` §16 (removed isActive from GET query params, changed DELETE to hard delete)
- `TEST_CASES.md` §10 (EXP-E-01 updated), §11 (VEN-H-02–VEN-E-01 updated), §20 (XMOD-08 updated)
- `AI_rules.md` §6 (removed Vendor from soft-delete collections list)
- `theme.md` §Badge variants (removed Vendor from isActive badge table)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/models/Vendor.ts` (removed isActive field + index)
- `backend/src/modules/vendors/vendors.validation.ts` (removed isActive from update + list schemas)
- `backend/src/modules/vendors/vendors.service.ts` (removed isActive from response/filtering, changed delete to hard delete)
- `frontend/src/features/vendors/api.ts` (removed isActive from VendorResponse + list params)
- `frontend/src/features/vendors/schema.ts` (removed isActive from update schema)
- `frontend/src/features/vendors/components/VendorList.tsx` (removed status filter + deactivate/reactivate, added delete button)
- `frontend/src/features/vendors/components/VendorDetail.tsx` (replaced deactivate with delete dialog)
- `frontend/src/app/(dashboard)/vendors/page.tsx` (wired DeleteVendorDialog, fixed onDelete bug)
- `frontend/src/app/(dashboard)/vendors/DeleteVendorDialog.tsx` (new file — delete confirmation dialog)
- `frontend/src/features/expenses/components/ExpenseForm.tsx` (removed isActive from useVendorsList call)
- `frontend/src/features/expenses/components/ExpenseList.tsx` (removed isActive from useVendorsList call)

**Reasoning:** PRD.md §10 specifies "delete" not "deactivate", matching the same hard-delete pattern already used in Customers and Coupons modules. Removing isActive simplifies the UI (no status filter, no deactivate/reactivate toggle) and aligns with operational intent — admins want to permanently remove vendors, not soft-deactivate them. Existing expenses referencing a deleted vendor preserve the payee name via the `paidTo` snapshot field, so historical reporting remains intact.

### [5] Customer Auto-Creation & History — 2026-06-30

**Open item resolved:** `PRD.md` §17 (Customers — "should be linked to their order history"), `DATABASE.md` §3.6 (Customer — previously no `orderCount`/`history` fields)

**Decision:** POS order creation auto-creates or updates `Customer` documents when `customerName`/`customerPhone` are provided. If a customer with that phone already exists, their `orderCount` is incremented and their name is updated (with the old name pushed to `history`). The `updateCustomer` endpoint also pushes changed field values to `history`. The customer's `orderCount` field tracks total orders placed. `GET /customers/:id?includeOrders=true` populates actual orders from the `Order` collection.

**Doc(s) updated:**
- `DATABASE.md` §3.6 (added `orderCount` and `history` fields)
- `API.md` §18 (updated response shapes, added customer-auto-creation documentation)
- `TEST_CASES.md` §14 (added CUST-H-07–CUST-H-11, CUST-CROSS-03, CUST-E-02)

### [6] Category Hard Delete (remove soft-delete) — 2026-07-13

**Open item resolved:** `PRD.md` (Categories — previously soft-deleted via `isActive`), `DATABASE.md` §3.3 (Categories — soft-delete with integrity rule)

**Decision:** Categories switch from soft-delete (`isActive: false`) to hard delete (`findByIdAndDelete`). The `isActive` field is removed from the model, validation schemas, service response, and all frontend types. Delete buttons replace deactivate/reactivate buttons in the UI. The existing DELETE endpoint changes from `findByIdAndUpdate` with `isActive: false` to `findByIdAndDelete`.

**Doc(s) updated:**
- `DATABASE.md` §1 (removed Category from soft-delete list), §3.3 (removed isActive from Category schema), §4 (updated index table), §5 (updated referential soft-delete note)
- `API.md` §18 (removed isActive from GET query params, changed DELETE to hard delete)
- `AI_rules.md` §6 (removed Category from soft-delete collections list)
- `architecture.md` §7 (removed Category from soft-delete list)
- `theme.md` §6 (removed Categories from isActive badge table)

**Files changed:**
- `backend/src/models/Category.ts` (removed isActive field + index)
- `backend/src/modules/categories/categories.validation.ts` (removed isActive from update + list schemas)
- `backend/src/modules/categories/categories.service.ts` (removed isActive from response/filtering, changed delete to hard delete)
- `frontend/src/features/categories/api.ts` (removed isActive from CategoryResponse + list params, removed `usePermanentDeleteCategory`)
- `frontend/src/features/categories/components/CategoryList.tsx` (removed status filter + deactivate/reactivate, added delete button)
- `frontend/src/features/categories/components/DeleteCategoryDialog.tsx` (simplified to hard delete only, removed permanent prop)
- `frontend/src/app/(dashboard)/categories/page.tsx` (removed permanent delete state + second dialog)

**Reasoning:** Consistent with the same hard-delete pattern already used in Vendors and Customers modules. Categories have no downstream snapshot integrity concerns that differ from Vendors — products that reference a deleted category will see `null` on populate (fine for admin lists), and historical orders are protected by snapshot fields. Removing isActive simplifies the UI (no status filter, no deactivate/reactivate toggle) and aligns with operational intent — admins want to permanently remove categories, not just deactivate them.
- `backend/src/models/Customer.ts` (ICustomer interface + schema)
- `backend/src/modules/customers/customers.service.ts` (response, update, getCustomerById)
- `backend/src/modules/pos/pos.service.ts` (createOrder)
- `frontend/src/features/customers/api.ts` (CustomerResponse)
- `frontend/src/features/customers/components/CustomerList.tsx` (orderCount column)

**Reasoning:** Automatic customer creation during POS checkout reduces friction for cashiers — they don't need to toggle to a separate Customers module to register a walk-in. History tracking ensures data changes are auditable (who changed what, when) without relying on the ActivityLog module, since customer field changes (name, phone) are informational rather than transactional. `orderCount` gives a quick at-a-glance measure of customer engagement without an aggregation query.

### [7a] Salary System — Base Salary Fixed, Paid Amount at Creation — 2026-07-01

**Open item resolved:** N/A — improvement to existing Salary feature.

**Decision:** When creating a salary record, `baseSalary` is no longer user-entered. It is derived from the referenced Employee's `baseSalary` field. The create form now accepts `paidAmount` instead, which creates the first advance entry automatically. `remainingBalance` = `baseSalary` - sum of advances.

**Doc(s) updated:**
- `API.md` §15 (request shape, description)
- `database.md` §3.12 (description)
- `TEST_CASES.md` §19 (SAL-H-01, SAL-V-02, added SAL-H-01b)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/salaries/salaries.validation.ts` (baseSalary → paidAmount)
- `backend/src/modules/salaries/salaries.service.ts` (derive baseSalary from Employee, create first advance from paidAmount)
- `frontend/src/features/salaries/schema.ts` (baseSalary → paidAmount)
- `frontend/src/features/salaries/api.ts` (baseSalary → paidAmount in create mutation)
- `frontend/src/features/salaries/components/SalaryForm.tsx` (show baseSalary as read-only, paidAmount input, remaining calculation)

**Reasoning:**
- Base salary is a per-employee fixed rate, not something that varies per month.
- Entering the paid amount at creation time simplifies the typical workflow: most salary records are created once per month with a single payment.
- The advances array still supports additional payments if needed (e.g. partial disbursements).
- Deriving `baseSalary` from the Employee record eliminates a data-entry step and prevents discrepancies between the employee's recorded rate and the salary amount.

### [7] Salary System (Sub-feature of Expenses) — 2026-07-01

**Open item resolved:** N/A — new feature not previously documented.

**Decision:** Employee salary management is implemented as a sub-feature under the Expenses module. A new `Salary` collection tracks monthly salary records with embedded advance arrays. Salaries use the same `expenses` permission module key (no new module key needed). The frontend adds a "Salaries" tab within the Expenses page. Advances are tracked as embedded subdocuments within each salary record; `totalPaid` and `remainingBalance` are computed on read. A unique index on `{employeeId, month, year}` prevents duplicate monthly records.

**Doc(s) updated:**
- `database.md` §3.12 (new Salary collection), §4 (Salary indexes)
- `API.md` §15 (new Salaries section), §24 (new error codes)
- `TEST_CASES.md` §19 (new Salaries test cases), renumbered subsequent sections

**Files created:**
- `backend/src/models/Salary.ts`
- `backend/src/modules/salaries/salaries.validation.ts`
- `backend/src/modules/salaries/salaries.service.ts`
- `backend/src/modules/salaries/salaries.controller.ts`
- `backend/src/modules/salaries/salaries.routes.ts`
- `frontend/src/features/salaries/api.ts`
- `frontend/src/features/salaries/schema.ts`
- `frontend/src/features/salaries/components/SalaryList.tsx`
- `frontend/src/features/salaries/components/SalaryForm.tsx`
- `frontend/src/features/salaries/components/AddAdvanceDialog.tsx`
- `frontend/src/features/salaries/components/SalaryDetailDialog.tsx`

**Files modified:**
- `backend/src/app.ts` (registered salaries routes)
- `frontend/src/app/(dashboard)/expenses/page.tsx` (added Salaries tab)

**Reasoning:**
- Embedded advances within the Salary document avoids a separate collection for advance records while keeping the most common read (salary + advance history) as a single document fetch.
- Using `expenses` permission key keeps salaries gated by the same access controls as other expense operations — no new permission rows needed in the user editor.
- Unique compound index on `{employeeId, month, year}` enforces the one-salary-per-employee-per-month rule at the database level, not just application logic.
- Auto-transition to `paid` when advances sum to `baseSalary` reduces manual status-management overhead.
- Guard against exceeding remaining balance and deleting salary records with advances protects financial data integrity.

### [8] Employee Module — 2026-07-01

**Open item resolved:** New feature — no prior documentation.

**Decision:** A dedicated Employee module is created as a frontend section with its own backend endpoints. Employees are Users with role `employee` or `manager`, managed through employee-specific CRUD that adds `phone`, `address`, and `baseSalary` fields to the User model. A new `employees` permission module key is added to control access separately from the `users` module.

**Doc(s) updated:**
- `database.md` §3.1 (added phone, address, baseSalary to User model)
- `API.md` §13.5 (new Employees subsection), §24 (added employees permission key)
- `TEST_CASES.md` §20 (new Employees test cases)
- `decision.md` (this entry)

**Files created:**
- `backend/src/modules/employees/employees.validation.ts`
- `backend/src/modules/employees/employees.service.ts`
- `backend/src/modules/employees/employees.controller.ts`
- `backend/src/modules/employees/employees.routes.ts`
- `frontend/src/features/employees/api.ts`
- `frontend/src/features/employees/schema.ts`
- `frontend/src/features/employees/components/EmployeeList.tsx`
- `frontend/src/features/employees/components/EmployeeForm.tsx`
- `frontend/src/app/(dashboard)/employees/page.tsx`

**Files modified:**
- `backend/src/models/User.ts` (added phone, address, baseSalary)
- `backend/src/modules/users/users.validation.ts` (added phone, address, baseSalary)
- `backend/src/modules/users/users.service.ts` (handle new fields in create/update/response)
- `backend/src/shared/constants.ts` (added employees to MODULE_ACTIONS)
- `backend/src/app.ts` (registered employee routes)
- `frontend/src/lib/constants.ts` (added employees to MODULE_ACTIONS and getModuleLabel)
- `frontend/src/components/shared/Sidebar.tsx` (added Employees nav link)

**Reasoning:** Employees are a distinct operational concern from system Users — the Users module focuses on authentication, permissions, and admin accounts, while Employees focuses on staff records with contact info and salary defaults. Giving employees their own permission key allows granular access control (e.g., a manager can view/edit employee info without having `users` access). Adding `phone`, `address`, and `baseSalary` to the User model avoids a separate Employee collection while keeping all staff data in one document. The `baseSalary` field on User serves as a default rate for the monthly Salary records in the Expenses module, streamlining salary creation.

### [4] Settings — 2026-06-22

**Open items resolved:** `DATABASE.md §8.2`, `API.md §25.5`, `AI_rules.md §13.5`
**Decision:** `Settings.taxConfig.mode` = `'none'` for v1 — no tax calculation anywhere in the system. POS `taxAmount` is always 0. The `taxConfig` field retains the full enum (`none | flat | itemized`) in the schema for forward compatibility, but only `none` is functional in v1.
**Doc(s) updated:** `DATABASE.md §8.2` (marked resolved), `API.md §25.5` (marked resolved), `AI_rules.md §13.5` (marked resolved)
**Reasoning:** Tax calculation adds complexity to POS order creation, Settings configuration, and reporting. Deferring it to a future phase reduces v1 scope without breaking schema compatibility — the field is already designed for the full enum.

### [19] Activity Log — Clear All Endpoint — 2026-07-03

**Open item resolved:** `AI_rules.md §11` (ActivityLog has no DELETE route)
**Decision:** Added a single `DELETE /activity-log` endpoint that clears all entries, gated by the new `activity-log:delete` permission (admin-only in practice). The `activity-log` module's valid actions were updated from `['view']` to `['view', 'delete']` in both backend and frontend constants. The existing `AI_rules.md` rule was updated to allow this specific deletion while still prohibiting per-entry delete/edit.
**Doc(s) updated:**
- `AI_rules.md §11` (updated to allow the clear endpoint)
- `API.md §21` (added DELETE endpoint to route table)
- `database.md §3.14` (updated integrity rule note)
- `TEST_CASES.md §17` (added LOG-CLR-01–04)
- `decision.md` (this entry)
**Reasoning:** The activity log accumulates entries indefinitely with no pruning mechanism. Adding a clear-all endpoint gives admins a way to purge the log when needed (e.g., before a fresh audit period, or to reclaim storage). The operation is gated by the `delete` action on the `activity-log` module, which realistically only admin accounts will have. The endpoint skips its own activity log write to avoid meta-logging issues.

### [—] Attendance Redesign — Stale Index Fix, History Removal, Cascade Delete — 2026-07-10

**Open item resolved:** `database.md §3.11` (Attendance schema field `userId` vs actual `employee`), `API.md §13` (request field `userId` vs actual `employeeId`), stale MongoDB index `{ user: 1, date: 1 }` causing E11000 for all employees after first mark.

**Decision:**
1. **Stale index fix:** Created `fix-indexes.ts` script to drop the stale `{ user: 1, date: 1 }` unique index from the Attendance collection. Updated `clear-attendance.ts` to also clean stale indexes. The `{ employee: 1, date: 1 }` index from the schema is the only attendance unique index.
2. **Cascade delete on employee removal:** When an Employee document is deleted (`DELETE /employees/:id`), all related Attendance, Salary, SalaryAdjustment, and SalarySummary records are automatically removed before deleting the employee.
3. **History section removed:** The "History" tab and its `AttendanceHistoryList` component are removed from the Attendance page. The `AttendanceCorrectionForm` (only accessible via history) is also removed. The "Roll Call" (TodayAttendanceSheet) and "Monthly Report" (AttendanceCalendar) tabs remain.
4. **Docs updated:** `database.md`, `API.md`, and `TEST_CASES.md` updated to reflect the correct field names (`employee`/`employeeId` instead of `userId`), the new cascade-delete behavior, and the simplified attendance UI.

**Doc(s) updated:**
- `database.md` §2 (ER diagram: Employee → Attendance/Salary/SalaryAdjustment/SalarySummary), §3.11 (Attendance schema: `employee` field, cascade delete note), §4 (Attendance index: `{employee, date}`), §5 (data integrity: cascade delete rule)
- `API.md` §13 (request/response fields: `employeeId`/`employee`, removed history description, added cascade delete note), §23 (real-time events: `employeeId`)
- `TEST_CASES.md` §9 (field names: `employeeId`, removed `userId` references, added cascade delete tests)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/seed/fix-indexes.ts` (new — stale index fix script)
- `backend/src/seed/clear-attendance.ts` (updated — also drops stale indexes + syncIndexes)
- `backend/package.json` (added `fix:indexes` script)
- `backend/src/modules/employees/employees.service.ts` (cascade delete)
- `frontend/src/app/(dashboard)/attendance/page.tsx` (removed history tab, correction dialog)

**Reasoning:**
- The stale `{ user: 1, date: 1 }` index was a leftover from a previous schema version and caused E11000 errors for all employees after the first daily mark — the`user` field doesn't exist on current documents, so MongoDB indexed it as `null` for every document, making all subsequent inserts on the same date violate the unique constraint.
- Cascade delete prevents orphaned records when employees are removed, keeping the database clean without manual cleanup.
- Removing the History section simplifies the attendance UI to two focused tabs: today's roll call and the monthly report calendar.

### [20] Home Page (Public) — Live Settings Branding — 2026-07-04

**Open item resolved:** N/A — new feature extending existing Settings module.

**Decision:** Added an unauthenticated `GET /settings/public` endpoint returning only `restaurantName` and `logo`. Created a `usePublicSettings` React Query hook (5 min stale time) and wired it into the homepage. When Settings fields are empty, the frontend falls back to hardcoded `"StationX"` and hides the logo. The logo `<img>` has an `onError` handler to hide on load failure. The public route is registered **before** authenticated routes in `settings.routes.ts` to avoid auth middleware rejection.

**Doc(s) updated:**
- `API.md` §20 (added public endpoint to route table + explanatory note)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/settings/settings.service.ts` — added `getPublicSettings()`
- `backend/src/modules/settings/settings.controller.ts` — added `handleGetPublicSettings()`
- `backend/src/modules/settings/settings.routes.ts` — registered public route before auth routes
- `backend/tests/settings-service.test.ts` — added 3 tests for `getPublicSettings`
- `frontend/src/features/homepage/api.ts` — *new* file, `usePublicSettings` hook
- `frontend/src/app/(public)/page.tsx` — consume live settings in navbar/logo/footer
- `tasks/current_task.md` — cleared (task complete)

**Reasoning:** The existing `GET /settings` is authenticated and returns the full document including sensitive fields (`vatInfo`). A separate public endpoint with a whitelist of exposed fields is safer and self-documenting. The frontend degrades gracefully on API error or empty fields — the page remains fully functional with hardcoded defaults.

### [—] Per-Category VAT Calculation & Bill Display — 2026-07-10

**Open item resolved:** `AI_rules.md` §13.5 (Settings.taxConfig.mode: itemized — previously resolved as `mode: 'none'`; now superseded by per-category `vatRate` on Category model).

**Decision:**
1. **Per-category VAT rate:** Each `Category` has a `vatRate` field (0–100%). All products in a category inherit that rate. VAT is calculated per product line: `item.lineTotal × category.vatRate / 100`. The total VAT (`taxAmount` on Order) is the sum of all per-line VAT amounts.
2. **Grand total formula changed:** `grandTotal = subtotal - discountAmount` (previously `subtotal + taxAmount - discountAmount`). VAT is **informational only** — it does not affect the amount the customer pays.
3. **Bill display:** The bill shows `Subtotal`, `VAT` (if > 0), `Subtotal + VAT`, then `Discount` which is `discountAmount + taxAmount` (the total discount includes the VAT amount), arriving at `Grand Total = subtotal - discountAmount`. When `discountAmount = 0` but `taxAmount > 0`, the discount line still shows (equal to the VAT amount), effectively canceling out the VAT.
4. **`taxAmount` stored on Order:** The total VAT is stored as `taxAmount` on the Order document for future VAT reporting. It is recomputed on pre-payment item edits and frozen once `paymentStatus` becomes `paid`.

**Doc(s) updated:**
- `database.md` §3.8 (updated `taxAmount` and `grandTotal` field descriptions)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/pos/pos.service.ts` (grandTotal formula: removed `+ totalTaxAmount`)
- `backend/src/modules/orders/orders.service.ts` (bill template `totalDiscount = discountAmount + taxAmount`; order update grandTotal formulas: removed `+ taxAmount`)
- `frontend/src/features/orders/components/OrderEditForm.tsx` (display: `totalDiscount = discountAmount + taxAmount`)
- `frontend/src/features/pos/components/BillPreview.tsx` (removed stale `cashTendered` reference, updated to use `round2` consistently)
- `backend/tests/orders.test.ts` (updated sampleOrder `grandTotal`/`changeAmount`, updated bill render test assertions for new discount-includes-VAT display)

**Reasoning:**
- The restaurant operates in Bangladesh where VAT is registered via BIN/Mushak numbers. The VAT is calculated per-product based on the product's category VAT rate (e.g., drinks 5%, snacks 10%), matching the National Board of Revenue (NBR) requirement.
- The grand total formula `subtotal - discountAmount` means the VAT is shown on the bill for compliance/reporting but is not an additional charge to the customer — the total discount line (`discountAmount + taxAmount`) cancels out the VAT added in the `Subtotal + VAT` line.
- This approach is common in Bangladeshi restaurant billing where prices are VAT-inclusive: the menu price already includes VAT, so the bill shows the VAT component for transparency without adding it on top of the subtotal.

### [4b] Settings — VAT Information (BIN & Mushak) — 2026-07-01

**Open item resolved:** N/A — refinement of existing Settings feature.
**Decision:** Replaced `Settings.taxConfig` (mode/rate) and `Settings.taxId` with `Settings.vatInfo` containing `bin` (Business Identification Number) and `mushak` (Mushak number). The Settings section title changed from "Tax Configuration" to "VAT Information." The old `taxConfig` field was only used with `mode: 'none'` (no tax calculation) and had no consumers outside the Settings module itself, so it was safe to remove.
**Doc(s) updated:**
- `database.md` §3.15 (removed taxId, taxConfig; added vatInfo)
- `API.md` §20 (updated description to reference VAT sections)
- `TEST_CASES.md` §16 (updated SET-H-02, SET-V-01 to match vatInfo)
**Files changed:**
- `backend/src/models/Settings.ts` (removed ITaxConfig/taxConfigSchema, added IVatInfo/vatInfoSchema)
- `backend/src/modules/settings/settings.validation.ts` (removed taxConfigSchema, added vatInfoSchema)
- `backend/src/modules/settings/settings.service.ts` (updated allowed fields list)
- `frontend/src/features/settings/api.ts` (removed taxId/taxConfig, added vatInfo)
- `frontend/src/features/settings/schema.ts` (replaced taxSchema with vatInfoSchema)
- `frontend/src/features/settings/components/TaxSection.tsx` (rewritten to VAT Information with BIN & Mushak fields)
- `backend/tests/settings-service.test.ts` (updated for new fields)
- `backend/tests/orders.test.ts` (fixed pre-existing "Tax" → "VAT" mismatch in bill test)
**Reasoning:** The restaurant operates in Bangladesh where VAT is registered via BIN and Mushak numbers. The previous "Tax Configuration" section with mode/rate was unused (always `mode: 'none'`). Replacing it with VAT-specific fields matches the operational reality while simplifying the UI. No consumer outside Settings references `taxConfig` or `taxId` — removal is safe.

### [—] Admin Role Fix + Password Reset Feature — 2026-07-13

**Open item resolved:** `API.md §6` — Role validation schemas on create/edit user excluded `admin`, preventing admin account creation and admin role assignment via the dashboard.

**Decision:**
1. **Role enum fix:** Added `'admin'` to the `role` enum in both frontend and backend validation schemas (`createUserSchema`, `updateUserSchema`) and all form dropdowns. Admin users can now be created and edited through the dashboard UI.
2. **Password reset endpoint:** Added `PATCH /users/:id/reset-password` as an admin-only endpoint (gated by `users:edit`) that sets a user's password without requiring the current password. This complements the existing self-service `PATCH /users/:id/password` which requires `prevPassword`.
3. **Frontend UI:** Added a "Reset Password" section inside the Edit User dialog where an admin can enter a new password for any user. No current password confirmation needed.

**Doc(s) updated:**
- `API.md` §6 — added two new rows to the Users routes table (`/users/:id/password`, `/users/:id/reset-password`)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/users/users.validation.ts` (added 'admin' to role enums, added `adminResetPasswordSchema`)
- `backend/src/modules/users/users.service.ts` (added `adminResetUserPassword`)
- `backend/src/modules/users/users.controller.ts` (added `handleAdminResetPassword`)
- `backend/src/modules/users/users.routes.ts` (added route)
- `frontend/src/features/auth/api.ts` (added 'chief' to UserResponse role union)
- `frontend/src/features/users/schema.ts` (added 'admin' to role enums, added `adminResetPasswordSchema`)
- `frontend/src/features/users/api.ts` (added `useAdminResetPassword` mutation)
- `frontend/src/features/users/components/CreateUserForm.tsx` (added 'admin' dropdown option)
- `frontend/src/features/users/components/EditUserForm.tsx` (added password reset UI, updated role handling)
- `frontend/src/features/users/components/UserList.tsx` (added 'chief' to filter options)

**Reasoning:**
- The role enum fix ensures the dashboard can manage all user roles including admin, closing a gap where admin accounts could only be created via direct DB seeding.
- The admin password reset endpoint follows the same pattern as the existing self-service endpoint but skips the `prevPassword` verification, since an admin resetting a password is a privileged operation that doesn't depend on knowing the user's current password.