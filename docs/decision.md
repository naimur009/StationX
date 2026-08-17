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

### [—] Tables Section — Delete Option Removed & Maintenance Tile Color — 2026-08-14

**Decision:** The delete option is removed from the Tables UI section (the trash icon on floor tiles, the delete dialog wiring, and the `DeleteTableDialog` component). The backend `DELETE /tables/:id` endpoint is left intact — the API contract is unchanged, the option is simply not surfaced in the UI. The `maintenance` (out of service) tile color changes from slate to **yellow** (`bg-yellow-500`) to match product direction; the legend and `theme.md` §12/§17b were updated to match.

**Doc(s) updated:**
- `theme.md` §12 (Tables `maintenance` → yellow), §17b (maintenance tile `bg-yellow-500`, tile actions edit/override only, legend yellow)

**Files changed:**
- `frontend/src/features/tables/components/TableGrid.tsx` (removed delete button/`onDelete`, maintenance `bg-yellow-500`)
- `frontend/src/app/(dashboard)/tables/page.tsx` (removed delete dialog wiring)
- `frontend/src/features/tables/components/DeleteTableDialog.tsx` (deleted)

### [—] Tables Floor Grid — Solid Color Tiles, Click-to-POS, & Maintenance Status — 2026-08-14

**Decision:** The Tables floor-plan grid moves from light-tint tiles to **solid-fill color tiles** for scan-from-across-the-room readability (available = `bg-green-500`, booked = `bg-red-500`, out of service = `bg-slate-400`, white text + white action icons). Clicking an **available** tile routes to `/pos?table=<id>`, which pre-selects that table in the POS cart. This adds a third table status, `maintenance`, to `Table.status` (`available | booked | maintenance`) — a table out of service is not seatable (POS order creation only matches `status: 'available'`). The maintenance state is set/unset through the existing `PATCH /tables/:id/status` manual-override flow (extended to accept `maintenance`) and the ManualOverrideDialog (adds the option). It is a runtime floor state: `PUT /settings` with a changed `tableCount` recreates all tables as `available`, so maintenance is not persisted across a table-count re-sync.

**Doc(s) updated:**
- `database.md` §3.3 (Table.status enum + maintenance derivations + re-sync note)
- `API.md` §11 (`PATCH /tables/:id/status` accepts `maintenance`; maintenance not seatable)
- `theme.md` §12 (Tables `maintenance` → slate) & §17b (solid tiles, maintenance tile, click-to-POS, legend)
- `TEST_CASES.md` §24 (TBL-H-09…12 maintenance cases)

**Files changed:**
- `backend/src/models/Table.ts` (status enum)
- `backend/src/modules/tables/tables.validation.ts` (status enums)
- `frontend/src/features/tables/schema.ts`, `api.ts` (status union)
- `frontend/src/features/tables/components/TableGrid.tsx` (solid tiles, maintenance, legend, click-to-POS)
- `frontend/src/features/tables/components/ManualOverrideDialog.tsx` (maintenance option)
- `frontend/src/app/(dashboard)/pos/page.tsx` (pre-select table from `?table=`)

### [—] Profit Report Deducts Paid Salary Amounts, Not Full Base — 2026-08-13

**Open item resolved:** N/A — follow-up to "Salary Report Shows Paid Amounts" (same date); the owner reported the profit report still showed the full base salary.

**Decision:** `GET /reports/profit` now deducts the **paid** salary amounts from profit instead of the full contracted base salaries. `salaries.totalSalary` is renamed `salaries.totalPaid` and computed as the sum of all advances on the matched salary records; `salaries.byEmployee[].baseSalary` becomes `byEmployee[].totalPaid` (advance sum per record, with `employeeName` and `status` unchanged). The PDF export (`report-template.ts`) metric card is renamed "Total Paid", its per-employee table column "Base Salary" → "Salary Paid" (`key: totalPaid`), and the profit breakdown line reads "- Salaries Paid". The FE profit report (`ReportSummaryCards.tsx`, `ProfitReportView.tsx`) shows "Total Paid" / "Salaries Paid" with `salaries.totalPaid`. Example: a ৳10,000 base salary with ৳5,000 paid reduces profit by ৳5,000, not ৳10,000.

**Doc(s) updated:**
- `API.md` §22 (profit response shape + formula)
- `TEST_CASES.md` §19 (`REP-CALC-01` formula)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/reports/reports.service.ts` (`totalPaid` from advances, `byEmployee[].totalPaid`, profit formula)
- `backend/src/modules/reports/report-template.ts` (PDF labels + columns)
- `frontend/src/features/reports/api.ts` (`ProfitSalaries` / `SalaryEmployeeEntry` types)
- `frontend/src/features/reports/components/ReportSummaryCards.tsx` ("Total Paid" card)
- `frontend/src/features/reports/components/ProfitReportView.tsx` ("Salaries Paid" line)

**Reasoning:** Profit is cash-based: only money actually paid out of the business reduces cash. Treating the full contracted base as an expense overstated salary costs whenever salaries are paid in installments (advances), making profit look worse than reality. Salary records are matched by their `createdAt` within the period, as before — only the summed value changed from `baseSalary` to the advance total.

### [—] Salary Report Shows Paid Amounts, Not Full Base Salary — 2026-08-13

**Open item resolved:** N/A — display fix requested by the owner (report previously showed the full contracted base salary, which misled when only part was paid).

**Decision:** The salary report page (`SalaryReport.tsx`) is now paid-focused. The "Base Salary" column in the month report table shows the amount actually paid (sum of advances) and is renamed "Salary Paid"; the separate "Paid" column is merged into it. The summary "Total Salary" card is replaced by a "Total Paid" card (grand total of paid amounts); the redundant "Total Paid" card is removed (5 cards). The per-employee month-by-month table and its summary cards follow the same change ("Salary Paid" + "Total Paid"), keeping the existing "Remaining" (base − paid) column. Example: base ৳10,000 with ৳5,000 paid today → the report shows ৳5,000, not ৳10,000. The backend response is unchanged (`grandTotalBaseSalary` etc. still returned); only the report's presentation changed. Net, Bonus, Cut, Status, and Paid Date columns are untouched.

**Doc(s) updated:**
- `decision.md` (this entry)

**Files changed:**
- `frontend/src/features/salaries/components/SalaryReport.tsx` (tables + summary cards, paid-focused)

**Reasoning:** The owner reported the report "shows the full base salary" when only a part had been paid, making the numbers read as money already paid out. Making the report paid-focused shows what was actually disbursed as of the report date; the remaining obligation stays visible per-employee via the "Remaining" column and the status badge. No new features — the data was already computed; this only changes which figure the report displays.

### [—] Salary Hard Delete (Force) — 2026-08-13

**Open item resolved:** N/A — extends `DELETE /salaries/:id` with an explicit hard-delete path for correcting mistaken entries.

**Decision:** `DELETE /salaries/:id` accepts an optional `?force=true` query param (validated, `true`/`false` only). Without it, the `409 SALARY_HAS_ADVANCES` guard is unchanged. With `force=true`, a salary record is deleted even when it has advances — the record and all its advances are permanently removed. The FE delete dialog now shows a "Hard Delete" flow (title, warning box listing the advance count/total, and a confirmation checkbox that must be checked before the button enables) whenever the record has advances, mirroring how a wrong `paidAmount` entry (e.g. 10000 typed instead of 1000) would otherwise be stuck forever because its auto-created first advance blocks deletion.

**Doc(s) updated:**
- `API.md` §17 (DELETE row), §26 (`SALARY_HAS_ADVANCES` description)
- `database.md` §3.12 (guard note), §5 rule 10 (reference to the force exception)
- `TEST_CASES.md` §20 (new `SAL-H-09`, `SAL-V-05`)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/salaries/salaries.service.ts` (`deleteSalary(id, force = false)`)
- `backend/src/modules/salaries/salaries.controller.ts` (parses `force` from query)
- `backend/src/modules/salaries/salaries.validation.ts` (`deleteSalaryQuerySchema`)
- `backend/src/modules/salaries/salaries.routes.ts` (query validation wired)
- `frontend/src/features/salaries/api.ts` (`useDeleteSalary` accepts `{ id, force }`)
- `frontend/src/features/salaries/components/DeleteSalaryDialog.tsx` (hard-delete confirmation flow)
- `frontend/src/features/salaries/components/SalaryDetailDialog.tsx` (call-site updated for new mutation signature)

