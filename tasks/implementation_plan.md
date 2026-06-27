# Implementation Plan — Activity Log (Task 19)

**PRD Feature 15** | `API.md` §21 | `DATABASE.md` §3.13 | `ARCHITECTURE.md` §4 (activityLogger), §9 (module map)

---

## Feature Overview

### Feature Name
Activity Log — Read-Only Audit Trail Viewer

### Business Goal
Provide administrators and managers with a reverse-chronological feed of every action taken in the dashboard, forming a tamper-resistant audit trail. The `activityLogger` middleware (shipped in Task 1) already writes entries to the `ActivityLog` collection for every mutating API call. This task builds the **read-only API endpoint and viewer UI** — never a create/edit/delete route.

### User Value
- **Security auditing**: See who created/deactivated a user, who cancelled an order, who updated settings
- **Operational visibility**: Track the sequence of events around a specific order or staff member
- **Compliance**: Immutable, server-generated descriptions ensure the audit trail cannot be tampered with, even by a user with elevated permissions

---

## Approved Scope

### Included in v1
- Backend: `GET /api/v1/activity-log` endpoint with filtering (`actor`, `module`, `action`, `search`, `from`, `to`) and pagination (`page`, `limit`)
- Backend: `modules/activity-log/` — validation, service, controller, routes (following the standard pattern from every other module)
- Backend: Wire import + mount in `app.ts`
- Frontend: `features/activity-log/` — api.ts, schema.ts, components (ActivityLogFilters, ActivityLogFeed)
- Frontend: `app/(dashboard)/activity-log/page.tsx` — permission-gated page composing filters + feed
- Frontend: Loading, empty, error states for the feed
- Frontend: Pagination (prev/next)
- Frontend: Relative timestamps ("2m ago", "3d ago")

### Explicitly Excluded from v1
- **Create/Edit/Delete routes** — never registered for this collection (architectural rule, `DATABASE.md` §3.13)
- **Dedicated options endpoint** (`GET /activity-log/options`) for populating actor/module filter dropdowns — v1 uses the static module list from constants + free-text inputs for actor and action
- **User search/select for the actor filter** — v1 uses a plain text input expecting an ObjectId; a user search widget is deferred
- **Infinite scroll** — v1 uses manual pagination (matching the pattern in UserList, ExpenseList, etc.)
- **Socket.io real-time updates** — new activity entries don't push to the feed live; users refresh or use the filter/page controls. The volume of writes across 15 modules makes broadcasting every log entry noisy
- **Structured metadata display** — `metadata` field is returned in the API response but not rendered in the v1 feed UI (stored for future structured-diff views)
- **Log retention/pruning** — no admin tool to delete/archive old entries; defer until a real need emerges

---

## Technical Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | **Feed/timeline view, not DataTable** | Activity logs are inherently temporal — items read better as a chronological list than a table with columns for each field. The `DataTable` component is designed for tabular CRUD lists (products, users, orders), not narrative feed entries. |
| D2 | **Bare `from`/`to` filters, not `range=today\|week\|month\|custom`** | Activity log is a time-travel debugging tool — users know the rough window of time they care about and pick specific dates. The `range` enum plus server-side date computation used by Reports/Dashboard is the wrong UX here. This differs from the shared `useDateRangeFilter` hook intentionally. |
| D3 | **Action prefix matching via `$regex`** | `action=user.` matches `user.created`, `user.updated`, `user.deactivated`, etc. This is documented in the API spec and gives users a flexible filter without needing to know exact action strings. A text index would be more performant at scale, but for v1's moderate data volumes (<100K entries), `$regex` with a prefix pattern is acceptable. |
| D4 | **Static module dropdown from `MODULE_ACTIONS` keys** | Rather than building a dedicated options endpoint to return unique module values from the DB, v1 uses the known 18-module list from `frontend/src/lib/constants.ts`. This list rarely changes and covers all possible values. |
| D5 | **Actor filter as plain text input** | Users paste or type a User ObjectId. A user search/select dropdown would require a Users endpoint call per keystroke — overengineered for an audit trail viewer. Accept this as a power-user UX (admin users know the IDs). |
| D6 | **Action filter as free-text prefix input** | Actions are too numerous and dynamic to enumerate in a dropdown. The prefix-match behavior (`action=user.` matches all user actions) is documented in the API spec and gives users the most flexibility. |
| D7 | **Relative timestamps via inline utility** | Use a small helper function (`formatDistanceToNow`) rather than adding `date-fns` as a dependency just for this one feature. Implement `Intl.RelativeTimeFormat` or a simple manual calculation. |
| D8 | **Target links via lookup map** | A simple `Record<string, string>` maps `targetType` values (e.g. `Order`, `User`) to frontend routes (`/orders/`, `/users/`). Unknown types render as plain text. This keeps the component simple and avoids dynamic route resolution logic. |

