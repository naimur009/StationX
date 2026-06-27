# Implementation Plan — Dashboard (Overview)

---

## Feature Overview

| Attribute | Value |
|---|---|
| **Feature name** | Dashboard (Overview) |
| **PRD Feature** | Feature 3 |
| **Backlog item** | 12. Dashboard (Overview) |
| **Documentation** | `PRD.md` §3, `API.md` §7, `DATABASE.md` §5.4, `ARCHITECTURE.md` §7/§9, `AI_rules.md` §6/§8 |
| **Business goal** | Provide restaurant staff and managers a real-time snapshot of today's/wcek's/month's performance at a glance — total revenue, products sold, orders completed, and the top-10 best-selling items — so they can make quick operational decisions without running a full report. |
| **User value** | Eliminates the need to navigate to Reports for basic numbers; enables at-a-glance daily performance monitoring from the landing page after login. |

---

## Approved Scope

1. Two read-only aggregation endpoints: `GET /dashboard/metrics` and `GET /dashboard/top-items`
2. Date-range filter supporting `today`, `week`, `month`, and `custom` ranges (shared pattern from Reports)
3. Three metric cards (MetricCard component already exists): Total Earned, Products Sold, Orders Completed
4. Top-10 items ranked list (not a DataTable, not a chart)
5. Quick-access shortcut cards to POS, Orders, Products, Customers
6. Socket listener for `dashboard:metricsInvalidate` → `queryClient.invalidateQueries(['dashboard'])`
7. `Cache-Control: private, max-age=15` header on both endpoints
8. Extract `normalizeDateRange` from `reports.service.ts` into shared `backend/src/lib/date-range.ts`
9. Create `formatCurrency` utility in `frontend/src/lib/format.ts`

---

## Out of Scope

| Item | Rationale |
|---|---|
| Trend indicators on metric cards (up/down arrows, % change vs. prior period) | `backlog.md` lists "trend indicators if any" as open — not specified in PRD. Adds complexity (needs prior-period aggregation) without a stated requirement. Deferred. |
| Bar chart / visual chart for top items | `backlog.md` lists "ranked list vs bar chart" as open — PRD says "Top 10 best-selling items" without specifying visualization. Ranked list is simplest and correct for v1. |
| Income sub-view as a tab within the Dashboard page | Income is defined as a sub-view (`ARCHITECTURE.md` §9, `API.md` §8) under the `dashboard` permission key, but it has its own dedicated route (`/income`) and endpoint (`GET /income`). It will be implemented as a separate task (Task 13). |
| Configurable currency symbol | Hardcoded BDT for v1 (`PRD.md` §14 Settings: "currency hardcoded to BDT"). |
| Auto-refresh / polling | Socket `dashboard:metricsInvalidate` handles real-time updates. No polling interval needed. No requirement for a WebSocket-free fallback beyond manual refetch (which React Query provides by default on window refocus). |
| Redis caching layer | `ARCHITECTURE.md` §2/§10 defers Redis to Phase 2+. `Cache-Control: private, max-age=15` header is the placeholder until Redis is added. |

---

## Technical Decisions

### Decision 1: Dashboard filters `status: 'completed'`, not `{ $ne: 'cancelled' }`

**Context:** `DATABASE.md` §5.4 says all aggregation pipelines (Dashboard, Income, Reports) should filter `status: { $ne: 'cancelled' }`. However, `PRD.md` §3 explicitly says "total orders **completed**." `TEST_CASES.md` DASH-E-03 flags this conflict.

**Decision:** Dashboard metrics filter on `status: 'completed'` (strict equality). `pending` orders represent unpaid/unfinalized dine-in tabs and must not be counted as "earned," "sold," or "completed." This is a stricter filter than the shared `buildCancelledExcludedMatch()` provides.

**Impact:**
- `buildCancelledExcludedMatch()` (`backend/src/lib/aggregation.ts`) is NOT used by Dashboard. Dashboard builds its own `$match: { status: 'completed', createdAt: { ... } }` pipeline stage.
- Reports and Income continue using `buildCancelledExcludedMatch()` (they may include `pending` orders depending on their aggregation intent — for Sales Reports, `pending` orders are still "in the system" even if not finalized).
- The `buildCancelledExcludedMatch` helper doc comment should note: "Dashboard uses strict `status: 'completed'` match — see `tasks/implementation_plan.md` Decision 1."