**Reasoning:** The `SALARY_HAS_ADVANCES` guard protects reports from silently losing paid history, but it also traps mistaken entries — creating a salary with a wrong `paidAmount` immediately creates an advance, making the record undeletable. A deliberate, user-confirmed force path fixes mistakes without weakening the default guard. `force` is restricted to `'true'`/`'false'` at the API boundary so the guard cannot be bypassed accidentally, and the UI requires explicit checkbox acknowledgment before the hard delete executes.

### [—] Salary Over-Payment Guard — 2026-08-05

**Open item resolved:** N/A — closes a validation gap in the Salaries module.

**Decision:** `POST /salaries` now rejects `paidAmount` that exceeds the employee's `baseSalary` with `400 EXCEEDS_SALARY` (same code already used by `PATCH /salaries/:id/advance`). Previously, only the advance endpoint was capped — creating a salary record could silently over-pay (e.g. `paidAmount: 15000` on a 10,000 salary). Extra pay above the base salary remains fully supported through the bonus adjustment (`POST /salary-adjustments`, uncapped), so the base-salary cap applies only to the main salary payment path.

**Doc(s) updated:**
- `API.md` §17 (note on `paidAmount` cap + bonus path), §26 (`EXCEEDS_SALARY` description now covers both the create and advance paths)
- `TEST_CASES.md` §20 (new `SAL-E-07` case)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/salaries/salaries.service.ts` (cap check in `createSalary`)
- `frontend/src/features/salaries/components/SalaryForm.tsx` (inline guard with error message, mirroring `AddAdvanceDialog`)
- `backend/tests/salaries-service.test.ts` (new unit tests)

**Reasoning:** Backend validation is the real boundary (frontend UX is advisory per `AI_rules.md` §4). The existing `EXCEEDS_SALARY` code was reused rather than inventing a new error code, per `AI_rules.md` §9.

### [—] Income Module — New Dashboard Section for Miscellaneous Income — 2026-07-19

**Open item resolved:** N/A — new feature not previously documented in the project's permission key list.

**Decision:** Created a standalone Income module (`incomes`) as a new dashboard section for recording non-food, non-order miscellaneous income (e.g., scrap sales, plastic recycling, other ad-hoc revenue). The module mirrors the Expenses module structure:
- Backend: `Income` Mongoose model, full CRUD routes under `/incomes`, Zod validation, reference-data endpoint for staff dropdown
- Frontend: List page with date-range/category/method/staff filters, create/edit form in dialog, detail view page, delete confirmation dialog
- Uses its own `incomes` permission module key (`view`, `create`, `edit`, `delete`) — does not reuse the `expenses` or `dashboard` key
- Hard-deletable (no `isActive` field), consistent with the Expenses pattern
- Fields: `amount`, `date`, `description`, `category`, `receivedFrom`, `receivedBy` (Employee), `paymentMethod`, `createdBy`

**Doc(s) updated:**
- `API.md` §15 (new Incomes section), §26 (added `incomes` to permission module keys), renumbered all subsequent sections (§16–§27)
- `database.md` §3.16 (new Income schema), §4 (indexes), §1 (hard-delete list), §2 (ER diagram)
- `TEST_CASES.md` §11 (new Income test cases, 14 cases), renumbered all subsequent sections (§12–§26)
- `decision.md` (this entry)

**Files created:**
- `backend/src/models/Income.ts`
- `backend/src/modules/incomes/incomes.routes.ts`
- `backend/src/modules/incomes/incomes.controller.ts`
- `backend/src/modules/incomes/incomes.service.ts`
- `backend/src/modules/incomes/incomes.validation.ts`
- `frontend/src/features/incomes/api.ts`
- `frontend/src/features/incomes/schema.ts`
- `frontend/src/features/incomes/components/IncomeList.tsx`
- `frontend/src/features/incomes/components/IncomeForm.tsx`
- `frontend/src/features/incomes/components/IncomeDetail.tsx`
- `frontend/src/app/(dashboard)/incomes/page.tsx`
- `frontend/src/app/(dashboard)/incomes/DeleteIncomeDialog.tsx`
- `frontend/src/app/(dashboard)/incomes/[incomeId]/page.tsx`

**Files modified:**
- `backend/src/app.ts` (registered incomes routes + rate limiter)
- `backend/src/shared/constants.ts` (added `incomes` module)
- `frontend/src/lib/constants.ts` (added `incomes` module + label)
- `frontend/src/components/shared/Sidebar.tsx` (added Incomes nav item with `ArrowDownUp` icon before Expenses)

**Reasoning:** The PRD's original "Income" feature (§16) was folded into the Profit Report (product-based income from Orders data). However, the restaurant also needs to track non-food income streams (scrap sales, recycling, etc.) that don't come from Order data. Creating a standalone Income module (mirroring the Expenses pattern) gives staff a familiar interface to record these entries, and using its own permission key (`incomes`) allows granular access control independent of both `expenses` and `dashboard`. The module is intentionally simple (no vendor linkage, no snapshot fields) since income entries are typically one-off ad-hoc records rather than recurring transactions.

### [—] Profit Report Includes Miscellaneous Income from Incomes Module — 2026-07-19

**Open item resolved:** N/A — enhancement of existing Reports module.

**Decision:** Added non-order miscellaneous income (from the `incomes` collection) to the profit report. The profit report now has two income sources:
- `income.totalRevenue` — product-based revenue from completed+paid Orders (unchanged)
- `income.totalMiscIncome` — non-order income from the Incomes module (new)

Profit formula updated from `totalRevenue - totalExpenses - totalSalary` to `totalRevenue + totalMiscIncome - totalExpenses - totalSalary`.

**Doc(s) updated:**
- `API.md` §21 (updated profit report response shape with `totalMiscIncome`, `miscEntries`, `byMiscCategory`)
- `TEST_CASES.md` §19 (added REP-CALC-02, REP-CALC-03, updated REP-CALC-01)
- `decision.md` (this entry)

**Files modified:**
- `backend/src/modules/reports/reports.helper.ts` — added `incomeAggregation` pipeline
- `backend/src/modules/reports/reports.service.ts` — import Income model, run income pipeline, include misc income in response, update profit formula
- `backend/src/modules/reports/report-template.ts` — added Other Income section + category table in PDF template, updated profit breakdown
- `frontend/src/features/reports/api.ts` — added `MiscIncomeCategory` interface, updated `ProfitIncome` with misc fields
- `frontend/src/features/reports/components/ProfitReportView.tsx` — show Other Income metric card and profit-calculation line

**Reasoning:** The newly created Incomes module (non-order miscellaneous income like scrap sales, recycling) needs to feed into the profit report so the restaurant sees a complete financial picture — total revenue from products plus any additional income sources. Adding `totalMiscIncome` to the existing `income` section keeps the Order-based revenue and misc income separate for clarity while combining them in the profit formula. The `byMiscCategory` array provides category-level drill-down matching the expense `byCategory` pattern.

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

1. **Order item category snapshot** (`CM-FIX-01`): Added `categorySnapshot` (string — category name only) to `IOrderItem`/`orderItemSchema`. Resolved from live `Category` at order creation (`pos.service.ts`) and item edit (`orders.service.ts`). Report pipelines (`byProduct`/`byCategory`) use `$lookup` as the primary source with `$items.categorySnapshot` as a fallback for backward compatibility with orders placed before the snapshot was introduced.

2. **Socket event naming** (`CM-FIX-03`): POS order creation emits both legacy `pos:order_created` and canonical `order:created` + `dashboard:metricsInvalidate`. The `order:paid` path also emits `dashboard:metricsInvalidate`.

3. **Default status `pending`, `completedAt` only on explicit completion** (`POS-FIX-02`): POS order creation defaults to `pending` (was `completed`). `completedAt` is only set when status is explicitly transitioned to `completed`.

4. **Coupon validation as POST** (`POS-FIX-01`): Changed from `GET /pos/coupon?code=` to `POST /pos/coupons/validate` with `{ code, subtotal, customerId? }`. Returns `{ valid, reason?, couponId?, discountType?, value?, discountAmount? }` with typed reason codes (`NOT_FOUND`, `DISABLED`, `NOT_YET_VALID`, `EXPIRED`, `BELOW_MIN_ORDER`, `USAGE_LIMIT_REACHED`).

5. **`paymentStatus` filter** (`ORD-FIX-01`): Added to Orders list query params for filtering by `unpaid`/`paid`.

6. **Non-cash payment `transactionId` validation** (`ORD-FIX-02`): Zod refine requiring `transactionId` when `payment.method !== 'cash'`; service-layer check prevents `null` transactionId from persisting.

> **Superseded (2026-08-13, follow-up review):** `transactionId` is now **optional** for non-cash payments (`card`/`bkash`/`nagad`) — the Zod refines in `orders.validation.ts` and the service-layer guards in `orders.service.ts` were removed. A `transactionId`, when provided, is still persisted on the `payment` object; a missing one is no longer rejected. The `Coupon.usageCount` `$inc` was also moved from the payment-capture path (`PATCH /orders/:id/status`) back into the order-creation transaction (`POST /pos/orders`), where it is reserved atomically at order placement via the same conditional `findOneAndUpdate` guard; payment capture no longer touches the counter, and `DELETE /orders/:id` now rejects any order with a `couponId` (usage recorded at creation), per `API.md` §10/§28.1.

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
- `backend/src/modules/reports/reports.helper.ts` (added categorySnapshot fallback to $lookup pipelines)
- `backend/src/modules/reports/reports.service.ts` (salary month/year filter)
- `frontend/src/features/pos/api.ts` (coupon mutation to POST)
- `frontend/src/features/pos/components/CouponInput.tsx` (rewritten for new response shape)
- `frontend/src/features/orders/components/OrderFilters.tsx` (paymentStatus dropdown)
- `frontend/src/features/orders/api.ts` (paymentStatus param)
- `frontend/src/features/orders/schema.ts` (paymentStatus filter schema)
- `frontend/src/app/(dashboard)/orders/page.tsx` (paymentStatus integration, socket listener update)

**Reasoning:**
- Category snapshot follows the established snapshot pattern (`nameSnapshot`/`priceSnapshot`), ensuring reports remain accurate even when categories are renamed later. The snapshot is used as a fallback in aggregation pipelines, with `$lookup` retained as the primary source to handle orders placed before the snapshot was introduced.
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

**Decision:** Enhanced the existing `renderBillHtml` template to produce a full thermal-receipt-style bill matching the reference design. The template now consumes `Settings` data (logo, restaurant name, address, phone, BIN, Mushak) for the header, displays all order fields (table, waiter, date/time, invoice, items, subtotal, discount, VAT, auto-round, grand total), payment details (method, cash tendered, change returned), and a footer. The `getOrderBill` service method fetches the `Settings` singleton and passes it to the template. Auto-round is computed as `Math.floor(grandTotal) - grandTotal` and shown as a display-only line when non-zero. VAT line only renders when both `vatInfo.bin` is populated AND `taxAmount > 0`.

**Doc(s) updated:** None — the template lives in `orders.service.ts`; the bill endpoint, route, and schema already existed. Tests updated with new assertions matching the enhanced output.

**Files changed:**
- `backend/src/modules/orders/orders.service.ts` (renderBillHtml: full receipt template; getOrderBill: fetches Settings)
- `backend/tests/orders.test.ts` (updated renderBillHtml tests, added Settings mock to getOrderBill tests)

**Reasoning:** The basic template already shipped with the Orders module was functional but minimal — it didn't use Settings data, omitted cash tendered/change, and lacked the receipt-style layout the reference design calls for. These enhancements make the bill production-ready for both on-screen preview and PDF print/download, without changing the endpoint contract. Auto-round is intentionally display-only (never stored) to avoid schema complexity for a cosmetic rounding line.

> **Superseded (2026-08-13, review M11):** the Auto Round line was **removed** — the bill template and the `OrderDetail` totals now display the stored `order.grandTotal` (round2, no floor). A `Math.floor`-based total could show up to 0.99 below the payment-capture amount, rejecting a customer who pays the displayed total. No schema change was needed; `database.md` §1 requires no rounding-policy amendment for these paths.

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

**Decision:** A dedicated Employee module is created as a frontend section with its own backend endpoints. Employees are Users with role `employee`, managed through employee-specific CRUD that adds `phone`, `address`, and `baseSalary` fields to the User model. A new `employees` permission module key is added to control access separately from the `users` module.ee-specific CRUD that adds `phone`, `address`, and `baseSalary` fields to the User model. A new `employees` permission module key is added to control access separately from the `users` module.

**Doc(s) updated:**
- `database.md` §3.1 (added phone, address, nid, baseSalary to User model)
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

### [—] Table Count Configurable from Settings — 2026-07-24

**Open item resolved:** N/A — enhancement to existing Table and Settings modules.

**Decision:** Added `tableCount` field to Settings (default 0, max 100). When the admin updates `tableCount` in Settings, the backend auto-syncs the Table collection:
- If `tableCount > existing count`: new tables are created with sequential labels ("1", "2", "3"...) and null capacity.
- If `tableCount < existing count`: excess tables without active bookings are removed. Tables with active orders are preserved.
- The manual "Add Table" button in the tables grid is removed, replaced by the Settings-driven auto-generation. Edit, Delete, and Manual Override remain available.

**Doc(s) updated:**
- `database.md` §3.15 (added `tableCount` to Settings schema)
- `API.md` §23 (Settings section — `tableCount` now accepted in PUT body)
- `decision.md` (this entry)

**Files modified:**
- `backend/src/models/Settings.ts` (added `tableCount` field)
- `backend/src/modules/settings/settings.validation.ts` (added `tableCount` to updateSchema)
- `backend/src/modules/settings/settings.service.ts` (added table sync logic)
- `frontend/src/features/settings/api.ts` (added `tableCount` to types)
- `frontend/src/features/settings/schema.ts` (added `tableSettingsSchema`)
- `frontend/src/app/(dashboard)/settings/page.tsx` (added `TableSettingsSection`)
- `frontend/src/features/tables/components/TableGrid.tsx` (removed "Add Table" button)
- `frontend/src/app/(dashboard)/tables/page.tsx` (removed CreateTableDialog)

**Files created:**
- `frontend/src/features/settings/components/TableSettingsSection.tsx`

**Reasoning:** The PRD specifies "The restaurant has a fixed set of tables (configurable, e.g. 20), each identified by a table number/label." The initial implementation required manual creation of each table via an "Add Table" button, which is tedious for a 20-table restaurant. Adding a `tableCount` setting allows the admin to set the total in one place and have tables auto-generated, matching the PRD's intent. The manual "Add Table" button is removed since the setting replaces the need for it, but individual table editing/deletion/override is preserved for operational flexibility.

### [—] Table Management — Live Floor Status — 2026-07-23

**Open item resolved:** `architecture.md §13` (deferred "Table & reservation management — Future Scope" item — pulled into v1 scope, narrowed to "Advanced reservation/scheduling system" for the future); `database.md §7` (scaling row that excluded tables/reservations from v1).

**Decision:**
1. **New `Table` collection** with fields: `label` (e.g. "T1"), `capacity` (optional Number), `status` (`available` | `booked`), `bookedBy` (`order` | `manual` | `null`), `orderId` (optional ObjectId ref to Order), `area` (optional string for zone grouping — "Indoor", "Patio", etc.), and standard timestamps.
2. **Breaking field rename on Order:** `Order.tableNumber` (String) replaced with `Order.tableId` (ObjectId ref to `Table`) + `Order.tableLabelSnapshot` (String — the table's label at time of order, preserved for historical bill display). This is **not additive** — the old `tableNumber` field is removed. A migration script must migrate existing orders that had a `tableNumber` to create a Table document and set `tableId`/`tableLabelSnapshot`.
3. **Booking/unbooking flow is dual-path:**
   - **Auto** — POS order creation with a `tableId` sets `Table.status = 'booked'`, `Table.bookedBy = 'order'`, `Table.orderId = <orderId>`. Payment/cancel transitions on the order auto-unbook the table (sets `status = 'available'`, clears `bookedBy`/`orderId`). This is handled via Socket.io `table:statusChanged` events emitted from order-service hooks.
   - **Manual** — Staff can toggle a table to `booked` via `PUT /tables/:id/status` with a `reason` body (e.g. "cleaning", "reserved for party"). In this case `bookedBy = 'manual'`, `orderId = null`. Manual override is blocked when the table already has an active order (status 409 + code `TABLE_HAS_ACTIVE_ORDER`). A confirmation dialog warns the staff member that this is an exceptional action.
4. **Delete protection:** A Table cannot be deleted if it has an active (non-completed, non-cancelled) order. Delete returns 409 `TABLE_HAS_ACTIVE_ORDER`.
5. **Permissions:** New `tables` module key with `view`, `create`, `edit`, `delete` actions.

**Doc(s) updated:**
- `PRD.md` §3.5 (new Feature 5: Table Management), §9.2 (Manager role description — "manage tables"), renumbered features 6–16
- `architecture.md` §12 (narrowed Future Scope to "Advanced reservation/scheduling system"), §3.1 (frontend route `/tables`), §6.3 (backend `tables` module), §2/§7 (ER diagram + mapping table: Tables entity), §12 (Socket.io: `table:statusChanged`; open items: added `Order.tableNumber → tableId`, removed old deferred item, updated feature count to 16)
- `database.md` §3.3 (new Table collection schema), §3.8 (Order: added `tableId` + `tableLabelSnapshot`, removed `tableNumber`), §5 (booking/unbooking integrity rules), §7 (narrowed scaling row), §8 (added open items for migration + table number already in use on POS)
- `API.md` §11 (new Tables section — CRUD + manual-override-status endpoint + validation + security), updated POS/Orders to use `tableId` instead of `tableNumber`, §25 (added `TABLE_NOT_FOUND`, `TABLE_ALREADY_BOOKED`, `TABLE_HAS_ACTIVE_ORDER`, `TABLE_NUMBER_IN_USE` error codes), §26 (added `tables` to permission module keys), §23 (added `table:statusChanged` event), renumbered subsequent sections
- `AI_rules.md` §2 (table CRUD validation rule), §3 (booking/unbooking integrity rule), §6 (hard-delete collection includes Table), §7 (strict-operator referential rules extended to `orderId` on Table), §8 (single-point-of-truth: `Table.status` is authoritative, UI derives from it); stale section references throughout fixed to match renumbered API.md/database.md sections
- `theme.md` §12 (Status & Badge Color Mapping: added "Tables — `status: available` → green, `booked` → red"), §17b (new Table Grid Theme subsection with tile styling, capacity indicator, manual-block/order indicator distinction, responsive grid layout, Socket.io animation timing, empty state, hover/card-hover utility)

**Reasoning:**
Pulling table management into v1 was low-risk because `architecture.md`'s Future Scope had already reserved the concept — the deferred item was always "table *and reservation* management," and we split that: live floor status (now) vs. advanced booking/reservations (still Future Scope). The field on Order was already a string (`tableNumber`), which `architecture.md §12`'s own open-item note flagged as "will become a `tableId` ref when the Tables collection is created." Converting it to a reference (ObjectId) is correct now because the Table document carries a status that is more than just a label — the system needs to enforce booking/unbooking transitions, prevent double-booking, and emit Socket.io events on status changes. A free-text string cannot express that state machine. The breaking rename (`tableNumber` → `tableId`), while not additive, is justified because no external consumers depend on the old field name at this stage of development, and the migration is a one-time script that populates the new Tables collection from existing order data.
### [—] Backup Includes Users (passwordHash + full restore) — 2026-08-05

**Open item resolved:** Users created via the dashboard were effectively skipped in the backup/restore roundtrip — downloaded backups could not restore usable accounts.

**Decision:**
1. **Backup now includes `passwordHash` for users.** `generateBackup()` queries `User` with `.select('+passwordHash')` because the schema marks `passwordHash` as `select: false`. Without it, a restored user document fails the `required` validation during restore and the resulting accounts could never log in.
2. **Restore now replaces all users.** `restoreBackup()` changed the user writer from `User.deleteMany({ role: { $ne: 'admin' } })` to `User.deleteMany({})`. The old logic preserved the current admin and then re-inserted the backup's admin with the same `_id`, causing a duplicate-key bulk-write failure that dropped the entire user batch. The pre-existing validation (backup must contain at least one active admin) already guarantees a replacement admin exists, so deleting all users is safe.

**Doc(s) updated:**
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/settings/data-management.service.ts` (`generateBackup` includes `passwordHash`; restore user writer uses `deleteMany({})`)
- `backend/tests/data-management.test.ts` (updated `generateBackup`/`restoreBackup` mocks and assertions)