---

## Frontend Impact

### New Files

```
frontend/src/features/activity-log/
├── schema.ts
├── api.ts
└── components/
    ├── ActivityLogFilters.tsx
    ├── ActivityLogFeed.tsx
    └── ActivityLogAvatar.tsx

frontend/src/app/(dashboard)/activity-log/page.tsx
```

### `features/activity-log/schema.ts`

Zod schemas for filter params (matching backend validation shape) + TypeScript interfaces for response types:

```ts
export const activityLogFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actor: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ActivityLogFilters = z.infer<typeof activityLogFiltersSchema>;

export interface ActivityLogActor {
  id: string;
  name: string;
  role: string;
}

export interface ActivityLogEntry {
  id: string;
  actor: ActivityLogActor | null;
  module: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLogListResponse {
  data: ActivityLogEntry[];
  meta: ActivityLogMeta;
}
```

### `features/activity-log/api.ts`

React Query hook — `useActivityLogs(filters)`:

```ts
export function useActivityLogs(filters: ActivityLogFilters) {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.module) params.set('module', filters.module);
  if (filters.action) params.set('action', filters.action);
  if (filters.search) params.set('search', filters.search);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();

  return useQuery({
    queryKey: ['activity-log', qs],
    queryFn: () => apiClient<ActivityLogListResponse>(`/activity-log?${qs}`),
  });
}
```

No mutation hooks — this module is read-only.

### `components/ActivityLogFilters.tsx`

A responsive filter bar with five controls:

| Filter | UI | Notes |
|--------|----|-------|
| `search` | `<input type="text" placeholder="Search descriptions...">` | Debounced 300ms. Label: "Search". Use `text-sm` font, `rounded-xl` border per `theme.md` §13 Input spec. |
| `module` | `<select>` dropdown | Static options from the `MODULE_ACTIONS` keys in `@/lib/constants` (sorted alphabetically), plus "All modules" at the top. Use the standard Input styling from `theme.md` §13. |
| `action` | `<input type="text" placeholder="e.g. user., order.">` | Free-text prefix. Label: "Action prefix". `text-xs` helper text: "Prefix match — `user.` matches all user actions." |
| `from` / `to` | Two `<input type="date">` | Native date pickers. Label: "From" / "To". Use standard Input styling. |

**Layout:**
- Desktop (`md`+): Single row, filters distributed with wrap
- Mobile (`<md`): Stacked, full width per filter
- Uses `gap-3`, `rounded-xl`, `bg-white` — standard form styling per `theme.md` §13

**State:**
- Local `useState` for each filter value
- `useEffect` with 300ms debounce on `search` calling `onFiltersChange`
- All other filters call `onFiltersChange` immediately on change
- Changing any filter resets `page` to 1 in the parent

### `components/ActivityLogFeed.tsx`

A timeline/feed of activity entries. NOT a `<DataTable>` — the temporal nature of log data demands a chronological list.

**Entry card structure:**

```
┌─────────────────────────────────────────────────────┐
│ [Avatar Circle] [Actor Name]            [Relative TS]│
│                 [Module Badge] · [Action Badge]      │
│                 [Description text]                    │
│                 [Target link]                         │
└─────────────────────────────────────────────────────┘
```

- **Avatar**: `ActivityLogAvatar` component. If `actor` is populated: a `w-8 h-8 rounded-full` circle with `bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]` containing the first letter of the actor's name, `text-xs font-semibold`. If `actor` is null: `bg-slate-200` circle with `?` character.
- **Actor name**: `text-sm font-semibold text-[hsl(var(--foreground))]`. Falls back to `"System"` if actor is null (defensive — in practice actor should always exist since the middleware requires `req.user`).
- **Relative timestamp**: `text-xs text-[hsl(var(--muted-foreground))]`. Implemented via a small utility function `formatRelativeTime(isoString)` using `Intl.RelativeTimeFormat`:
  - `< 1 min ago`: "Just now"
  - `< 60 min`: "Xm ago"
  - `< 24 hours`: "Xh ago"
  - `< 7 days`: "Xd ago"
  - `< 30 days`: "Xw ago"
  - Older: formatted date "Jun 27" or "Jun 27, 2025" (if not current year)
  - Full ISO date in `title` attribute for hover