### Decision 2: Top-items sorted by revenue descending, ties broken by name

**Context:** `TEST_CASES.md` DASH-E-05 requires deterministic secondary sort for ties.

**Decision:** Primary sort: `revenue` descending. Secondary sort: `name` ascending (alphabetical). This ensures stable ordering across requests.

### Decision 3: Ranked list (not DataTable) for top items

**Context:** `backlog.md` says "Top-10 items list/chart."

**Decision:** Simple numbered list with rank, item name, units sold, and revenue. No DataTable, no bar chart. This matches the feed/at-a-glance nature of a dashboard overview page. The DataTable pattern is for data-management lists (Orders, Products, Customers), not for a single small-ranked list.

### Decision 4: Currency hardcoded to BDT

**Context:** `PRD.md` §14 says "currency hardcoded to BDT." `theme.md` doesn't define a currency symbol.

**Decision:** `formatCurrency` uses the `৳` symbol (Bengali rupee sign for BDT) hardcoded. A comment in the utility function notes this should read from `Settings.currency` when multi-currency support is added. No currency field is added to the Settings schema.

### Decision 5: Quick-access cards show 4 modules in a 2×2 grid

**Context:** PRD §3 says "Quick-access buttons/shortcuts to other modules (POS, Orders, Tasks, etc.)."

**Decision:** Four shortcuts: POS (`/pos`), Orders (`/orders`), Products (`/products`), Customers (`/customers`). These are the most common post-login destinations. 2×2 grid on mobile, 2×2 on desktop. Icons from `lucide-react`. Renders even if the user lacks permission for a module (permission gate at the destination route handles that).

---

## Frontend Impact

### Pages
| File | Action | Notes |
|---|---|---|
| `frontend/src/app/(dashboard)/overview/page.tsx` | **Rewrite** | Replace placeholder with full dashboard layout using `DashboardMetrics`, `TopItemsList`, `QuickAccess`, and `DateRangeFilter`. Keep `PermissionGate` wrapper. Add socket listener for `dashboard:metricsInvalidate`. |

### New Feature Files
| File | Purpose |
|---|---|
| `frontend/src/features/dashboard/api.ts` | React Query hooks: `useDashboardMetrics`, `useDashboardTopItems` |
| `frontend/src/features/dashboard/components/DashboardMetrics.tsx` | Renders 3 `MetricCard` components in responsive grid |
| `frontend/src/features/dashboard/components/TopItemsList.tsx` | Ranked list of top items with loading/empty/error states |
| `frontend/src/features/dashboard/components/QuickAccess.tsx` | 4 quick-access shortcut cards as a 2×2 grid |

### New Utility
| File | Purpose |
|---|---|
| `frontend/src/lib/format.ts` | `formatCurrency(amount: number): string` — returns `৳{amount.toLocaleString()}` format |

### State Management
- **React Query:** All dashboard data flows through `useDashboardMetrics` and `useDashboardTopItems` hooks. Query key pattern: `['dashboard', '<sub-resource>', '<param-string>']`.
- **Socket listener** in the page component calls `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` on `dashboard:metricsInvalidate` events.
- **No Zustand needed** — dashboard has no client-only state that survives cache invalidation.

### Form Validation
- Not applicable — Dashboard has no forms. The `DateRangeFilter` controls the query params for API calls.
- Frontend schema file (`frontend/src/features/dashboard/schema.ts`) is omitted for v1 since there are no form bodies to validate. Types are defined inline or exported from `api.ts`.

### Theme Tokens Used
| Token | Where | Source (§theme.md) |
|---|---|---|
| `--background` (slate-50) | Page canvas | §2 |
| `--border` (slate-200) | MetricCard border, TopItemsList container border | §2, §13 MetricCard |
| Text `slate-500` | MetricCard title, list labels | §2 |
| Text `slate-800` / `slate-900` | Page title "Dashboard", list item names | §2 |
| `--primary` (blue-600) | MetricCard icon BG for "Products Sold" | §2, §13 MetricCard blue variant |
| `--success` (green-600) | MetricCard icon BG for "Total Earned" | §2, §13 MetricCard green variant |
| `--info` (indigo-600) | MetricCard icon BG for "Orders Completed" | §2, §13 MetricCard indigo variant |
| `rounded-2xl` | MetricCard container | §4, §13 MetricCard |
| `rounded-xl` | QuickAccess cards | §4 |
| `shadow-sm` | MetricCard, QuickAccess cards | §5, §13 MetricCard |
| `shadow-md` | MetricCard icon wrapper | §5, §13 MetricCard |
| Breakpoint `sm` (640px) | 2-column metric grid | §7 |
| Breakpoint `lg` (1024px) | 3-column metric grid | §7 |
| `animate-pulse` | Loading skeletons | §13 DataTable loading |
| `gap-4` / `gap-6` / `space-y-6` | Component and page spacing | §6 |
| `text-xl` / `text-2xl` font-bold | Page title | §3 |
| `text-2xl` / `text-3xl` font-bold | Metric values (via MetricCard) | §3, §13 MetricCard |
| `text-sm font-medium` | MetricCard title, list item labels | §3, §13 MetricCard |