**Reasoning:**
- A backup is an admin-only, authenticated download that already contains the entire dataset (orders, financials, activity logs); including bcrypt password hashes is consistent with standard dump-based backup tooling and is required for a functional restore.
- The admin-preservation rule belongs to the *reset* flow (admin accounts survive a data reset), not the *restore* flow — restore is explicitly a "replace everything with the backup contents" operation per the UI confirmation copy.

**Amendment (security review 2026-08-17):** restore is now privilege-safe by construction — attacker-chosen `User` documents can no longer be inserted verbatim. Strict document validation (shape, `role ∈ admin|employee`, bcrypt `passwordHash`, permission keys) plus two admin-specific rules: (1) every admin in the backup must match an existing admin account by email — restore can never create a new admin, and (2) matched admins keep their current `passwordHash` — a forged backup cannot overwrite the real admin's password. The `settings:edit` grant no longer implies "create arbitrary accounts / hijack the system" through `POST /settings/restore`. Documented in `API.md` §23, `DATABASE.md` §5.11, `TEST_CASES.md` §17 (SET-RST-05..07); enforced in `backend/src/modules/settings/data-management.service.ts` (`sanitizeRestoredUsers`).

### [—] Settings — Docs Reconciled to Code (Data Management, Public Whitelist, Table Sync) — 2026-08-05

