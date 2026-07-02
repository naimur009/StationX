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
- `API.md` §15 (removed isActive from GET query params, changed DELETE to hard delete)
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
- `API.md` §14.1 (request shape, description)
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
- `API.md` §14 (new Salaries sub-section), §23 (new error codes)
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