---

## Backend Impact

### New Module Files
| File | Purpose |
|---|---|
| `backend/src/modules/dashboard/dashboard.validation.ts` | Zod schemas for both query param shapes |
| `backend/src/modules/dashboard/dashboard.service.ts` | `getMetrics()` and `getTopItems()` aggregation functions |
| `backend/src/modules/dashboard/dashboard.controller.ts` | Two request handlers |
| `backend/src/modules/dashboard/dashboard.routes.ts` | Router with middleware chain |

### Modified Files
| File | Change |
|---|---|
| `backend/src/app.ts` | Add `import dashboardRoutes` and mount `/api/v1` |
| `backend/src/lib/date-range.ts` | **NEW** — extracted `normalizeDateRange` from `reports.service.ts` |
| `backend/src/modules/reports/reports.service.ts` | Remove local `normalizeDateRange`, import from `backend/src/lib/date-range.ts` |
| `backend/src/lib/aggregation.ts` | (Optional) Add JSDoc comment noting Decision 1 |

### Business Logic
**`getMetrics(query)`:**
1. Parse and normalize date range via shared `normalizeDateRange`
2. Build aggregation pipeline: `$match { status: 'completed', createdAt: { $gte, $lte } }` → `$group` by null → compute `totalEarned` (sum of `grandTotal`), `totalProductsSold` (sum of `items.quantity`), `totalOrdersCompleted` (count)
3. Return `{ range: { from, to }, metrics: { totalEarned, totalProductsSold, totalOrdersCompleted } }`
4. If no results, return zeroes (not an error — `TEST_CASES.md` DASH-E-01)

**`getTopItems(query)`:**
1. Parse and normalize date range via shared `normalizeDateRange`
2. Build aggregation pipeline: `$match { status: 'completed', createdAt: { $gte, $lte } }` → `$unwind '$items'` → `$group` by `{ productId, name }` → compute `unitsSold` and `revenue` → `$sort` by revenue desc, name asc → `$limit` → `$project` clean shape
3. Return `{ range: { from, to }, topItems: [...] }`
4. If no results, return empty array (not an error — DASH-E-04)

---

## Database Impact

| Entity | Change |
|---|---|
| `Order` collection | No schema changes. The existing `{ status: 1, createdAt: -1 }` compound index at `DATABASE.md` §3.8 covers the Dashboard aggregation queries. |
| `Order.items.productId` multikey index | Already exists. Covers the top-items `$unwind` + `$group` aggregation. |

No new models, no new fields, no new indexes needed.

---

## API Impact

### New Endpoints

#### `GET /api/v1/dashboard/metrics?range=today|week|month|custom&from=ISO&to=ISO`

| Attribute | Value |
|---|---|
| **Auth** | Required |
| **Permission** | `dashboard: view` |
| **Validation schema** | `dashboardMetricsQuerySchema` — range enum default `today`, `from`/`to` strings optional, `refine` that custom range requires both `from` and `to` |
| **Cache** | `Cache-Control: private, max-age=15` |
| **Response** | `{ data: { range: { from, to }, metrics: { totalEarned, totalProductsSold, totalOrdersCompleted } } }` |
| **Errors** | `400 VALIDATION_ERROR` |

#### `GET /api/v1/dashboard/top-items?range=today|week|month|custom&from=ISO&to=ISO&limit=10`

| Attribute | Value |
|---|---|
| **Auth** | Required |
| **Permission** | `dashboard: view` |
| **Validation schema** | `dashboardTopItemsQuerySchema` — same as metrics + `limit` coercible int, positive, max 50, default 10 |
| **Cache** | `Cache-Control: private, max-age=15` |
| **Response** | `{ data: { range: { from, to }, topItems: [{ productId, name, unitsSold, revenue }] } }` |
| **Errors** | `400 VALIDATION_ERROR` |