**Open item resolved:** Code-review reconciliation — `API.md` §23 documented only GET `/settings/public`, GET `/settings`, PUT `/settings`; the implemented reset/backup/restore endpoints, the public `loyaltyOrderThreshold` field, and the table re-sync event were undocumented contract deviations.

**Decision (docs now match the implemented code):**
1. **Data-management endpoints are official:** `POST /settings/reset` (Reset All Data), `GET /settings/backup` (Download Backup), `POST /settings/restore` (Restore from Backup) are added to `API.md` §23 with their documented auth/action gates — `settings:edit` for reset/restore, **`settings:view` for backup** (the download gate is the view permission, not edit). Backup returns a raw JSON dump with no `{ data }` envelope (file-download exception).
2. **Reset is the never-hard-delete exception:** `POST /settings/reset` hard-deletes `Order`, `Expense`, and `ActivityLog` by design. Codified as the sole exception in `AI_rules.md` §6 and `DATABASE.md` §5.11. Both reset and restore are deliberately non-transactional (per-collection replace); a partial failure is recovered by re-running the same operation.
3. **Public whitelist extended:** `GET /settings/public` returns `restaurantName`, `logo`, **and** `loyaltyOrderThreshold` — the POS page (loyalty notification banner) consumes the threshold without authentication. Supersedes decision [20]'s "only restaurantName and logo" wording.
4. **`loyaltyOrderThreshold` is a documented Settings field:** added to `DATABASE.md` §3.15 (Number, default 0, min 0 — order-count threshold for the POS loyalty notification).
5. **Settings-driven table re-sync:** `PUT /settings` with a changed `tableCount` preserves tables with a non-null `currentOrderId`, recreates the rest with sequential labels, and broadcasts `table:statusChanged` with an **empty payload as a signal-only event** (`API.md` §25) so the floor grid re-fetches.