- **Module badge**: `<Badge variant="slate">` with `text-xs`. Content: the module string (e.g. "orders", "users"). Leave variant as slate for all modules — color-coding per module would add complexity with no clear semantic benefit.
- **Action badge**: `<Badge variant="slate">` with `text-xs`, slightly different visual: `bg-slate-50 border border-slate-200 text-slate-600` (like an outlined badge). Content: the action string.
- **Description**: `text-sm font-medium text-[hsl(var(--foreground))]`. The main human-readable text.
- **Target link**: If `targetType` and `targetId` are both present, show a clickable link:
  - Look up `targetType` in a mapping: `{ Order: '/orders/', User: '/users/', Task: '/tasks/' }`
  - For known types: render a `<Link href={route + targetId}>` with text like `"View Order #{targetId}"` (show short ID for `targetType = 'Order'`, full ID otherwise)
  - For unknown types: render `"[TargetType]: [targetId]"` as plain text
  - Link styling: `text-xs text-[hsl(var(--primary))] hover:underline`

**States:**

| State | UI |
|-------|-----|
| Loading | 5 skeleton cards: each with `animate-pulse bg-slate-200 rounded-xl h-20` blocks |
| Empty | Centered icon (`History` from lucide-react, `h-12 w-12 text-slate-300`) + "No activity recorded for this filter." in `text-sm text-slate-500` + "Try adjusting your filter criteria." helper text |
| Error | "Failed to load activity log." with `<Button variant="secondary">Retry</Button>` |
| Data | The feed as described above |

**Pagination (bottom of feed):**

Same pattern as UserList: prev/next buttons, "Page X of Y", "Showing A–B of Z total". Use `text-sm text-slate-500`, `gap-2`, `flex items-center justify-between`. Buttons use `<Button variant="outline" size="sm">` with `ChevronLeft`/`ChevronRight` icons.

### `components/ActivityLogAvatar.tsx`

Small helper component, extracted so it can be reused if needed:

```tsx
function ActivityLogAvatar({ name }: { name: string | null }) {
  if (!name) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-400">
        ?
      </div>
    );
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-semibold text-[hsl(var(--primary-foreground))]">
      {initial}
    </div>
  );
}
```

### `app/(dashboard)/activity-log/page.tsx`

```tsx
export default function ActivityLogPage() {
  const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1, limit: 20 });
  const { data, isLoading, isError, refetch } = useActivityLogs(filters);

  function handleFilterChange(partial: Partial<ActivityLogFilters>) {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <PermissionGate module="activity-log" action="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">Activity Log</h1>
        </div>
        <ActivityLogFilters onFiltersChange={handleFilterChange} />
        <ActivityLogFeed
          data={data?.data ?? []}
          meta={data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 }}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          onPageChange={handlePageChange}
        />
      </div>
    </PermissionGate>
  );
}
```

**Page heading styling**: `text-xl font-bold text-slate-800 xs:text-2xl` per `theme.md` §3 + §14 main content area.

---

## Backend Impact

### New Files

```
backend/src/modules/activity-log/
├── activity-log.validation.ts
├── activity-log.service.ts
├── activity-log.controller.ts
└── activity-log.routes.ts
```

### `activity-log.validation.ts`

```ts
import { z } from 'zod';

export const listActivityLogSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actor: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
}).strict();

export type ListActivityLogDto = z.infer<typeof listActivityLogSchema>;
```

Key design choice: **No `range` enum, no `range=custom` refinement**. Activity log uses bare `from`/`to` date strings (independent date pickers in the UI). Both `from` and `to` are independently optional — if only `from` is provided, the filter is `{ createdAt: { $gte: from } }`, same for `to` alone.

### `activity-log.service.ts`

**`listActivityLogs(query: ListActivityLogDto)`**

1. Build MongoDB filter:
   - `actor`: exact match if `query.actor` provided
   - `module`: exact match if `query.module` provided
   - `action`: prefix regex if `query.action` provided — `{ $regex: \`^${escapeRegex(query.action)}\` }`. The `escapeRegex` helper escapes special regex characters in user input.
   - `search`: case-insensitive regex on `description` if `query.search` provided — `{ $regex: query.search, $options: 'i' }`
   - `createdAt`: date range if `query.from` or `query.to` provided:
     - If `from`: `createdAt.$gte = new Date(query.from)`
     - If `to`: `createdAt.$lte = new Date(query.to + 'T23:59:59.999Z')` (end of day, inclusive)

2. Query the database:
   ```ts
   const skip = (query.page - 1) * query.limit;
   const [logs, total] = await Promise.all([
     ActivityLog.find(filter)
       .populate('actor', 'name role')
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(query.limit)
       .lean(),
     ActivityLog.countDocuments(filter),
   ]);
   ```

3. Map to response shape:
   ```ts
   const data = logs.map((log) => ({
     id: log._id,
     actor: log.actor
       ? { id: (log.actor as any)._id, name: (log.actor as any).name, role: (log.actor as any).role }
       : null,
     module: log.module,
     action: log.action,
     targetId: log.targetId ?? null,
     targetType: log.targetType ?? null,
     description: log.description,
     metadata: log.metadata ?? null,
     createdAt: log.createdAt,
   }));
   ```