### Existing Endpoints Modified
None.

### Response Contracts
Both endpoints wrap in `{ data: ... }` per `API.md` §2 success envelope convention. No `meta` block (these are not paginated lists; they are computed aggregates).

---

## Authentication & Authorization

| Route | Middleware | Permission |
|---|---|---|
| `GET /dashboard/metrics` | `authenticate`, `authorize('dashboard', 'view')` | `dashboard: view` |
| `GET /dashboard/top-items` | `authenticate`, `authorize('dashboard', 'view')` | `dashboard: view` |

Admin bypasses `authorize` per `ARCHITECTURE.md` §6.

---

## Security Requirements

| Requirement | Implementation |
|---|---|
| Server-side validation | Both endpoints validate query params via Zod before reaching the service layer. Invalid `range` values, missing `from`/`to` for custom range, negative/missing limits all return `400 VALIDATION_ERROR`. |
| Rate limiting | Not applied to dashboard endpoints — they are authenticated, low-overhead aggregation reads. Rate limiting for read endpoints is not specified in any doc. |
| Permission enforcement | Frontend `PermissionGate` wraps the page; backend `authorize` middleware is the real security boundary per `AI_rules.md` §5. |
| Data isolation | Single-tenant (`ARCHITECTURE.md` §1). No restaurant ID scoping needed. |

---

## Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EC-01 | No orders exist in the selected range | `metrics` all `0`, `topItems` empty array — not a 404 or error |
| EC-02 | All orders in range are `cancelled` or `pending` (none `completed`) | Same as EC-01 — Dashboard filters `status: 'completed'` strictly |
| EC-03 | Fewer than `limit` distinct products sold | Return however many exist, no padding, no error |
| EC-04 | More products sold than `limit` | Return top `limit` sorted by revenue descending |
| EC-05 | Tie in revenue between two products | Secondary sort by name (alphabetical ascending) for deterministic ordering |
| EC-06 | Product later soft-deleted | Top-items still shows it (data comes from `Order.items.nameSnapshot`, not live `Product`) |
| EC-07 | `range=custom` without `from` or `to` | `400 VALIDATION_ERROR` from Zod refine |
| EC-08 | `range=invalid` | `400 VALIDATION_ERROR` — range is a Zod enum |
| EC-09 | `limit=0` or negative | `400 VALIDATION_ERROR` — Zod `positive()` |
| EC-10 | `limit=999` (exceeds max 50) | Zod caps at 50 via `.max(50)` |
| EC-11 | Large order count in range (performance) | Aggregation uses indexed `{ status, createdAt }` — performant at scale. Top-items `$unwind` followed by `$group` is a known pattern for multikey arrays. |
| EC-12 | User without `dashboard:view` navigates to `/overview` | `PermissionGate` shows fallback (not the page content). API returns `403 FORBIDDEN` if accessed directly. |
| EC-13 | Dashboard open in two browser tabs; an order is completed in POS | Both tabs receive `dashboard:metricsInvalidate` via socket and refetch metrics/top-items |
| EC-14 | Socket never connects (network blocks WebSocket) | Dashboard still functions via React Query's default `refetchOnWindowFocus`. No broken UI — `dashboard:metricsInvalidate` simply never arrives, which is acceptable per `TEST_CASES.md` CC-RT-03. |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Performance risk:** `$unwind` on `Order.items` for top-items aggregation could be slow on a large order collection | Low at v1 scale (<100K orders) | Medium — slow page load for Dashboard | Multikey index on `items.productId` exists. Monitor in production; add a pre-aggregated top-items cache collection if needed (Phase 2). |
| **Decision 1 conflict:** Reports/Income may need `status: { $ne: 'cancelled' }` while Dashboard needs `status: 'completed'`. If the shared helper is updated to `completed`, Reports may break. | Low — Reports already uses `buildCancelledExcludedMatch` directly | High — financial reports would exclude pending orders incorrectly | Dashboard builds its own `$match` pipeline; Reports and Income remain on the shared helper. Documented in Decision 1. |
| **Currency assumption:** BDT hardcoded for all currency display. If the restaurant uses a different currency, all numbers show wrong symbol. | Low — `PRD.md` §14 explicitly hardcodes BDT | Medium — UI shows wrong currency symbol | Hardcode BDT for v1; note in code comment that this should read from `Settings` when multi-currency is needed. |
| **`normalizeDateRange` extraction breaks Reports** during extraction | Low (extraction is mechanical) | High — Reports endpoint would 500 | Write the extraction and verify by running the existing Reports test suite. |