**Doc(s) updated:**
- `API.md` §23 (route table + data-management notes + accepted PUT fields), §25 (`table:statusChanged` settings trigger + signal-only payload)
- `database.md` §3.15 (`loyaltyOrderThreshold`, tableCount re-sync semantics), §5.11 (reset/restore integrity rules)
- `AI_rules.md` §6 (sole exception to the never-hard-delete rule)
- `TEST_CASES.md` §17 (SET-PUB-01/02, SET-LOY-01, SET-TAB-01, SET-RESET-01/02, SET-BAK-01/02, SET-RST-01–04)
- `decision.md` (this entry)

**Files changed:** docs only — no code changes.

**Reasoning:** The Settings data-management feature (reset/backup/restore), the loyalty threshold, and the table re-sync shipped ahead of their contract documentation. Per the review discipline, the docs are the binding contract for future work — so rather than reshaping the code, the docs were amended to state exactly what the implemented behavior is (including its intentional exceptions and limitations), making the contract honest and reviewable going forward.

### [—] Employees — Optional NID Field — 2026-08-05

**Open item resolved:** N/A — small field addition to the existing Employees module.

**Decision:** Added an optional `nid` field to the Employee collection and the create/update endpoints (`POST /employees`, `PUT /employees/:id`). The create employee form gains an optional "NID No." input. Validation caps the value at 30 characters (`400 VALIDATION_ERROR` beyond that); omitted values are stored as `''`. The field is optional and informational — no uniqueness constraint, not used for lookup or auth.

**Doc(s) updated:**
- `database.md` §3.17 (new Employee collection schema section — previously undocumented — including `nid`), §4 (Employee index row)
- `TEST_CASES.md` §23 (added EMP-H-09/EMP-H-10/EMP-V-05; corrected stale rows that referenced `email`/`password` fields and User-document semantics)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/models/Employee.ts` (added `nid`)
- `backend/src/modules/employees/employees.validation.ts` (added `nid` to create/update schemas)
- `backend/src/modules/employees/employees.service.ts` (added `nid` to response shape, create, and update)
- `frontend/src/features/employees/schema.ts` (added `nid`)
- `frontend/src/features/employees/api.ts` (added `nid` to types)
- `frontend/src/features/employees/components/EmployeeForm.tsx` (NID No. input in create/edit form)

**Reasoning:** API.md §14.5 already documented `nid` in its request/response examples, so the contract anticipated the field — the schema, model, and form were the gap. Adding it as a plain optional string keeps the field informational (BD NID numbers vary in length and format), matching the "optional contact detail" treatment of `address`.

### [—] Income & Expenses — Code-Review Reconciliation — 2026-08-13

**Open item resolved:** Two §12 prompt-conflict flags from the Income & Expenses code review — (1) Expense hard-delete: `AI_rules.md` §6 ("Expense never hard-deleted") vs `API.md` §15 ("Hard delete") vs `DATABASE.md` §1 (Expense listed in neither the soft- nor hard-delete column); (2) `Expense.paidBy` reference: `DATABASE.md` §3.15 said `ObjectId → User` while the model, service validation, reference-data endpoint, and UI all use `Employee`.

**Decision:**
1. **Expense is hard-deletable** — bless the implemented behavior (`DELETE /expenses/:id`, `findByIdAndDelete`). `Expense` added to the `DATABASE.md` §1 hard-delete list and to `AI_rules.md` §6's hard-delete-collections line; `Expense` removed from the "never hard-deleted" clause. The Settings reset/restore exception is unchanged (`AI_rules.md` §6, `DATABASE.md` §5.11).
2. **`Expense.paidBy` references Employee** — `DATABASE.md` §3.15 and the §2 ER diagram updated (`paidBy → ObjectId → Employee`). Code unchanged — the dropdown semantics ("staff member who actually made the payment") and the parallel `Income.receivedBy → Employee` already matched the implementation.
3. **Section renumbering (housekeeping)** — `DATABASE.md` had duplicate §3.14 (SalarySummary + ActivityLog) and §3.15 (Expense + Settings) headers: ActivityLog → §3.17, Settings → §3.18, Employee → §3.19. `API.md` references updated (§15 Expense → §3.15, §23 Settings → §3.18; a stale `DATABASE.md` §3.12 reference for `Expense.category` in §8 also corrected to §3.15).

**Doc(s) updated:**
- `API.md` §15 (documented `GET /expenses/reference-data`; fixed stale `DATABASE.md` §3.12 → §3.15), §25 (`dashboard:metricsInvalidate` trigger extended to "income created"), §26 (added `VENDOR_NOT_FOUND`, `EMPLOYEE_NOT_FOUND`), §23 (Settings §3.18 reference)
- `database.md` §1 (hard-delete list + Expense), §2 (ER line `Expense ── paidBy → Employee`), §3.15 (`paidBy` → Employee), §3.17/§3.18/§3.19 (renumbered ActivityLog/Settings/Employee), §8 (stale §3.12 → §3.15)
- `AI_rules.md` §6 (Expense moved to hard-delete collections; removed from the never-hard-deleted clause)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/expenses/expenses.service.ts` (emit `dashboard:metricsInvalidate` after create per `API.md` §25; shared `paginate()` from `lib/pagination`; `toData` typed against `IExpense`; null-guard replacing `populated!`)
- `backend/src/modules/incomes/incomes.service.ts` (same: emit after create, `paginate()`, `toData(IIncome)`, null-guard)
- `backend/src/modules/expenses/expenses.validation.ts` / `backend/src/modules/incomes/incomes.validation.ts` (`paginationSchema` spread; `description` required per `DATABASE.md` §3.15/§3.16)
- `backend/src/models/Expense.ts` / `backend/src/models/Income.ts` (`description` now `required: true`)
- `backend/src/middleware/activityLogger.ts` (`incomes.created/updated/deleted` descriptions, mirroring `expenses.*`)
- `frontend/src/features/expenses/{schema.ts,api.ts}` / `frontend/src/features/incomes/{schema.ts,api.ts}` (`.multipleOf(0.01)` on amount; required description; date as plain `YYYY-MM-DD` string per the CouponForm precedent; `DateRange` + payment-method enum param typing)
- `frontend/src/features/expenses/components/ExpenseForm.tsx` / `frontend/src/features/incomes/components/IncomeForm.tsx` (`zodResolver(schema as never)` removed — resolver-inferred `useForm` typing like TaskForm; `ExpenseFormValues`/`IncomeFormValues`)
- `frontend/src/features/expenses/components/ExpenseList.tsx` / `frontend/src/features/incomes/components/IncomeList.tsx` (unused `dateQueryString` removed; payment-filter state typed)

