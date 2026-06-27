# Current Task — Dashboard (Overview)

**PRD Feature 3** | `API.md` §7 | `DATABASE.md` §5.4 | `ARCHITECTURE.md` §7
**Depends on:** Orders (needs real completed orders to aggregate against)
**Permission module key:** `dashboard` — actions `['view']`. Read-only aggregation; no create/edit/delete routes.
**Sidebar link:** Already exists at `/overview` with `module: 'dashboard'` and `LayoutDashboard` icon (`frontend/src/components/shared/Sidebar.tsx:37`).

---

## Concept

The Dashboard Overview provides a snapshot of restaurant performance in a selected time range. Three key metrics (total earned, total products sold, total orders completed) plus a top-10 best-selling items list. All data is aggregated from the `Order` collection, excluding cancelled orders.

Date range filtering uses the shared `range=today|week|month|custom` pattern (same as Reports). Range defaults to `today`.

---

## Data Model

No new models needed. Dashboard is a pure aggregation layer over the existing `Order` model (`DATABASE.md` §3.8).

### Cancelled-order exclusion

Both endpoints filter `status: { $ne: 'cancelled' }` using the shared helper at `backend/src/lib/aggregation.ts`:

```ts
export function buildCancelledExcludedMatch() {
  return { status: { $ne: 'cancelled' } };
}
```

This helper is reused by Reports (§19) and Income (§8). Already exists — no changes needed.

---

## API Changes

### Update `API.md` §7 — Dashboard

Base path: `/dashboard`. Permission module key: `dashboard` — actions `['view']` only.

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/metrics?range=` | `{ totalEarned, totalProductsSold, totalOrdersCompleted }` for the selected range |
| GET | `/dashboard/top-items?range=&limit=10` | Top-selling items, same range filter, aggregated from `Order.items` |

#### Query Parameters (both endpoints)

| Param | Type | Default | Description |
|---|---|---|---|
| `range` | enum | `today` | `today` \| `week` \| `month` \| `custom` |
| `from` | string (ISO date) | — | Required only when `range=custom` |
| `to` | string (ISO date) | — | Required only when `range=custom` |
| `limit` | integer | 10 | Max items returned (top-items only, max 50) |

#### Response — `GET /dashboard/metrics`

```json
// 200 OK
{
  "data": {
    "range": { "from": "2026-06-27", "to": "2026-06-27" },
    "metrics": {
      "totalEarned": 28400,
      "totalProductsSold": 142,
      "totalOrdersCompleted": 38
    }
  }
}
```

#### Response — `GET /dashboard/top-items`

```json
// 200 OK
{
  "data": {
    "range": { "from": "2026-06-27", "to": "2026-06-27" },
    "topItems": [
      { "productId": "667abc...", "name": "Chicken Fry", "unitsSold": 28, "revenue": 5600 },
      { "productId": "667def...", "name": "Tea", "unitsSold": 45, "revenue": 1350 }
    ]
  }
}
```

`topItems` is always sorted descending by `revenue`.

#### Cache Behavior

Response carries `Cache-Control: private, max-age=15` to prevent redundant aggregation loads in the absence of Redis (`ARCHITECTURE.md` §2/§10).

#### Error Codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `range` value, or missing `from`/`to` when `range=custom` |

---

## Backend Implementation

### Module Structure — `backend/src/modules/dashboard/`

```
backend/src/modules/dashboard/
├── dashboard.validation.ts
├── dashboard.service.ts
├── dashboard.controller.ts
└── dashboard.routes.ts
```

### Validation — `dashboard.validation.ts`

```ts
import { z } from 'zod';

const rangeEnum = z.enum(['today', 'week', 'month', 'custom']);

export const dashboardMetricsQuerySchema = z.object({
  range: rangeEnum.default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
}).strict().refine(
  (data) => {
    if (data.range === 'custom') return !!data.from && !!data.to;
    return true;
  },
  { message: 'range=custom requires both from and to parameters' }
);

export const dashboardTopItemsQuerySchema = z.object({
  range: rangeEnum.default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
}).strict().refine(
  (data) => {
    if (data.range === 'custom') return !!data.from && !!data.to;
    return true;
  },
  { message: 'range=custom requires both from and to parameters' }
);