---

## Doc Updates Required

### Open item: `API.md` §25.2 — Income permission key

This task does NOT directly implement Income, but it does confirm that the Dashboard module's permission key (`dashboard:view`) covers Income as a sub-view. No upstream doc edit is needed — the current `API.md` §24 already states `"dashboard: view — Includes the Income sub-view"` and `API.md` §8 confirms `"Permission module key: dashboard"`.

**Action:** No edit needed. Verify the existing text is correct during implementation.

### Open item: `TEST_CASES.md` DASH-E-03 — status filter for Dashboard

`TEST_CASES.md` §3 DASH-E-03 flags the question of whether `pending` should be excluded from Dashboard metrics. This plan resolves it (Decision 1: strict `status: 'completed'`). The TEST_CASES.md should be updated to reflect this resolution.

**Action:** Edit `docs/TEST_CASES.md` once implementation starts to resolve the flag in DASH-E-03.

### Open item: `DATABASE.md` §5.4 — cancelled-order exclusion rule

`DATABASE.md` §5.4 says "every aggregation pipeline (Dashboard metrics, Income, Sales Report) must filter `status: { $ne: 'cancelled' }`" — but Dashboard now uses `status: 'completed'` instead. The doc should note this exception.

**Action:** No immediate edit — the rule is still correct for Income and Reports. Add an inline note if `DATABASE.md` is revised.

---

## Implementation Order

The implementation must proceed in dependency order:

```
Extract normalizeDateRange          ─┐
  → Update reports.service.ts import ┤ (prerequisite for Dashboard service)
                                      │
Create Dashboard backend module       │
  1. dashboard.validation.ts          │
  2. dashboard.service.ts             │
  3. dashboard.controller.ts          │
  4. dashboard.routes.ts              │
  5. Register in app.ts              ─┤
                                      │
Create formatCurrency utility         │
  → frontend/src/lib/format.ts       ─┤
                                      │
Create Dashboard frontend files       │
  1. features/dashboard/api.ts        │
  2. features/dashboard/components/   │
     - DashboardMetrics.tsx           │
     - TopItemsList.tsx               │
     - QuickAccess.tsx                │
  3. Update overview/page.tsx        ─┘
                                      │
  Verification                        │
  → tsc --noEmit (both apps)         ─┘
```

---

## Task Breakdown

### Task 1: Extract `normalizeDateRange` to shared lib

**Description:** Move the `normalizeDateRange` helper function from `backend/src/modules/reports/reports.service.ts` into a new file `backend/src/lib/date-range.ts`. Update the import in `reports.service.ts` to use the shared version.

**Files:**
- `backend/src/lib/date-range.ts` — NEW
- `backend/src/modules/reports/reports.service.ts` — MODIFY (remove function + update import)

**Acceptance Criteria:**
- `normalizeDateRange` is importable from `backend/src/lib/date-range`
- `reports.service.ts` imports it from there and all existing report endpoints still work
- `tsc --noEmit` passes

### Task 2: Create Dashboard backend module

**Description:** Build `dashboard.validation.ts`, `dashboard.service.ts`, `dashboard.controller.ts`, and `dashboard.routes.ts` under `backend/src/modules/dashboard/`. Register in `app.ts`.

**Files:**
- `backend/src/modules/dashboard/dashboard.validation.ts` — NEW
- `backend/src/modules/dashboard/dashboard.service.ts` — NEW
- `backend/src/modules/dashboard/dashboard.controller.ts` — NEW
- `backend/src/modules/dashboard/dashboard.routes.ts` — NEW
- `backend/src/app.ts` — MODIFY (add import + mount)

**Acceptance Criteria:**
- `GET /api/v1/dashboard/metrics?range=today` returns `{ data: { range, metrics: { totalEarned, totalProductsSold, totalOrdersCompleted } } }`
- `GET /api/v1/dashboard/top-items?range=month&limit=5` returns top 5 items sorted by revenue desc
- `GET /api/v1/dashboard/metrics?range=custom` returns `400 VALIDATION_ERROR` (missing from/to)
- `GET /api/v1/dashboard/top-items?range=invalid` returns `400 VALIDATION_ERROR`
- `Cache-Control: private, max-age=15` header present on both endpoint responses
- All zeroes when no completed orders exist (not an error)
- `tsc --noEmit` passes