4. Return standard list envelope:
   ```ts
   return {
     data,
     meta: {
       total,
       page: query.page,
       limit: query.limit,
       totalPages: Math.ceil(total / query.limit),
     },
   };
   ```

Helper function for regex escaping:
```ts
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### `activity-log.controller.ts`

Standard single-handler pattern:

```ts
import { Request, Response, NextFunction } from 'express';
import { activityLogService } from './activity-log.service';

export async function handleListActivityLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListActivityLogDto;
    const result = await activityLogService.listActivityLogs(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
```

### `activity-log.routes.ts`

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { listActivityLogSchema } from './activity-log.validation';
import { handleListActivityLogs } from './activity-log.controller';

const router = Router();

router.get(
  '/activity-log',
  authenticate,
  authorize('activity-log', 'view'),
  validate(listActivityLogSchema, 'query'),
  handleListActivityLogs
);

export default router;
```

**No rate limiter needed** — this is a read-only GET endpoint with no auth-bypass. All other modules with rate limiters (settings, uploads, orders, etc.) apply them to mutating routes on resource-heavy modules. Activity-log reads are lightweight indexed queries.

### Wiring in `app.ts`

1. Add import alongside the other module imports (after line 24):
   ```ts
   import activityLogRoutes from './modules/activity-log/activity-log.routes';
   ```

2. Add mount after the last route (after line 169 `app.use('/api/v1', reportsRoutes)`):
   ```ts
   app.use('/api/v1', activityLogRoutes);
   ```

### No changes to:
- `ActivityLog` model — already exists at `backend/src/models/ActivityLog.ts` with correct indexes
- `activityLogger` middleware — already globally attached to all mutating routes since Task 1
- `backend/src/shared/constants.ts` — `'activity-log': ['view']` already registered

---

## Database Impact

**No schema changes.** The `ActivityLog` collection already exists at `DATABASE.md` §3.13 with correct indexes:

- `{ actor: 1, createdAt: -1 }`
- `{ module: 1, createdAt: -1 }`
- `{ createdAt: -1 }`

All three indexes support the filtering patterns used in this implementation (filter by actor + sort desc, filter by module + sort desc, plain sort desc). No new indexes needed.

---

## API Impact

### New Endpoint

`GET /api/v1/activity-log`

Already documented in `API.md` §21. This implementation fleshes out the query parameters with `page`, `limit`, and `search` that the doc omits. The `API.md` §21 spec should be updated to include these parameters (see Doc Updates Required below).

### Response shape

Standard list envelope per `API.md` §2:
```json
{
  "data": [
    {
      "id": "667abc...",
      "actor": { "id": "667def...", "name": "Alice", "role": "admin" },
      "module": "users",
      "action": "user.created",
      "targetId": "667ghi...",
      "targetType": "User",
      "description": "Created admin account \"bob@example.com\"",
      "metadata": null,
      "createdAt": "2026-06-27T10:30:00.000Z"
    }
  ],
  "meta": { "total": 142, "page": 1, "limit": 20, "totalPages": 8 }
}
```

### Error codes

No new error codes needed. Existing `400 VALIDATION_ERROR` covers invalid query params.

---

## Authentication & Authorization

| Aspect | Implementation |
|--------|---------------|
| Auth required | Yes — `authenticate` middleware (Bearer JWT) |
| Permission | `authorize('activity-log', 'view')` |
| Admin bypass | Yes — `authorize` lets admin through without checking the permissions array |
| Rate limiting | None — read-only GET, no auth bypass |
| Frontend gate | `<PermissionGate module="activity-log" action="view">` on the page |

The `activity-log` module key with `['view']` action is already registered in both:
- `backend/src/shared/constants.ts:24`
- `frontend/src/lib/constants.ts:22`

---

## Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Input validation | Zod schema validates all query params — `page`/`limit` coerced to positive ints, `actor`/`module`/`action`/`search`/`from`/`to` are optional strings |
| Regex injection | `escapeRegex()` helper sanitizes user input before using it in `$regex` — prevents ReDoS and regex injection attacks |
| No mutation | No POST/PUT/PATCH/DELETE route is ever registered for this module — architectural rule enforced by omission |
| Server-generated descriptions | The `activityLogger` middleware generates descriptions server-side. No user-supplied text reaches the `description` field. This implementation only reads it. |
| Populated actor data | `actor` is populated via Mongoose `.populate('actor', 'name role')`. If the referenced user is deleted/soft-deleted, `actor` becomes `null` — the response maps this to `actor: null` rather than crashing. |

---

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| **Empty results** | Returns `{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }`. Not a 404. |
| **Deleted/soft-deleted actor user** | `.populate('actor', 'name role')` returns `null` for the actor field if the user was deleted. The response maps this to `actor: null`. The frontend shows "System" or "?" for the avatar. |
| **`action` filter with special regex chars** | `escapeRegex()` sanitizes before building `$regex`. If user enters `user.+`, it becomes `user\.\+` — literal match only. |
| **`from` without `to` (and vice versa)** | MongoDB query uses whichever is present. `{ createdAt: { $gte: from } }` alone is valid. |
| **`to` date inclusivity** | Service layer adds `T23:59:59.999Z` to the `to` date so the filter covers the full day. |
| **`search` with very long string** | Zod schema doesn't limit `search` length. MongoDB `$regex` with `$options: 'i'` on an unindexed field (`description`) will be slow on very large datasets. Acceptable for v1 — flagged as a future optimization to add a text index if needed. |
| **`limit` above 100** | Zod caps at 100 via `.max(100)`. Request returns `400 VALIDATION_ERROR`. |
| **`page` below 1** | Zod `.positive()` returns `400 VALIDATION_ERROR`. |
| **Unknown module filter** | The `module` filter is a free string. If the user enters a non-existent module, the query returns empty results gracefully (no error). |
| **Concurrent writes while reading** | ActivityLog is append-only — no lock contention. Reads see a point-in-time snapshot; recent entries may not appear until the next page load/refetch. |
| **Upstream open items affected** | None — this feature does not resolve or touch any remaining open item in `API.md` §25, `DATABASE.md` §8, or `AI_rules.md` §13. |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Large dataset performance** | Medium | `description` regex search without a text index could be slow on 50K+ entries. Mitigation: v1 accepts this as a known limitation. If it becomes a real issue, add a MongoDB text index on `description` and switch from `$regex` to `$text` — no API contract change needed. |
| **`populate` performance** | Low | `.populate('actor', 'name role')` adds one lookup per page of results. Since `limit` caps at 100 and actor data is small (just name + role), this is negligible. |
| **Over-fetching metadata** | Low | The `metadata` field (stored as `Schema.Types.Mixed`) is returned in the API response even though v1 doesn't render it. Bandwidth impact is minimal (most entries have `null` metadata). |
| **Frontend date handling** | Low | The backend returns ISO strings for `createdAt`. The frontend uses `Intl.RelativeTimeFormat` for display. Both are standard — no timezone ambiguity since the app operates in a single timezone. |

---

## Doc Updates Required

### `API.md` §21 — Activity Log

The current spec is minimal. Update it to include `page`, `limit`, `search` query parameters and the full response shape.

**Current text (lines 468-474):**
```markdown
## 21. Activity Log

Base path: `/activity-log`. **Permission module key:** `activity-log`. **`view` is the only action that exists** — no `PUT`/`DELETE`/`POST` handler is ever registered for this collection (`DATABASE.md` §3.13's "read-only by omission" rule), so there's nothing to list beyond:

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/activity-log?actor=&module=&action=&from=&to=` | `view` | Reverse-chronological feed |
```

**New text:**
```markdown
## 21. Activity Log

Base path: `/activity-log`. **Permission module key:** `activity-log`. **`view` is the only action that exists** — no `PUT`/`DELETE`/`POST` handler is ever registered for this collection (`DATABASE.md` §3.13's "read-only by omission" rule).

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/activity-log?actor=&module=&action=&search=&from=&to=&page=&limit=` | `view` | Reverse-chronological feed with pagination and filters |

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 20 | Items per page (max 100) |
| `actor` | string (ObjectId) | — | Filter by actor User ID (exact match) |
| `module` | string | — | Filter by module name, e.g. `orders`, `users` (exact match) |
| `action` | string | — | Filter by action with prefix match — `user.` matches `user.created`, `user.updated`, etc. |
| `search` | string | — | Case-insensitive match against `description` |
| `from` | string (ISO date) | — | Start date (inclusive) for `createdAt` range |
| `to` | string (ISO date) | — | End date (inclusive) for `createdAt` range; combined with `from` for a range |

Note: Date filtering uses bare `from`/`to` strings (not the `range=today|week|month|custom` enum used by Dashboard/Reports). Activity log entries are queried by absolute date window.

#### Response

```json
// 200 OK
{
  "data": [
    {
      "id": "667abc...",
      "actor": { "id": "667def...", "name": "Alice", "role": "admin" },
      "module": "users",
      "action": "user.created",
      "targetId": "667ghi...",
      "targetType": "User",
      "description": "Created admin account \"bob@example.com\"",
      "metadata": null,
      "createdAt": "2026-06-27T10:30:00.000Z"
    }
  ],
  "meta": { "total": 142, "page": 1, "limit": 20, "totalPages": 8 }
}
```

The `actor` field is populated from the `User` collection (`.populate('actor', 'name role')`). If the referenced user is later deleted, `actor` may be `null`.
```

---

## Implementation Order

The implementation must follow this exact sequence — each step depends on the previous one, and each produces a testable artifact before the next begins.

| Step | What | Depends on | Verifiable by |
|------|------|------------|---------------|
| 1 | Update `API.md` §21 with the full spec | Nothing | Doc review |
| 2 | Backend: validation | Nothing | `tsc --noEmit` |
| 3 | Backend: service | Step 2 | Unit test or manual curl |
| 4 | Backend: controller | Step 3 | `tsc --noEmit` |
| 5 | Backend: routes | Step 4 | `tsc --noEmit` |
| 6 | Wire in `app.ts` | Step 5 | Server starts + `GET /api/v1/activity-log` returns paginated data |
| 7 | Frontend: schema + api.ts | Nothing | `tsc --noEmit` |
| 8 | Frontend: ActivityLogAvatar | Nothing | TypeScript check |
| 9 | Frontend: ActivityLogFilters | Step 7 | TypeScript check |
| 10 | Frontend: ActivityLogFeed | Step 7 | TypeScript check |
| 11 | Frontend: page.tsx | Steps 8–10 | Page renders at `/activity-log` |
| 12 | Verification pass | Steps 1–11 | All acceptance criteria met |

---

## Task Breakdown

### Task 1: Update `API.md` §21

**Description:** Apply the exact edit specified in "Doc Updates Required" above to expand the Activity Log API section with full query parameter documentation and response shape.

**Acceptance Criteria:**
- [ ] `API.md` §21 includes `page`, `limit`, `search` in the query parameter table
- [ ] `API.md` §21 includes the full JSON response example with populated actor
- [ ] Note about bare `from`/`to` (not `range=`) is documented

### Task 2: Backend Validation Schema

**File:** `backend/src/modules/activity-log/activity-log.validation.ts`

**Description:** Create the Zod validation schema for the list endpoint. Standard list schema with optional string filters, coerced numeric page/limit defaults.

**Acceptance Criteria:**
- [ ] `page` coerced to positive int, default 1
- [ ] `limit` coerced to positive int, default 20, max 100
- [ ] `actor`, `module`, `action`, `search`, `from`, `to` all optional strings
- [ ] `.strict()` — no unknown query params allowed
- [ ] Export `ListActivityLogDto` type
- [ ] `tsc --noEmit` passes

### Task 3: Backend Service

**File:** `backend/src/modules/activity-log/activity-log.service.ts`

**Description:** Implement the business logic for listing activity logs with dynamic filter building, populated actor, and pagination.

**Acceptance Criteria:**
- [ ] Dynamic MongoDB filter built from query params (actor exact match, module exact match, action prefix regex, search regex on description, createdAt date range)
- [ ] `escapeRegex` helper function sanitizes user input for regex
- [ ] `.populate('actor', 'name role')` on the query
- [ ] `sort({ createdAt: -1 })` — reverse chronological
- [ ] Standard pagination via `skip`/`limit`
- [ ] Standard list envelope: `{ data, meta: { total, page, limit, totalPages } }`
- [ ] Response mapping: `_id` → `id`, populated actor → `{ id, name, role }`, null-safe for deleted actors
- [ ] `to` date extended to end of day (`T23:59:59.999Z`)
- [ ] `tsc --noEmit` passes

### Task 4: Backend Controller

**File:** `backend/src/modules/activity-log/activity-log.controller.ts`

**Description:** Single request handler that reads typed query params and calls the service.

**Acceptance Criteria:**
- [ ] `handleListActivityLogs` reads `req.query` as `ListActivityLogDto`
- [ ] Calls `activityLogService.listActivityLogs(query)`
- [ ] Returns `200` with service result
- [ ] Errors forwarded via `next(error)`
- [ ] `tsc --noEmit` passes

### Task 5: Backend Routes

**File:** `backend/src/modules/activity-log/activity-log.routes.ts`

**Description:** Wire the single GET route with auth, permission, and validation middleware.

**Acceptance Criteria:**
- [ ] `GET /activity-log` route registered
- [ ] Middleware chain: `authenticate → authorize('activity-log', 'view') → validate(listActivityLogSchema, 'query') → handleListActivityLogs`
- [ ] No other routes (POST/PUT/PATCH/DELETE) registered
- [ ] Default export
- [ ] `tsc --noEmit` passes

### Task 6: Wire in `app.ts`

**File:** `backend/src/app.ts`

**Description:** Import and mount the activity-log routes.

**Acceptance Criteria:**
- [ ] Import added alongside other module imports
- [ ] `app.use('/api/v1', activityLogRoutes)` added after reportsRoutes
- [ ] No rate limiter needed (read-only GET)
- [ ] Server starts without error
- [ ] `GET /api/v1/activity-log` returns `200` with `{ data: [], meta: {...} }`
- [ ] `GET /api/v1/activity-log` without auth returns `401`
- [ ] `GET /api/v1/activity-log` without `activity-log:view` permission returns `403`
- [ ] `GET /api/v1/activity-log?module=orders` returns filtered results
- [ ] `GET /api/v1/activity-log?action=user.` returns prefix-matched results
- [ ] `GET /api/v1/activity-log?from=2026-06-01&to=2026-06-07` returns date-filtered results
- [ ] `GET /api/v1/activity-log?page=1&limit=5` returns paginated results with correct meta

### Task 7: Frontend Schema + API

**Files:**
- `frontend/src/features/activity-log/schema.ts`
- `frontend/src/features/activity-log/api.ts`

**Description:** Define TypeScript types for the response shapes and implement the React Query hook.

**Acceptance Criteria:**
- [ ] `ActivityLogFilters` type matches backend query param schema
- [ ] `ActivityLogEntry`, `ActivityLogActor`, `ActivityLogMeta`, `ActivityLogListResponse` interfaces match backend response shape
- [ ] `useActivityLogs(filters)` hook builds query string from filters
- [ ] Hook uses `apiClient` with correct path `/activity-log?${qs}`
- [ ] Query key includes the query string for cache differentiation
- [ ] `tsc --noEmit` passes

### Task 8: Frontend ActivityLogAvatar

**File:** `frontend/src/features/activity-log/components/ActivityLogAvatar.tsx`

**Description:** Small inline avatar component showing the first letter of the actor's name.

**Acceptance Criteria:**
- [ ] Renders first letter in a `w-8 h-8 rounded-full` circle
- [ ] Uses `--primary` / `--primary-foreground` tokens for background/text
- [ ] Falls back to `?` in `bg-slate-200` when name is null
- [ ] `tsc --noEmit` passes

### Task 9: Frontend ActivityLogFilters

**File:** `frontend/src/features/activity-log/components/ActivityLogFilters.tsx`

**Description:** Filter bar with search, module dropdown, action prefix input, and date pickers.

**Acceptance Criteria:**
- [ ] Search input with 300ms debounce
- [ ] Module dropdown populated from `MODULE_ACTIONS` keys (sorted, plus "All modules")
- [ ] Action prefix text input with helper text
- [ ] Two date inputs (from/to)
- [ ] All filters styled per `theme.md` §13 Input spec (`rounded-xl`, `border-slate-300`, `text-sm`)
- [ ] Changing any filter (except search) calls `onFiltersChange` immediately
- [ ] Search calls `onFiltersChange` after 300ms debounce
- [ ] Responsive layout: horizontal row on desktop, stacked on mobile
- [ ] `tsc --noEmit` passes

### Task 10: Frontend ActivityLogFeed

**File:** `frontend/src/features/activity-log/components/ActivityLogFeed.tsx`

**Description:** Timeline/feed view of activity entries with relative timestamps, badges, avatars, target links, loading/empty/error states, and pagination.

**Acceptance Criteria:**
- [ ] Feed renders each entry as a card with avatar, actor name, relative timestamp, module badge, action badge, description, and target link
- [ ] Module badge uses `<Badge variant="slate">`
- [ ] Action badge uses outlined style (`bg-slate-50 border border-slate-200 text-slate-600`)
- [ ] Relative timestamps via `Intl.RelativeTimeFormat` with correct format per age
- [ ] Target links resolve via lookup map (`Order` → `/orders/`, `User` → `/users/`, etc.)
- [ ] Unknown target types render as plain text
- [ ] Loading state: 5 skeleton cards with `animate-pulse`
- [ ] Empty state: `History` icon + "No activity recorded for this filter." message
- [ ] Error state: error message + "Retry" button
- [ ] Pagination: prev/next buttons, "Page X of Y", "Showing A–B of Z total"
- [ ] Pagination buttons use `<Button variant="outline" size="sm">`
- [ ] `tsc --noEmit` passes

### Task 11: Frontend Page

**File:** `frontend/src/app/(dashboard)/activity-log/page.tsx`

**Description:** Permission-gated page composing the filters and feed components.

**Acceptance Criteria:**
- [ ] Wraps content in `<PermissionGate module="activity-log" action="view">`
- [ ] Page title: "Activity Log" (styled per heading convention)
- [ ] Filters state managed via `useState<ActivityLogFilters>`
- [ ] Filter changes reset page to 1
- [ ] `useActivityLogs(filters)` fetches data
- [ ] Loading/empty/error states delegated to `ActivityLogFeed`
- [ ] `tsc --noEmit` passes

### Task 12: Verification Pass

**Description:** End-to-end verification of all acceptance criteria across backend and frontend.

**Acceptance Criteria:**
- [ ] `tsc --noEmit` passes on both frontend and backend (0 errors)
- [ ] `GET /api/v1/activity-log` returns `200` with `{ data: [], meta: {...} }`
- [ ] Pagination, filtering (by actor, module, action prefix, search, date range) all work correctly
- [ ] Empty results return `{ data: [], meta: { total: 0, ... } }` (not 404)
- [ ] Page loads at `/activity-log` with sidebar active state
- [ ] Page shows `<PermissionGate>` fallback for users without `activity-log:view`
- [ ] Filter controls work (module dropdown, action input, date pickers, search)
- [ ] Feed displays correct entry data with avatars, badges, timestamps
- [ ] Target links navigate to correct detail pages
- [ ] Pagination navigation works
- [ ] Loading skeleton appears during fetch
- [ ] Empty state appears when no results match filters
- [ ] Error state shows retry button

---

## Edge Cases (All)

| # | Edge Case | Handling |
|---|-----------|----------|
| 1 | Empty results | `{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }` — not 404 |
| 2 | Deleted actor user | Actor populated as `null`, frontend shows "System" fallback |
| 3 | Special regex chars in action/search | `escapeRegex()` sanitizes before `$regex` use |
| 4 | Date filter with only `from` or only `to` | Both independently valid — `{ $gte }` or `{ $lte }` alone |
| 5 | `to` date inclusivity | Extended to end of day (`T23:59:59.999Z`) |
| 6 | Page below 1 | Zod `.positive()` → `400 VALIDATION_ERROR` |
| 7 | Limit above 100 | Zod `.max(100)` → `400 VALIDATION_ERROR` |
| 8 | Unknown module in filter | No error — returns empty results |
| 9 | Very long search string | No length limit in schema — performance risk noted but accepted for v1 |
| 10 | Module/action with dot notation | Action filter uses prefix regex — `user.` matches all user-* actions |
| 11 | TargetId present but targetType null | Target link rendered as plain text with the ID |
| 12 | Actor populated but name/role missing | Frontend avatar shows initial based on available name; role badge is optional |
| 13 | Metadata field large | Returned but not rendered in v1 — no validation of metadata shape at this layer |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Regex injection (ReDoS)** | `escapeRegex()` sanitizes all user input before `$regex` construction |
| **Access control** | `authorize('activity-log', 'view')` on the route; `<PermissionGate>` on the page |
| **No write access** | No POST/PUT/PATCH/DELETE route ever registered — architectural rule enforced by omission |
| **Server-side description generation** | The `activityLogger` middleware generates descriptions; this module only reads them. No user-supplied description injection. |
| **Actor data exposure** | Only `name` and `role` are populated — no email, no permissions, no `passwordHash`. Explicit `.select` ensures no extra fields leak. |
| **Query param injection** | Zod validation rejects unknown params via `.strict()`. All string params are optional and bounded. |
| **Pagination DoS** | `limit` capped at 100. Without authentication the endpoint returns `401` before reaching business logic. |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Description `$regex` performance on large datasets | Medium | Accept for v1. Add text index if it becomes a real bottleneck. No API contract change needed for the optimization. |
| Populate performance at high page limits | Low | `limit` capped at 100. Each populated doc is a single additional query. Negligible at v1 scale. |
| Frontend timezone mismatch | Low | Backend stores `createdAt` as UTC ISO strings. `Intl.RelativeTimeFormat` uses the browser's locale. Consistent within single timezone operations. |
| Actor population failure on deleted users | Low | Handled gracefully — `actor: null` response, frontend shows fallback avatar |

---

## Final Approved Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | Feed/timeline view, not DataTable | Temporal data reads better as a chronological list |
| D2 | Bare `from`/`to` filters, not `range=today\|week\|month\|custom` | Activity log users know the time window they need — different UX from Reports |
| D3 | Action prefix matching via `$regex` | Flexible filter without needing to know exact action strings |
| D4 | Static module dropdown from constants | Avoids building a dedicated options endpoint; the module list rarely changes |
| D5 | Actor filter as plain text input | Simpler than a user search widget; admin users can paste IDs |
| D6 | Action filter as free-text prefix input | Actions are too numerous for a dropdown; prefix matching gives most flexibility |
| D7 | Relative timestamps via inline utility | Avoids adding `date-fns` dependency for one feature |
| D8 | Target links via lookup map | Simple, predictable mapping without dynamic route resolution |
| D9 | No rate limiter on GET endpoint | Read-only, authenticated, lightweight indexed query |
| D10 | No Socket.io events for new activity | Volume of writes makes broadcasting noisy; users refresh the feed |
| D11 | `metadata` returned but not rendered | Preserved for future structured-diff rendering; low bandwidth cost |
| D12 | `API.md` §21 spec must be updated | Current spec omits `page`, `limit`, `search`, and full response shape |