export type DashboardMetricsQueryDto = z.infer<typeof dashboardMetricsQuerySchema>;
export type DashboardTopItemsQueryDto = z.infer<typeof dashboardTopItemsQuerySchema>;
```

### Service — `dashboard.service.ts`

Uses the same `normalizeDateRange` helper as Reports. Since dashboard and reports share the same logic, extract `normalizeDateRange` into a shared lib (`backend/src/lib/date-range.ts`) so it can be reused across both modules without duplication.

#### `getMetrics(query: DashboardMetricsQueryDto)`

1. Normalize the date range from `range`/`from`/`to`
2. Run aggregation pipeline on `Order` collection:

```ts
const pipeline: PipelineStage[] = [
  { $match: { ...buildCancelledExcludedMatch(), createdAt: { $gte: from, $lte: to } } },
  {
    $group: {
      _id: null,
      totalEarned: { $sum: '$grandTotal' },
      totalProductsSold: { $sum: { $sum: '$items.quantity' } },
      totalOrdersCompleted: { $sum: 1 },
    },
  },
];
```

3. Execute with `Order.aggregate(pipeline)`
4. Return the metrics object (or zeroes if no results)

#### `getTopItems(query: DashboardTopItemsQueryDto)`

1. Normalize date range
2. Run aggregation pipeline:

```ts
const pipeline: PipelineStage[] = [
  { $match: { ...buildCancelledExcludedMatch(), createdAt: { $gte: from, $lte: to } } },
  { $unwind: '$items' },
  {
    $group: {
      _id: { productId: '$items.productId', name: '$items.nameSnapshot' },
      unitsSold: { $sum: '$items.quantity' },
      revenue: { $sum: '$items.lineTotal' },
    },
  },
  { $sort: { revenue: -1 } },
  { $limit: query.limit },
  {
    $project: {
      _id: 0,
      productId: '$_id.productId',
      name: '$_id.name',
      unitsSold: 1,
      revenue: { $round: ['$revenue', 2] },
    },
  },
];
```

3. Return `topItems` array

### Controller — `dashboard.controller.ts`

Two handlers following the pattern from `reports.controller.ts`:

```ts
export async function handleGetMetrics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as DashboardMetricsQueryDto;
    const result = await dashboardService.getMetrics(query);
    res.set('Cache-Control', 'private, max-age=15');
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTopItems(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as DashboardTopItemsQueryDto;
    const result = await dashboardService.getTopItems(query);
    res.set('Cache-Control', 'private, max-age=15');
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
```

### Routes — `dashboard.routes.ts`

```
GET /dashboard/metrics  -> authenticate, authorize('dashboard', 'view'), validate(dashboardMetricsQuerySchema, 'query'), handleGetMetrics
GET /dashboard/top-items -> authenticate, authorize('dashboard', 'view'), validate(dashboardTopItemsQuerySchema, 'query'), handleGetTopItems
```

```ts
const router = Router();

router.get(
  '/dashboard/metrics',
  authenticate,
  authorize('dashboard', 'view'),
  validate(dashboardMetricsQuerySchema, 'query'),
  handleGetMetrics
);

router.get(
  '/dashboard/top-items',
  authenticate,
  authorize('dashboard', 'view'),
  validate(dashboardTopItemsQuerySchema, 'query'),
  handleGetTopItems
);

export default router;
```

### Register in `backend/src/app.ts`

1. Add import alongside the other module imports (after line 25):
   ```ts
   import dashboardRoutes from './modules/dashboard/dashboard.routes';
   ```

2. Add mount after the last route (after line 171 `app.use('/api/v1', activityLogRoutes)`):
   ```ts
   app.use('/api/v1', dashboardRoutes);
   ```

### Extract shared `normalizeDateRange` to `backend/src/lib/date-range.ts`

Move the `normalizeDateRange` function from `reports.service.ts` into a shared lib so dashboard and reports both import it:

```ts
export interface DateRange {
  from: Date;
  to: Date;
}

export function normalizeDateRange(range: string, from?: string, to?: string): DateRange {
  const now = new Date();
  switch (range) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start, to: end };
    }
    case 'week': {
      const dayOfWeek = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start, to: end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { from: start, to: end };
    }
    case 'custom': {
      if (!from || !to) {
        throw createError(400, 'VALIDATION_ERROR', 'from and to are required for custom range');
      }
      const start = new Date(from);
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      return { from: start, to: end };
    }
    default:
      throw createError(400, 'VALIDATION_ERROR', `Invalid range: ${range}`);
  }
}
```

Update `reports.service.ts` to import from the shared lib instead of defining it inline.

### Socket Events

The backend already emits `dashboard:metricsInvalidate` from revenue-affecting routes (POS creates order, expense creates/updates/deletes). No changes needed on the emit side.

---

## Frontend Implementation

### Module Structure — `frontend/src/features/dashboard/`

```
frontend/src/features/dashboard/
├── api.ts
└── components/
    ├── DashboardMetrics.tsx
    ├── TopItemsList.tsx
    └── QuickAccess.tsx
