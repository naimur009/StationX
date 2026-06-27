# Current Task — Activity Log

**PRD Feature 19** | `API.md` §21 | `ARCHITECTURE.md` §2 (activityLogger middleware), §4 (middleware pipeline)
**Depends on:** ActivityLog model (already exists at `backend/src/models/ActivityLog.ts`), `activityLogger` middleware (already exists and globally attached — already writing logs for all mutating routes), auth/permission infrastructure.
**Permission module key:** `activity-log` — actions `['view']`. Read-only by design — no create/edit/delete route ever registered.
**Sidebar link:** Already exists at `/activity-log` with `module: 'activity-log'` and `History` icon (confirmed in `frontend/src/components/shared/Sidebar.tsx:51`).

---

## Concept

The Activity Log module provides a read-only, reverse-chronological feed of system actions. Every mutating API call (POST/PUT/PATCH/DELETE) is already captured by the global `activityLogger` middleware (`backend/src/middleware/activityLogger.ts`) which writes to the `ActivityLog` collection. This task builds the **read-only API endpoint and UI** to view those logs.

No new writes to the collection — the `activityLogger` middleware handles all writes. The API route only allows `GET`.

### What gets logged

Every non-GET request that:
1. Returns a 2xx status code
2. Has an authenticated user (`req.user`)
3. Is not opted out via `req.skipActivityLog`

generates an `ActivityLog` entry with:
- `actor` — the authenticated user's ObjectId
- `module` — extracted from the URL path's first segment (e.g. `/api/v1/orders` → `'orders'`)
- `action` — either a state-transition action (via regex rules in `activityLogger.ts`) or `<module>.<method_action>` (e.g. `orders.created`, `products.updated`, `user.deactivated`)
- `targetId` / `targetType` — the affected document
- `description` — human-readable, generated server-side
- `metadata` — optional structured context (e.g. `{ before, after }` for status changes)

---

## Data Model

Already exists at `backend/src/models/ActivityLog.ts`. No changes needed.

| Field | Type | Notes |
|---|---|---|
| `actor` | ObjectId → User | Required, indexed |
| `module` | String | Required, indexed. Matches the 18 PRD modules. |
| `action` | String | Required. Dot-notation taxonomy, e.g. `order.completed`, `user.created` |
| `targetId` | Mixed (ObjectId \| string) | Optional. ID of the affected document. |
| `targetType` | String | Optional. Collection name, e.g. `'Order'`, `'User'`. |
| `description` | String | Required. Human-readable, always generated server-side. |
| `metadata` | Mixed | Optional. Structured diff/context. |
| `createdAt` | Date | Auto-generated. Immutable — no `updatedAt`. |

**Indexes:** `{ actor: 1, createdAt: -1 }`, `{ module: 1, createdAt: -1 }`, `{ createdAt: -1 }`

---

## API Changes

### Update `API.md` §21 — Activity Log