**Reasoning:** The Expense hard-delete behavior and the `paidBy → Employee` reference both predate and contradict parts of the docs, and both were already the de-facto contract in `API.md` §15 and the implementation — per the review discipline the docs were amended to state the implemented behavior rather than reshaping code to a stale spec. The remaining code changes align the modules with already-documented contracts (socket trigger, error-code reference, shared pagination helper) and remove the `as never` escape hatch, mirroring the earlier Tasks module reconciliation.

### [—] Employees & Customers — Code-Review Reconciliation — 2026-08-13

**Open item resolved:** Three §12 flags from the Employees & Customers code review: (1) `API.md` §14.5 still documented the superseded employee-on-`User` design (role-based filtering, POST creating a `User`, email placeholder, DELETE removing the `User` document) while `DATABASE.md` §3.19, the NID decision (2026-08-05), and the implementation all use a standalone `Employee` collection; (2) `POST /customers/save-or-find` was implemented and referenced by `review-pos-orders-coupons.md` as "§21" but was missing from the `API.md` §21 route table; (3) the dead FE `useSaveOrFindCustomer` hook documented as "deleted" in `review-pos-orders-coupons.md:67` was still present and unused.

**Decision:**
1. **`API.md` §14.5 rewritten to the Employee-collection contract** — role/email/`isActive`/User-creation text removed; POST/DELETE semantics documented as "does not create a `User` account" / "cascade-deletes Attendance, Salary, SalaryAdjustment, SalarySummary in one Mongo transaction (`DATABASE.md` §5), never touches a `User`". Code unchanged — it already matched `DATABASE.md` §3.19.
2. **`POST /customers/save-or-find` documented** — added to the `API.md` §21 route table (`customers:create`), with a contract note (find by phone, return existing unchanged, or create with required `name`), the cross-module POS note updated to name the exact endpoints, and `TEST_CASES.md` §15 gained CUST-H-12/H-13/CUST-V-01.
3. **Dead FE hook removed** — `useSaveOrFindCustomer` deleted from `frontend/src/features/customers/api.ts`, matching the documented resolution in `review-pos-orders-coupons.md:67`.
4. **Code aligned with shared conventions (Rule 3/§4/§8)** — `listEmployeesSchema`/`listCustomersSchema` now spread `paginationSchema.shape`; `listEmployees`/`listCustomers` use `paginate()`; `employees.service.ts` uses the shared `escapeRegex`; `customers.service.ts` sanitizes the `$text` search term (strips `"`, guards empty); `createEmployeeSchema` gained `.strict()`; `objectIdParam` moved from `employees.routes.ts` into `employees.validation.ts`; FE `baseSalary` gained `.multipleOf(0.01)`; `EmployeeList` uses the shared `lib/format` `formatCurrency`; `CustomerList` action buttons wrapped in `PermissionGate` (matching `EmployeeList`); dead `isActive` params removed from `useCustomersList`/`useUpdateCustomer`.
5. **Stale test-case wording corrected** — `TEST_CASES.md` XMOD-03 reworded from "Delete (soft) a Customer" to hard delete, with the order detail resolving via `customerName`/`customerPhone` snapshot fields.

**Doc(s) updated:**
- `API.md` §14.5 (rewritten), §21 (save-or-find row + notes)
- `TEST_CASES.md` §15 (CUST-H-12/H-13, CUST-V-01), §22 (XMOD-03)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/employees/employees.validation.ts` (`.strict()`, `paginationSchema` spread, `objectIdParam` moved in)
- `backend/src/modules/employees/employees.routes.ts` (import `objectIdParam` from validation; dropped inline `z` schema)
- `backend/src/modules/employees/employees.service.ts` (shared `escapeRegex` + `paginate()`)
- `backend/src/modules/customers/customers.validation.ts` (`paginationSchema` spread)
- `backend/src/modules/customers/customers.service.ts` (shared `paginate()`; `$text` term sanitized)
- `frontend/src/features/customers/api.ts` (dead `useSaveOrFindCustomer` removed; dead `isActive` params removed)
- `frontend/src/features/employees/schema.ts` (`.multipleOf(0.01)` on `baseSalary`)
- `frontend/src/features/employees/components/EmployeeList.tsx` (shared `formatCurrency`)
- `frontend/src/features/customers/components/CustomerList.tsx` (`PermissionGate` on edit/delete buttons)

**Reasoning:** The `API.md` §14.5 text described the pre-NID-decision employee-on-`User` design and was the sole contract doc contradicting the settled standalone-Employee collection — per the review discipline it was amended to state the implemented behavior rather than reshaping code to a stale spec (same treatment as the earlier Settings and Income & Expenses reconciliations). The remaining changes are mechanical alignments with already-established shared conventions (`paginationSchema`/`paginate`/`escapeRegex`, `.strict()` parity, `.multipleOf(0.01)`, `PermissionGate`, shared `formatCurrency`), plus removal of code the docs already claimed was gone.

### [—] Attendance — Code-Review Reconciliation — 2026-08-13

**Open item resolved:** Flags from the Attendance code review: (1) `POST /attendance/batch` emitted `attendance:marked` with an off-contract `{ batch: true, date, count }` payload (`API.md` §23 defines `{ employeeId, date, status }`), and no FE component subscribed to the attendance events, so the documented "live attendance view" never refreshed across terminals; (2) attendance reimplemented pagination inline instead of the shared `paginationSchema`/`paginate()`; (3) `normalizeDate` built **local** midnight while `database.md` §3.11 specifies "normalized to midnight UTC", and `TodayResponse.date`/event dates were serialized with `toISOString()` while record `date`s used a local-date string — on any non-UTC server the serialized date shifted to the previous calendar day; (4) attendance status colors were absent from `theme.md` §12's authoritative badge mapping, and the FE invented solid-fill treatments (`bg-green-500 text-white`, solid calendar cells) contradicting §12's "never a solid fill" and §1's "never solid-color text-on-color"; (5) `AttendanceHistoryList`/`AttendanceCorrectionForm` remained on disk after decision [—] 2026-07-10 removed the History section (only the page tab was removed), leaving the module's only form (RHF-free, Zod-free, manual `useState` payloads) unreachable and `schema.ts` unreferenced; (6) `tryEmit` used a lazy `require('../../config/socket')` instead of the static `getIO` import every other service uses; (7) `date`/`from`/`to` query params were unvalidated `z.string()` — a malformed value produced an Invalid Date and a 500 instead of a 400; (8) §12 doc conflict — `AI_rules` §3/§8 list Attendance among modules using the shared `?range=&from=&to=` shape, but `API.md` §14 defines the attendance list as `?from=&to=`-only and the strict schema rejects `range`.

**Decision:**
1. **Batch event contract fixed** — `POST /attendance/batch` now emits one `attendance:marked` per successfully created record with the exact §23 payload `{ employeeId, date, status }`; records that failed (write errors) are skipped. No §23 contract change needed.
2. **Live view wired** — `TodayAttendanceSheet` subscribes to `attendance:marked`/`attendance:updated` and invalidates `['attendance']` queries (same listener pattern as the Tables floor grid), fulfilling §23's "Live attendance view" consumer.
3. **Shared pagination** — `listAttendanceQuerySchema` now spreads `paginationSchema.shape`; `listAttendance` uses `paginate()`.
4. **UTC-midnight dates** — `normalizeDate` now builds `Date.UTC(...)` midnight per `database.md` §3.11; `formatLocalDate` replaced with `formatDate` (UTC getters); `TodayResponse.date` and both event payloads serialize the calendar-day string (`YYYY-MM-DD`), consistent with record `date`s in every timezone.
5. **Attendance statuses registered in `theme.md` §12** (present→green, absent→red, late→yellow, half-day→blue); the FE converted to the tinted §12 treatment (tinted bg + dark text, solid only in the §12 dot positions); the calendar's "today" ring now uses the `--ring` token instead of `ring-blue-400`.
6. **Dead code removed** — `AttendanceHistoryList.tsx` and `AttendanceCorrectionForm.tsx` deleted, completing decision [—] 2026-07-10's "History section removed" (which had only removed the page tab). `schema.ts` is retained as the template-required FE/backend shape record; the RHF/Zod gap is resolved by removal — the surviving UI (quick-mark buttons, calendar, filters) contains no forms.
7. **Static socket import** — `tryEmit`'s lazy `require` replaced with the top-level `getIO` import and inline try/catch, matching the other services.
8. **Date params validated** — `date`/`from`/`to` must match `YYYY-MM-DD` (`400 VALIDATION_ERROR` instead of a 500 from an Invalid Date).
9. **§12 flag resolved — attendance keeps `?from=&to=` date filtering** — its list is a record-history filter, not a report date range; `API.md` §14's shape predates the shared `?range=` shape and the strict schema rejects `range`. `AI_rules` §8 amended to drop Attendance from the shared-hook list with a pointer to this entry.

**Doc(s) updated:**
- `theme.md` §12 (Attendance status rows)
- `AI_rules.md` §8 (date-range hook list — Attendance exception noted)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/attendance/attendance.validation.ts` (`paginationSchema` spread; `date`/`from`/`to` `YYYY-MM-DD` regex)
- `backend/src/modules/attendance/attendance.service.ts` (per-record batch emits; `paginate()`; UTC-midnight `normalizeDate` + UTC `formatDate`; static `getIO`; off-contract `id` dropped from the update emit; unused `BatchAttendanceRecord` import removed)
- `frontend/src/features/attendance/components/TodayAttendanceSheet.tsx` (socket listener; tinted §12 status buttons)
- `frontend/src/features/attendance/components/AttendanceCalendar.tsx` (tinted §12 status cells; `--ring` today ring)
- `frontend/src/features/attendance/components/AttendanceHistoryList.tsx` (deleted — dead since decision [—] 2026-07-10)
- `frontend/src/features/attendance/components/AttendanceCorrectionForm.tsx` (deleted — dead since decision [—] 2026-07-10)