```

### API — `api.ts`

```ts
export function useDashboardMetrics(filter: { range: string; from?: string; to?: string }) {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);

  return useQuery({
    queryKey: ['dashboard', 'metrics', params.toString()],
    queryFn: () => apiClient<DashboardMetricsResponse>(`/dashboard/metrics?${params.toString()}`),
  });
}

export function useDashboardTopItems(filter: { range: string; from?: string; to?: string }, limit = 10) {
  const params = new URLSearchParams({ range: filter.range, limit: String(limit) });
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);

  return useQuery({
    queryKey: ['dashboard', 'top-items', params.toString()],
    queryFn: () => apiClient<DashboardTopItemsResponse>(`/dashboard/top-items?${params.toString()}`),
  });
}
```

**Query key pattern:** `['dashboard', <sub-resource>, <params>]`. This allows `dashboard:metricsInvalidate` socket events to call `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` which invalidates both metrics and top-items simultaneously.

### Components

#### `DashboardMetrics.tsx`

Renders three `MetricCard` components in a responsive grid:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <MetricCard title="Total Earned" value={formatCurrency(metrics.totalEarned)} icon={DollarSign} color="green" />
  <MetricCard title="Products Sold" value={metrics.totalProductsSold} icon={ShoppingBag} color="blue" />
  <MetricCard title="Orders Completed" value={metrics.totalOrdersCompleted} icon={ShoppingCart} color="indigo" />
</div>
```

- Uses the existing `MetricCard` from `@/components/shared/MetricCard`
- `formatCurrency` is a small inline helper (or imported from a shared utils if one exists)
- Loading state: 3 skeleton cards (`animate-pulse` with rounded-2xl bg-slate-100 blocks matching card height)
- Error state: a single error banner "Failed to load metrics" with retry button

#### `TopItemsList.tsx`

A ranked list (not a DataTable) displaying the top-10 items:

```
┌────────────────────────────────────────────────────┐
│  #1  Chicken Fry          28 sold      ৳5,600     │
│  #2  Tea                  45 sold      ৳1,350     │
│  #3  Biriyani             12 sold      ৳2,400     │
└────────────────────────────────────────────────────┘
```

- Numbered list (1-based rank)
- Item name, units sold, revenue
- Loading state: 5 skeleton rows (`animate-pulse` block rows)
- Empty state: "No items sold in this period."
- Error state: "Failed to load top items." with retry button

#### `QuickAccess.tsx`

A grid of quick-access shortcut cards linking to other modules. Each card shows the module icon and label. Minimum set:

| Shortcut | Icon | Route |
|---|---|---|
| New POS Order | `ShoppingCart` | `/pos` |
| Orders | `ClipboardList` | `/orders` |
| Products | `Package` | `/products` |
| Customers | `Users` | `/customers` |

Layout: 2×2 grid on desktop, 2 columns on mobile (each card is a clickable rounded-xl card with icon + label).

### Page — Update `frontend/src/app/(dashboard)/overview/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import PermissionGate from '@/components/shared/PermissionGate';
import DateRangeFilter from '@/components/shared/DateRangeFilter';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { useDashboardMetrics, useDashboardTopItems } from '@/features/dashboard/api';
import DashboardMetrics from '@/features/dashboard/components/DashboardMetrics';
import TopItemsList from '@/features/dashboard/components/TopItemsList';
import QuickAccess from '@/features/dashboard/components/QuickAccess';