Base path: `/activity-log`. **Permission module key:** `activity-log` — actions `['view']` only.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/activity-log?actor=&module=&action=&from=&to=&page=&limit=` | `view` | Reverse-chronological feed with pagination & filters |

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 20 | Items per page (max 100) |
| `actor` | string (ObjectId) | — | Filter by actor User ID |
| `module` | string | — | Filter by module name (e.g. `orders`, `users`) |
| `action` | string | — | Filter by action (e.g. `user.created`, `order.status_changed`). Supports prefix match — `user.` matches all user actions. |
| `search` | string | — | Full-text match against `description` (case-insensitive) |
| `from` | string (ISO date) | — | Start date (inclusive) for `createdAt` range |
| `to` | string (ISO date) | — | End date (inclusive) for `createdAt` range |

Note: Date filtering uses `from`/`to` directly (not `range=week|month|custom`). Activity log is time-travel debugging — users almost always know the rough time window they care about. A simple date-picker pair suffices; the `DateRangeFilter` component is NOT reused here.

#### Response

```json
// 200 OK
{
  "data": [
    {
      "id": "667abc...",
      "actor": {
        "id": "667def...",
        "name": "Alice",
        "role": "admin"
      },
      "module": "users",
      "action": "user.created",
      "targetId": "667ghi...",
      "targetType": "User",
      "description": "Created admin account \"bob@example.com\"",
      "metadata": null,
      "createdAt": "2026-06-27T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

The `actor` field is populated via a `.populate('actor', 'name role')` query — always included. Per `ARCHITECTURE.md` §4.5, the server populates foreign-key references for list endpoints.

#### Error Codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid query params |

No `404` — an empty result returns `{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }`.

---

## Backend Implementation

### Module Structure — `backend/src/modules/activity-log/`

```
backend/src/modules/activity-log/
├── activity-log.validation.ts
├── activity-log.service.ts
├── activity-log.controller.ts
└── activity-log.routes.ts
```

### Validation — `activity-log.validation.ts`

Standard list-query schema following the pattern from `users.validation.ts`:

```ts
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
```

**No `range` enum, no `range=custom` refinement** — activity log uses bare `from`/`to` strings (independent date pickers). This is different from Reports/Dashboard.

Parse `from`/`to` as ISO date strings. The service will convert them to `Date` objects for the MongoDB query. If `from` is provided without `to` (or vice versa), the filter still works — `{ $gte: from }` or `{ $lte: to }` alone is valid.

### Service — `activity-log.service.ts`

**`listActivityLogs(query: ListActivityLogDto)`**

1. Build a MongoDB filter object dynamically:
   - `actor`: exact match (if provided)
   - `module`: exact match (if provided)
   - `action`: if provided, allow prefix match using regex `/^<action>/` — so `action=user.` matches `user.created`, `user.updated`, `user.deactivated`, etc.
   - `description`: case-insensitive regex match for `search` (if provided, `$regex` with `$options: 'i'`)
   - `createdAt`: if `from` provided, add `$gte`; if `to` provided, add `$lte` (inclusive, set `to` to end of day)

```ts
// Pseudocode
const filter: Record<string, unknown> = {};
if (query.actor) filter.actor = query.actor;
if (query.module) filter.module = query.module;
if (query.action) filter.action = { $regex: `^${escapeRegex(query.action)}` };
if (query.search) filter.description = { $regex: query.search, $options: 'i' };
if (query.from || query.to) {
  filter.createdAt = {};
  if (query.from) filter.createdAt.$gte = new Date(query.from);
  if (query.to) filter.createdAt.$lte = new Date(query.to + 'T23:59:59.999Z');
}
```

2. Query: `ActivityLog.find(filter).populate('actor', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limit)`
3. Count: `ActivityLog.countDocuments(filter)`
4. Return `{ data: mappedLogs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }`

**Response mapping:** Map Mongoose documents to the response shape — convert `actor` from populated object `{ _id, name, role }` to `{ id, name, role }`, rename `_id` to `id`, include all other fields.

Use the standard list pattern from `users.service.ts`:

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

return {
  data: logs.map((log) => ({
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
  })),
  meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
};
```

### Controller — `activity-log.controller.ts`

Single handler: `handleListActivityLogs(req, res, next)`.

Pattern from `users.controller.ts`:

```ts
export async function handleListActivityLogs(
  req: AuthenticatedRequest,
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

### Routes — `activity-log.routes.ts`

```
GET /activity-log -> authenticate, authorize('activity-log', 'view'), validate(listActivityLogSchema, 'query'), handleListActivityLogs
```

```ts
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

### Register in `backend/src/app.ts`

1. Add import alongside the other module imports (around line 24):
   ```ts
   import activityLogRoutes from './modules/activity-log/activity-log.routes';
   ```

2. Add mount after the last route (after line 169 `app.use('/api/v1', reportsRoutes)`):
   ```ts
   app.use('/api/v1', activityLogRoutes);
   ```

### No changes to:
- `activityLogger` middleware — already globally attached to all mutating routes
- `ActivityLog` model — already exists
- Constants — `'activity-log': ['view']` already defined in both `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`
- Error codes in `API.md` §23 — no new error codes needed
- Permission table in `API.md` §24 — already lists `activity-log: view`

---

## Frontend Implementation

### Module Structure — `frontend/src/features/activity-log/`

```
frontend/src/features/activity-log/
├── schema.ts
├── api.ts
└── components/
    ├── ActivityLogFilters.tsx
    └── ActivityLogFeed.tsx
```

### Schema — `schema.ts`

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
export type ActivityLogEntry = { /* matches API response shape */ };
export type ActivityLogListMeta = { total: number; page: number; limit: number; totalPages: number };
export type ActivityLogListResponse = { data: ActivityLogEntry[]; meta: ActivityLogListMeta };
```

### API — `api.ts`

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

**Filter options hook** (for dropdown population):

```ts
export function useActivityLogFilterOptions() {
  // Returns unique modules and actions for filter dropdowns
  // Use a dedicated lightweight aggregation or cache approach
  // Option A: Fetch a pre-computed list from a dedicated endpoint (preferred but out of scope for this task)
  // Option B: Extract from the current page's data (simpler, works for MVP)
  //
  // For v1: Hardcode the module options from the known modules constant
  // and populate action options from the current data's unique actions.
  // A future enhancement can add a dedicated `GET /activity-log/options` endpoint.
}
```

**Decision for v1:** The module filter dropdown uses the static list from `MODULE_ACTIONS` keys (imported from `@/lib/constants`). The action filter is a free-text input (since action values are dynamic and numerous). This avoids building a dedicated options endpoint for v1. The actor filter is also a free-text input (enter a User ID) — or use a user search, which is out of scope for this task.

### Components

#### `ActivityLogFilters.tsx`

A filter bar above the activity log feed with:

| Filter | UI Element | Source |
|---|---|---|
| `search` | Text input with search icon (debounced 300ms) | User types |
| `module` | Dropdown select (all modules + "All") | `MODULE_ACTIONS` keys from `@/lib/constants` |
| `action` | Text input (label: "Action prefix") | User types e.g. `order.` |
| `from` / `to` | Two date inputs (native `<input type="date">`) | User picks dates |

Layout: Wrap in a responsive flex grid. On mobile, stack vertically. On desktop, horizontal row.

**State management:** Local `useState` for each filter value. On change (with debounce for search), call `setFilters(...)` to update the query. The `page` resets to `1` whenever any filter changes.

**Debounce:** `search` uses 300ms debounce. All other filters apply immediately on change.

#### `ActivityLogFeed.tsx`

A timeline/feed view of activity log entries, NOT a DataTable — activity logs are inherently temporal and read better as a chronological list.

Each entry renders:

```
[Timestamp] [Action Badge] [Description]
            [Actor name] → [targetType]: [targetId]
```

Visual structure per entry (use `theme.md` tokens only — no hardcoded colors):

```
┌─────────────────────────────────────────────────────────┐
│  [Avatar]  [Actor Name]                         2m ago │
│            [Module Badge] · [Action Badge]              │
│            [Description]                                │
│            [Target: Order #123]                         │
└─────────────────────────────────────────────────────────┘
```

- **Left:** Actor avatar (first letter of name in a circle, background using `--primary` color, text using `--primary-foreground`). Fallback: show actor name only if no populated data.
- **Timestamp:** Relative time (using a small utility or hardcoded "X ago" — `date-fns/formatDistanceToNow` if available, else calculate manually). Full ISO date on hover/title.
- **Module + Action badges:** Two inline badges:
  - Module badge: `bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]`
  - Action badge: `bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]`
- **Description:** The main text, `text-sm font-medium text-[hsl(var(--foreground))]`
- **Target link:** If `targetId` and `targetType` are present, show a clickable link (e.g. `Order #667abc...`) that navigates to the relevant detail page (`/orders/{targetId}`). If `targetType` is not a known module with a detail page, show plain text.

**Loading state:** 5 skeleton cards (`animate-pulse` with rounded-xl bg-slate-200 blocks).
**Empty state:** "No activity recorded for this filter." with icon.
**Error state:** "Failed to load activity log." with retry button.

**Pagination:** Use the same pattern as `UserList` — manual page buttons at the bottom. No infinite scroll for v1 (simpler to implement and matches existing patterns).

#### `ActivityLogAvatar.tsx` (helper, inside components/)

A small inline avatar component:

```tsx
function ActivityLogAvatar({ name }: { name: string | null }) {
  if (!name) return <div className="h-8 w-8 rounded-full bg-slate-200" />;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-semibold text-[hsl(var(--primary-foreground))]">
      {initial}
    </div>
  );
}
```

### Page — `frontend/src/app/(dashboard)/activity-log/page.tsx`

```tsx
export default function ActivityLogPage() {
  return (
    <PermissionGate module="activity-log" action="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 xs:text-2xl">Activity Log</h1>
        </div>
        <ActivityLogFilters onFiltersChange={...} />
        <ActivityLogFeed filters={...} />
      </div>
    </PermissionGate>
  );
}
```

**State management:**

```tsx
const [filters, setFilters] = useState<ActivityLogFilters>({
  page: 1,
  limit: 20,
});

// When filters change, reset to page 1
function handleFilterChange(partial: Partial<ActivityLogFilters>) {
  setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
}

// Page change preserves filters
function handlePageChange(page: number) {
  setFilters((prev) => ({ ...prev, page }));
}

const { data, isLoading, isError, refetch } = useActivityLogs(filters);
```

Pass `data`, `isLoading`, `isError`, `refetch` to `ActivityLogFeed`. Pass filter state + handlers to `ActivityLogFilters`.

---

## Already Done (No Changes Needed)

- ✅ `ActivityLog` Mongoose model at `backend/src/models/ActivityLog.ts` — full schema with proper indexes
- ✅ `activityLogger` middleware at `backend/src/middleware/activityLogger.ts` — globally attached, already writing logs for all mutating routes
- ✅ Permission module key `activity-log` with `['view']` registered in both `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`
- ✅ Sidebar nav link `/activity-log` already exists with `module: 'activity-log'` and `History` icon (`frontend/src/components/shared/Sidebar.tsx:51`)
- ✅ `History` icon already imported in `lucide-react` import block (`Sidebar.tsx:19`)
- ✅ `PermissionGate` component, `Badge` component, shared layout, and all dashboard infrastructure
- ✅ API.md §21 already defines the endpoint at a high level; this task fleshes it out with pagination and full response shape
- ✅ API.md §24 permission table already lists `activity-log: view`
- ✅ `getModuleLabel('activity-log')` already returns `'Activity Log'` in `frontend/src/lib/constants.ts:44`

---

## Open Items to Resolve During This Task

1. **Actor filter UI:** For v1, the actor filter is a plain text input expecting a User ObjectId. A future enhancement could use a user search/select component. Accept this limitation.
2. **Action filter UI:** The action filter is a text input for prefix matching. Users can type `user.` to see all user-related actions. Accept this as the MVP UX.
3. **Target link resolution:** When `targetType` is `'Order'`, the link goes to `/orders/{targetId}`. For `'User'`, `/users/{targetId}`. For unknown/unmapped types, render plain text. Maintain a simple mapping in the component.
4. **Relative timestamps:** Use a small inline helper or Intl-based formatting rather than adding a dependency. Format: "2m ago", "1h ago", "3d ago", "Jun 27" for older dates.
5. **`search` field:** Uses regex with `$options: 'i'` on the `description` field. For large collections this won't be performant — a text index is the correct long-term solution. For v1 with moderate data volumes (<100K entries), the regex approach is acceptable. Add a comment noting this for future optimization.

---

## Verification

- `tsc --noEmit` passes clean on both apps
- `GET /api/v1/activity-log?page=1&limit=20` returns paginated results with populated actor
- `GET /api/v1/activity-log?module=users` returns only user-related entries
- `GET /api/v1/activity-log?action=user.` returns all actions starting with `user.`
- `GET /api/v1/activity-log?search=created` returns entries whose description contains "created"
- `GET /api/v1/activity-log?from=2026-06-01&to=2026-06-07` returns entries within date range
- Empty results return `{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }` (not 404)
- Activity log page loads at `/activity-log` with sidebar active state
- Activity log page is gated by `activity-log:view` — users without permission see the `<PermissionGate>` fallback
- Filtering by module/search/date updates the feed correctly
- Pagination works (prev/next buttons, page indicator, total count)
- Timestamps display relative time ("2m ago", "3d ago")
- Target links navigate to the correct detail pages (Orders, Users, etc.)
- Loading state shows skeleton cards
- Empty state shows "No activity recorded for this filter."
- Error state shows retry button