### Task 3: Create `formatCurrency` utility

**Description:** Create a small shared utility function for formatting currency amounts.

**Files:**
- `frontend/src/lib/format.ts` — NEW

**Acceptance Criteria:**
- `formatCurrency(28400)` returns `"৳28,400"`
- `formatCurrency(0)` returns `"৳0"`
- Handles decimal amounts: `formatCurrency(1234.5)` returns `"৳1,234.5"`
- `tsc --noEmit` passes

### Task 4: Create Dashboard frontend feature folder

**Description:** Create `features/dashboard/api.ts` with React Query hooks, and three components: `DashboardMetrics`, `TopItemsList`, `QuickAccess`.

**Files:**
- `frontend/src/features/dashboard/api.ts` — NEW
- `frontend/src/features/dashboard/components/DashboardMetrics.tsx` — NEW
- `frontend/src/features/dashboard/components/TopItemsList.tsx` — NEW
- `frontend/src/features/dashboard/components/QuickAccess.tsx` — NEW

**Acceptance Criteria:**
- `useDashboardMetrics` fetches from `/dashboard/metrics` with correct query params from the filter object
- `useDashboardTopItems` fetches from `/dashboard/top-items` with correct query params
- `DashboardMetrics` renders 3 `MetricCard` components using existing shared component
- `DashboardMetrics` shows loading skeleton state (3 animate-pulse blocks)
- `DashboardMetrics` shows error state with retry button
- `TopItemsList` renders ranked list (1-based rank, name, units sold, revenue)
- `TopItemsList` shows loading skeleton (5 rows)
- `TopItemsList` shows "No items sold in this period." empty state
- `TopItemsList` shows error state with retry button
- `QuickAccess` renders 4 shortcut cards (POS, Orders, Products, Customers) with icons
- `tsc --noEmit` passes

### Task 5: Update Dashboard page

**Description:** Rewrite `frontend/src/app/(dashboard)/overview/page.tsx` to use the new components, `useDateRangeFilter`, and `DateRangeFilter`. Add socket listener for `dashboard:metricsInvalidate`.

**Files:**
- `frontend/src/app/(dashboard)/overview/page.tsx` — REWRITE

**Acceptance Criteria:**
- Page renders with `PermissionGate` wrapper for `dashboard:view`
- Date range filter controls the data shown in metrics + top-items
- Changing the date range triggers API refetch
- Switching to custom range shows date inputs (from/to)
- Metrics cards update when date range changes
- Top items update when date range changes
- Quick-access cards render below the data sections
- Socket listener invalidates `['dashboard']` queries on `dashboard:metricsInvalidate` event
- `tsc --noEmit` passes

### Task 6: Verification

**Description:** Run through all verification test cases.

**Acceptance Criteria:**
- All verification items in `current_task.md` Verification section pass
- `tsc --noEmit` passes on both apps
- Manual API test against all edge cases (EC-01 through EC-14)
- Cross-module check: create an order from POS → Dashboard metrics update on refetch
- Cancel a completed order → Dashboard numbers drop on refetch

---

## Final Approved Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | Dashboard aggregates filter `status: 'completed'` (not `{ $ne: 'cancelled' }`) | PRD says "total orders completed." Pending orders are unpaid tabs. |
| D2 | Top-items sorted by revenue desc, ties broken by name asc | Deterministic ordering required by TEST_CASES.md DASH-E-05. |
| D3 | Top-items rendered as ranked list, not DataTable or chart | Dashboard is at-a-glance, not data management. Matches PRD simplicity. |
| D4 | Currency hardcoded to BDT (`৳`) | PRD.md §14 explicitly hardcodes BDT. |
| D5 | Quick-access shows 4 modules (POS, Orders, Products, Customers) in 2×2 grid | Most common post-login destinations. Permission gates at destination routes. |
| D6 | `DashboardMetrics` metric card colors: green (earned), blue (products), indigo (orders) | Green for money (success), blue for items (primary), indigo for count (info). |
| D7 | No `schema.ts` file for Dashboard feature folder | Dashboard has no forms — only query params. Types are defined inline in `api.ts`. |
| D8 | No `store.ts` for Dashboard feature folder | Dashboard has no client-only state. All data is server state in React Query. |