export default function OverviewPage() {
  const { filter, setRange, setCustomRange, queryString } = useDateRangeFilter('today');
  const metricsQuery = useDashboardMetrics(filter);
  const topItemsQuery = useDashboardTopItems(filter);

  return (
    <PermissionGate module="dashboard" action="view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xs:flex-row xs:items-center xs:justify-between">
          <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">Dashboard</h1>
          <DateRangeFilter
            value={filter.range}
            onChange={setRange}
            onCustomRange={setCustomRange}
          />
        </div>

        <DashboardMetrics
          data={metricsQuery.data}
          isLoading={metricsQuery.isLoading}
          isError={metricsQuery.isError}
          onRetry={metricsQuery.refetch}
        />

        <TopItemsList
          data={topItemsQuery.data}
          isLoading={topItemsQuery.isLoading}
          isError={topItemsQuery.isError}
          onRetry={topItemsQuery.refetch}
        />

        <QuickAccess />
      </div>
    </PermissionGate>
  );
}
```

#### Socket Listener

In the page or a hook, listen for `dashboard:metricsInvalidate` and invalidate the dashboard query cache:

```ts
useEffect(() => {
  const socket = getSocket(); // from @/lib/socket
  socket.on('dashboard:metricsInvalidate', () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });
  return () => { socket.off('dashboard:metricsInvalidate'); };
}, []);
```

---

## Already Done (No Changes Needed)

- ✅ `dashboard: ['view']` permission registered in both `backend/src/shared/constants.ts:10` and `frontend/src/lib/constants.ts:8`
- ✅ `getModuleLabel('dashboard')` returns `'Dashboard'` in `frontend/src/lib/constants.ts:30`
- ✅ Sidebar nav link at `/overview` with `module: 'dashboard'` and `LayoutDashboard` icon (`Sidebar.tsx:37`)
- ✅ `MetricCard` shared component (`frontend/src/components/shared/MetricCard.tsx`)
- ✅ `DateRangeFilter` shared component (`frontend/src/components/shared/DateRangeFilter.tsx`)
- ✅ `useDateRangeFilter` hook (`frontend/src/hooks/useDateRangeFilter.ts`)
- ✅ `buildCancelledExcludedMatch` aggregation helper (`backend/src/lib/aggregation.ts`)
- ✅ `LayoutDashboard` icon already imported in sidebar
- ✅ `PermissionGate` component, shared layout, and all dashboard infrastructure
- ✅ Socket event `dashboard:metricsInvalidate` already emitted from POS (order creation) and expenses (create/update/delete) — see `TEST_CASES.md` §22
- ✅ API.md §7 already defines the endpoints at a high level; this task fleshes them out with full schema and response shapes
- ✅ API.md §24 permission table already lists `dashboard: view`
- ✅ Overview placeholder page exists at `frontend/src/app/(dashboard)/overview/page.tsx`

---

## Open Items to Resolve During This Task

1. **`normalizeDateRange` extraction:** Move the function from `reports.service.ts` into `backend/src/lib/date-range.ts` so Dashboard and Reports reuse the same logic. Update the import in `reports.service.ts`.
2. **`formatCurrency` utility:** Create a small shared formatter (e.g. `frontend/src/lib/format.ts`) with `formatCurrency(amount: number): string` since both Dashboard and other modules will need it.
3. **Date range shapes:** The frontend `useDateRangeFilter` hook returns `{ range, from?, to? }` but the component's `filter` property type needs to be compatible with both the hook and the API query params. Ensure the type flows correctly.
4. **Metrics card locale/currency:** Dashboard displays currency amounts. Decide whether to hardcode `BDT` (the likely target market) or use a configurable symbol — for v1, hardcode `৳` with a comment noting this should read from Settings in a future task.

---

## Verification

- `tsc --noEmit` passes clean on both apps
- `GET /api/v1/dashboard/metrics?range=today` returns metrics with zeroes when no orders exist
- `GET /api/v1/dashboard/metrics?range=custom&from=2026-06-01&to=2026-06-07` returns scoped metrics
- `GET /api/v1/dashboard/metrics?range=custom` returns 400 (missing from/to)
- `GET /api/v1/dashboard/top-items?range=month&limit=5` returns top 5 items sorted by revenue desc
- `GET /api/v1/dashboard/top-items?range=invalid` returns 400
- `Cache-Control: private, max-age=15` header present on both endpoints
- Dashboard page loads at `/overview` with sidebar active state
- Date range filter switches between Today/Week/Month/Custom and feeds the correct range to API calls
- Metrics cards render with formatted currency
- Top items list renders ranked rows
- Quick-access shortcuts navigate to correct routes
- Loading skeleton shows while data fetches
- Empty state shows appropriate messaging when no data
- Error state shows retry button
- `dashboard:metricsInvalidate` socket event (from POS order creation) triggers React Query invalidation — metrics and top-items refetch automatically