**Reasoning:** The date normalization was reshaped to `database.md` §3.11's documented "midnight UTC" contract — the previous local-midnight storage was only equivalent on a UTC server, and the mixed serialization (ISO for today/events, calendar string for records) made the same day render differently depending on consumer timezone. The event deviations were code-side fixes because §23's `{ employeeId, date, status }` shape is the binding contract and the batch shape was never documented. The History-section deletion completes a settled decision rather than inventing new behavior, and the `?from=&to=` retention is documented as an explicit exception to `AI_rules` §8 rather than silently left as a conflict.

### [—] Tables — Code-Review Reconciliation — 2026-08-13

**Open item resolved:** Seven flags from the Tables code review: (1) FE `tables/page.tsx` passed an `onDelete` prop that `TableGridProps` never defined (the repo's only FE typecheck errors — TS2322/TS7006), and the grid rendered no delete control, so table deletion was unreachable from the UI despite decision [—] 2026-07-24 keeping Delete available; (2) `GET /tables` re-implemented pagination inline with a 50-row default that silently truncated the floor grid (`tableCount` max 100, API.md §11 documents "List all tables"); (3) §12 docs conflict on delete semantics — `API.md` §11/§26 and `database.md` §3.3/§5.10 said "blocked if `currentOrderId` is non-null" while PRD §5 / decision [—] 2026-07-23 and the code implement "blocked while a live order references it"; (4) `TABLE_NUMBER_IN_USE` thrown by the code but absent from `API.md` §26; (5) the manual-override socket emit carried an undocumented `source` field; (6) stale `TEST_CASES.md` tables rows using the pre-settlement field names (`label`/`area`/`orderId`), code `TABLE_HAS_ACTIVE_ORDER`, `reason`, and a nonexistent `/warn` response field; (7) dead code — `CreateTableDialog.tsx` (and its sole consumer, `useCreateTable`) plus the unused `TABLE_STATUS_CONFIG` export.

**Decision:**
1. **Delete control restored on the grid** — `TableGrid` gains an `onDelete` prop and a `PermissionGate tables/delete` trash button per tile; `DeleteTableDialog`'s destructive confirm is gated with `PermissionGate tables/delete` (matching the coupons-review pattern); both tsc errors in `tables/page.tsx` are resolved.
2. **`GET /tables` is unpaginated** — returns the full table set sorted by `tableNumber` (numeric collation) as `{ data }`, matching `API.md` §11's "List all tables ... for the floor-plan grid"; `listTablesSchema` keeps only the `status` filter; FE `TableListResponse` drops `meta`. (A fixed 50-row default silently truncated the floor grid once `tableCount` exceeded 50.)
3. **Delete semantics doc-amended (§12)** — `API.md` §11/§26 and `database.md` §3.3/§5.10 now state the implemented behavior: deletion is blocked while a live (non-completed, non-cancelled) order references the table (`409 TABLE_IN_USE`); a stale `currentOrderId` pointing at a completed/cancelled order no longer blocks deletion (historical orders stay intact via `tableLabelSnapshot`). Code unchanged.
4. **`TABLE_NUMBER_IN_USE` documented** — added to `API.md` §26 (409, duplicate `tableNumber` on POST/PUT), matching the code and TBL-V-05; `updateTable` now maps a raced E11000 to the same 409 instead of a raw 500 (the pre-check remains as a fast path).
5. **`table:statusChanged` payload cleaned** — the manual-toggle emit no longer carries the undocumented `source` field, matching `API.md` §25's `{ tableId, tableNumber, status, orderId? }`. (The unresolved L2 `source` extras on the POS/Orders emits remain tracked in `review-pos-orders-coupons.md:192` — separate review scope.)
6. **Rule 1 cleanup** — `(err as any).code` typed as `(err as { code?: number }).code`; unused `escapeRegex` import removed from `tables.service.ts`.
7. **Doc cleanups** — `API.md` §11 `GET /tables/:id` wording corrected to the implemented string-id response; `theme.md` §17b order-indicator pill updated to the implemented "In Use" label, and the empty-state guidance to the Settings-driven message; `TEST_CASES.md` tables rows rewritten to settled names/codes; dead `CreateTableDialog.tsx` deleted and unused `TABLE_STATUS_CONFIG`/`useCreateTable` removed.

**Doc(s) updated:**
- `API.md` §11 (GET /tables unpaginated + status filter, GET /tables/:id wording, DELETE semantics), §26 (`TABLE_IN_USE` wording, `TABLE_NUMBER_IN_USE` added)
- `database.md` §3.3, §5.10 (delete-guard semantics)
- `theme.md` §17b (order pill "In Use", empty-state guidance)
- `TEST_CASES.md` §24 (tables section rewritten)
- `decision.md` (this entry)

**Files changed:**
- `backend/src/modules/tables/tables.validation.ts` (pagination fields dropped from `listTablesSchema`)
- `backend/src/modules/tables/tables.service.ts` (unpaginated `listTables`; E11000 → 409 in `updateTable`; typed err cast; `source` removed from emit; unused import removed)
- `frontend/src/features/tables/api.ts` (`TableListResponse`/`TableListParams` unpaginated; `TABLE_STATUS_CONFIG` and `useCreateTable` removed)
- `frontend/src/features/tables/components/TableGrid.tsx` (`onDelete` prop + `PermissionGate tables/delete` trash button per tile)
- `frontend/src/features/tables/components/DeleteTableDialog.tsx` (confirm gated with `PermissionGate tables/delete`)
- `frontend/src/features/tables/components/CreateTableDialog.tsx` (deleted — dead since decision [—] 2026-07-24)

**Reasoning:** The delete-guard semantics conflict was resolved by amending the docs to the implemented, decision-anchored behavior (PRD §5 + decision [—] 2026-07-23) — a stale `currentOrderId` pointing at a completed/cancelled order is a residue reference, not an in-use table, and `tableLabelSnapshot` already protects historical bills. Everything else is mechanical: restoring the grid delete control the decision promised (the review's only High finding, and the repo's only FE tsc errors), unpaginating a list whose contract is "all tables" for a grid capped at 100 rows, documenting codes the code already threw, and deleting code that has been dead since the 2026-07-24 decision removed the Add Table button.
### [21] Order Integrity Fixes — Transactional Edits, Coupon Quota Return, Cash Guards — 2026-08-17

**Status:** Implemented.

**Changes:**

1. **`updateOrder` is now fully transactional** — table (re)booking, the order write, old-table release, coupon `usageCount` decrement, and payment-split recording all commit in one `withTransaction`. The old code booked the new table and recorded the payment split *before* the order write, so a failed write left a phantom booking and a split that never got applied. Paid/cancelled guards are re-checked inside the transaction on the fresh document (`ORDER_ALREADY_PAID` / `ORDER_CANCELLED`), closing the race where a concurrent capture lands between the pre-read and the write.
2. **Coupon `usageCount` is now returned, not just consumed** — when an order's coupon is removed (`discountPercent` set, or coupon nulled via items edit), `usageCount` is decremented (guarded `{ $gt: 0 }`) inside the same transaction. Previously usage count was increment-only, so cancelled/edited orders permanently burned quota.
3. **No more silent coupon zeroing** — editing `items` on an order whose attached coupon is expired/disabled/below `minOrderAmount` now rejects with new error `400 COUPON_NOT_APPLICABLE` (added to `API.md` §26). Previously the discount was silently dropped, hiding money owed to the customer.
4. **Cash guard now measures the outstanding balance** — on mixed payments (`previousPayments` present), `cashTendered` must cover `round2(grandTotal − Σ previousPayments)`, not the full total, and `changeAmount` is `round2(max(0, cashTendered − outstanding))`. The previous vacuous guard compared `totalCollected ≥ grandTotal` with the old cash tendered, which never fired in the mixed-payment branch.
5. **`updateOrderStatus` re-reads inside the transaction** — the paid branch checks `fresh.grandTotal` for the cash guard, `fresh.tableId`/`fresh.tableLabelSnapshot` for the unbooking, and `fresh.status === 'cancelled'` → `ORDER_CANCELLED` on the fresh doc; the transition branch re-checks `VALID_TRANSITIONS` against the fresh status (idempotent early return if already in target state). Socket emits now use the captured fresh values.
6. **Reports discount allocation** — `byProduct`/`byCategory` income now allocates the whole-order `discountAmount` proportionally per unit (`discountPerUnit = discountAmount / subtotal`, guarded for `subtotal = 0`), so per-product sums reconcile with the summary `grandTotal`. Previously those facets summed pre-discount `lineTotal`, making them overstate revenue versus the summary row.

**Tests:** 11 regression tests added (coupon decrement, `COUPON_NOT_APPLICABLE`, `ORDER_ALREADY_PAID`, `ORDER_CANCELLED` on items edit and paid capture, outstanding-balance cash guard, server-computed change, transactional re-read path); the 4 pre-existing failures fixed (stale "Auto Round" bill test + 3 timeouts from un-mocked `Table`/`Coupon`/`lib/transaction`). Full suite: 196/196 green, `tsc --noEmit` clean.

**Doc(s) updated:** `API.md` §26 (`COUPON_NOT_APPLICABLE`), `TEST_CASES.md` (ORD-E-08/09/10, ORD-H-09).

### [22] Security & Frontend Review Round — 2026-08-17

**Status:** Implemented (deferrals noted).

**Changes:**

1. **Socket events are now permission-scoped** — every `emit` was a global broadcast; a cashier with no `tasks` permission still received `task:assigned`, table statuses, etc. Sockets now join `room:<module>` per their JWT permission set (plus `user:<id>`), and all ~20 emit sites route through `.to(room)`. `task:assigned` is user-scoped to the assignee. (Room membership derives from the access token, so permission changes apply on next token refresh — documented behavior.)
2. **Rate limiters trust one proxy hop** (`app.set('trust proxy', 1)`) so clients behind nginx/caddy are keyed by real IP instead of sharing one bucket.
3. **Backup/reset/restore are admin-only** — `/settings/backup` previously exposed `passwordHash` under `settings:view`; all three endpoints now require role `admin` via new `requireAdmin` middleware.
4. **Uploads verify file content, not just the client header** — magic-byte sniffing (JPEG/PNG/WebP) rejects mismatched/unknown content (`INVALID_FILE_CONTENT`, `MIME_MISMATCH`). Cloudinary deletion refuses `publicId`s outside the app root folder.
5. **`objectIdParam` strengthened** — 9 modules + users routes accepted any non-empty `:id` (CastError → 500); all now share `lib/object-id.ts` with the 24-hex regex (400 instead).
6. **Frontend** — fixed the orders-page socket guard that prevented listeners from ever attaching when the socket wasn't yet connected; removed duplicate `$`/৳ currency helpers in favor of `lib/format.ts`; emerald accents replaced with the `success` token; POS cart quantity controls enlarged to 36px tap targets; `font-mono` removed per theme.md's no-override rule.
7. **Salary advance is atomic** — `addAdvance` now uses a single `updateOne` with `$expr` (Σ advances + amount ≤ baseSalary, status active) instead of read-modify-write, closing the double-advance race; amount rounded to 2dp.
8. **Customer `$unset`** — clearing `email`/`phone`/`address` now actually removes the field (`$unset`) instead of writing `undefined`, which the driver strips.
9. **`task:assigned` payload fixed** — the emit captured `task.assignedTo.toString()` *after* population, sending `[object Object]`.
10. **Category duplicate-name race** — E11000 on concurrent create/update mapped to the same 400 as the pre-check. **Product image lifecycle** — the old Cloudinary image is now deleted only after the product update succeeds (previously deleted first, orphaning on failure).

**Deferred (documented, not silent):** refresh-token revocation remains Phase 2 per `ARCHITECTURE.md` §6.6 (7-day natural expiry, code comment in `auth.service.ts`); activity-log descriptions are stored raw but the frontend has zero `dangerouslySetInnerHTML` usages (React escaping renders them inert); date-range/report day boundaries remain server-local (`normalizeDateRange` + `serverTimezone()` are mutually consistent) — a production deployment should set the container TZ to `Asia/Dhaka`.

**Verification:** backend `tsc --noEmit` clean; vitest 196/196; frontend `next build` clean.
