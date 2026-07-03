# Implementation Plan: Home Page (Public) — Live Settings Branding

## Feature Overview

- **Feature name:** Home Page (Public) — Live Branding from Settings
- **Business goal:** Replace hardcoded placeholder branding on the public homepage with live `restaurantName` and `logo` data from the Settings module.
- **User value:** Restaurant owners see their own business name and logo on their public-facing homepage without editing code. The page remains a polished marketing surface (hero, features grid, CTA buttons) for walk-in visitors, staff, and admin users before login.

---

## Approved Scope

1. **Backend:** Add an **unauthenticated** `GET /api/v1/settings/public` endpoint returning only `restaurantName` and `logo` — the two fields needed by the public homepage.
2. **Frontend:** Create a `features/homepage/api.ts` with a `usePublicSettings` React Query hook that fetches the public endpoint.
3. **Frontend:** Update `app/(public)/page.tsx` to consume live settings data — replace hardcoded brand text, show logo image when configured, fall back to defaults when Settings fields are empty.
4. **Robustness:** Handle every loading/error/empty state gracefully — no broken layout when the API is unreachable or Settings fields are unset.
5. **Documentation:** Document the new public endpoint in `API.md`.

## Out of Scope

- **No new page sections** (hero, features grid, footer, and CTA buttons are already final from Task 0).
- **No SSR/ISR** — the page remains a client component (`'use client'`). Moving to SSR would require a different data-fetching approach and is not needed for v1.
- **No Settings edit UI changes** — the existing authenticated Settings page already handles `restaurantName` and `logo`.
- **No public endpoint for other Settings fields** — `address`, `contactNumber`, `vatInfo`, `businessHours` are not needed on the homepage and are intentionally excluded.
- **No dark mode** — deferred per `theme.md` §2 conflict-resolution note.

---

## Technical Decisions

| Decision | Rationale |
|---|---|
| New public endpoint `GET /settings/public` (not reusing the existing authenticated `GET /settings`) | The existing endpoint is authenticated and returns the full Settings document including sensitive fields (`vatInfo`). Adding an auth bypass to that endpoint would be a security risk. A dedicated public endpoint with a whitelist of exposed fields is safer and self-documenting. |
| Endpoint returns `{ data: { restaurantName, logo } }` following the standard envelope | Consistent with `API.md` §2 requirements. Both fields may be null/empty — the frontend handles fallback. |
| React Query for fetching public settings | The page is already a client component; React Query is the project's server-state standard per `architecture.md` §8. `staleTime` and `cacheTime` prevent redundant refetches since Settings rarely changes. |
| `restaurantName` fallback: hardcoded `"StationX"` when empty | Keeps the page functional even if the admin has never configured Settings. `"StationX"` is the project's default brand name. |
| Logo fallback: hide logo area when `logo.url` is empty | Avoids rendering a broken image or an empty placeholder. The navbar brand text (`restaurantName`) is always present, so there is no visual gap. |

---

## Frontend Impact

### Files created

- `frontend/src/features/homepage/api.ts` — `usePublicSettings` React Query hook

### Files modified

- `frontend/src/app/(public)/page.tsx` — consume live settings data

### Component changes

| Component | Change |
|---|---|
| `HomePage` (in `page.tsx`) | Import and call `usePublicSettings`. Replace hardcoded `"StationX"` in navbar with `settings.restaurantName \|\| 'StationX'`. Show logo image in navbar when `settings.logo?.url` is truthy. Replace `"StationX"` in footer copyright with the restaurant name. |
| `HealthIndicator` (in `page.tsx`) | No changes — remains in footer as a dev/debug indicator. |

### State management

- `usePublicSettings` hook returns `{ data, isLoading, isError }` from React Query.
- No Zustand store involvement — this is server state for an unauthenticated page.

### Theme/design tokens

All tokens are already defined in `theme.md` and the existing `page.tsx` uses them correctly. No new token decisions:

| Element | theme.md reference | Classes used |
|---|---|---|
| Navbar background | §4 Navbar — `bg-white/80 backdrop-blur-md` | Already correct |
| Navbar brand text | §3 — `text-lg font-bold text-slate-800` | Already correct |
| Logo image | — | `h-8 w-auto` (new, matches typical logo dimensions) |
| "Admin Login" button | §13 Button — `primary` variant | Already correct |
| Hero headline | §15 — `from-blue-800 via-blue-600 to-indigo-700` gradient | Already correct |
| Feature cards | §13 Card — `rounded-2xl border...shadow-sm` | Already correct |
| Footer | — `border-t border-slate-200` | Already correct |

---

## Backend Impact

### Files created

- (none — extend existing files)

### Files modified

- `backend/src/modules/settings/settings.routes.ts` — add `GET /settings/public` route **before** the authenticated routes
- `backend/src/modules/settings/settings.controller.ts` — add `handleGetPublicSettings` handler
- `backend/src/modules/settings/settings.service.ts` — add `getPublicSettings` method

### Service logic (`getPublicSettings`)

```
1. Call existing getSettings() to fetch the singleton (auto-creates defaults if missing)
2. Return only { restaurantName, logo }
   - restaurantName: string (may be empty)
   - logo: { url: string, publicId: string } | null
3. No authentication check — this endpoint is public
```

### Controller logic (`handleGetPublicSettings`)

```
1. Call getPublicSettings()
2. Return 200 { data: { restaurantName, logo } }
3. Standard error handling via next(error)
```

### Route registration

```typescript
// BEFORE the authenticated routes in settings.routes.ts:
router.get('/settings/public', handleGetPublicSettings);
```

The `/settings/public` route must be defined **first** so Express matches it before the authenticated `/settings` route (otherwise the `authenticate` middleware would reject unauthenticated requests before the public handler is reached).

---

## Database Impact

No schema changes. The `Settings` collection already has `restaurantName` and `logo` fields. The `getSettings()` service method already handles the "document doesn't exist" case by auto-creating defaults.

---

## API Impact

### New endpoint

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/settings/public` | none | none | Returns restaurant name and logo for the public homepage |

Response `200`:
```json
{
  "data": {
    "restaurantName": "My Restaurant",
    "logo": { "url": "https://res.cloudinary.com/.../logo.png", "publicId": "logos/abc123" }
  }
}
```

Both fields may be empty/null if Settings has not been configured:
```json
{
  "data": {
    "restaurantName": "",
    "logo": null
  }
}
```

### Modified endpoints

None. The existing `GET /settings` (authenticated) is unchanged.

---

## Authentication & Authorization

| Concern | Requirement |
|---|---|
| `GET /settings/public` | **No auth required.** This is a public endpoint. No `authenticate` or `authorize` middleware. |
| `GET /settings` (existing) | **Unchanged.** Still requires `authenticate` + `authorize('settings', 'view')`. |
| `PUT /settings` (existing) | **Unchanged.** Still requires `authenticate` + `authorize('settings', 'edit')`. |

---

## Security Requirements

| Concern | Mitigation |
|---|---|
| Public endpoint exposes Settings data | Only `restaurantName` and `logo` are returned. `vatInfo`, `businessHours`, `contactNumber`, `address`, and `loyaltyOrderThreshold` are never exposed. |
| Rate limiting | The endpoint is a simple single-document read with no aggregation — negligible load. Rate limiting is not required for this endpoint. |
| Data validation | No input validation needed — this is a GET endpoint with no parameters. |

---

## Edge Cases

| # | Case | Expected behavior |
|---|---|---|
| 1 | Settings document doesn't exist (first boot) | `getSettings()` auto-creates defaults with empty `restaurantName` and `logo.url === ''` → frontend falls back to `"StationX"` and hides logo. |
| 2 | `restaurantName` is empty string in Settings | Frontend shows `"StationX"` as fallback. |
| 3 | `logo` is `{ url: '', publicId: '' }` (default) | Frontend treats `logo.url` as falsy → hides logo image. |
| 4 | `logo` is missing both fields entirely | Same as #3 — `logo.url` is undefined → falsy → hides logo. |
| 5 | Backend API is unreachable (network error) | React Query `isError` is true → frontend shows hardcoded `"StationX"` fallback for brand name, no logo. Page remains fully functional and visually complete. |
| 6 | Backend API returns 500 | Same as #5 — REACT Query error state → fallback values. |
| 7 | `logo.url` points to a deleted Cloudinary image | Frontend renders broken image (`<img src={url} ... onError>`). Mitigation: add `onError` handler to hide the image if it fails to load. |
| 8 | Settings updated while homepage is open | React Query's default `staleTime: 0` means it will refetch on focus/remount. Could set `staleTime: 300000` (5 min) to avoid unnecessary requests since Settings rarely changes. |

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Route ordering: `/settings/public` must be registered before the authenticated `/settings` route | 401 errors on the public endpoint if routes are ordered wrong | Add a comment in the route file explaining the ordering dependency. Write a test case verifying the public endpoint returns 200 without auth. |
| Cloudinary image deletion without Settings update | Broken logo image on homepage | Add `onError` handler on the `<img>` tag to hide it. |
| Frontend flashes "StationX" then replaces with live name | Jarring UX on slow connections | Show a skeleton/placeholder until settings data loads. The existing page already renders immediately with `"StationX"` — the live data replaces it seamlessly once loaded. This is acceptable for v1. |

---

## Doc Updates Required

### `API.md` — Add new public endpoint to Settings section (§20)

**Old text (line 590):**
```
| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/settings` | `view` | Returns the one document |
| PUT | `/settings` | `edit` | Partial-merge update — see below |
```

**New text:**
```
| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/settings/public` | none | Public — returns `restaurantName` and `logo` for the homepage (no auth required) |
| GET | `/settings` | `view` | Returns the full Settings document |
| PUT | `/settings` | `edit` | Partial-merge update — see below |
```

Also add a note after the route table:

**Old text:**
```
**`PUT` here behaves like a merge, not a full replace:** [...]
```

**New text (insert before the PUT note):**
```
> **`GET /settings/public` is intentionally separate from the authenticated `GET /settings`.** The public endpoint returns only `restaurantName` and `logo` — the two fields the unauthenticated homepage needs. All other Settings fields (`vatInfo`, `businessHours`, `address`, etc.) remain gated behind authentication.
>
**`PUT` here behaves like a merge, not a full replace:** [...]
```

### No other doc updates needed

This feature does not resolve any open item from `AI_rules.md` §13, `database.md` §8, or `API.md` §25 — it's a straightforward extension of the existing Settings module.

---

## Implementation Order

```
1. Backend: Add getPublicSettings to settings.service.ts
2. Backend: Add handleGetPublicSettings to settings.controller.ts
3. Backend: Register GET /settings/public route in settings.routes.ts (BEFORE authenticated routes)
4. Backend: Write test for new public endpoint
5. Frontend: Create features/homepage/api.ts with usePublicSettings hook
6. Frontend: Update app/(public)/page.tsx to consume live settings
7. Verify: tsc --noEmit on both apps
8. Verify: npm test on backend (existing tests + new test)
9. Verify: Manual check — homepage with Settings empty, with Settings configured, with API down
10. Docs: Update API.md §20
11. Move decisions to docs/decision.md
12. Clear current_task.md for next backlog item
```

---

## Task Breakdown

### Task 1: Backend — Public settings endpoint

**Description:** Add a new public route `GET /api/v1/settings/public` that returns only the fields needed by the public homepage.

**Files:**
- `backend/src/modules/settings/settings.service.ts`
- `backend/src/modules/settings/settings.controller.ts`
- `backend/src/modules/settings/settings.routes.ts`

**Acceptance Criteria:**
- `GET /api/v1/settings/public` returns `200` with `{ data: { restaurantName: string, logo: { url, publicId } | null } }` — no auth required.
- When Settings doesn't exist, it returns the defaults (empty `restaurantName`, `logo: null`).
- The existing authenticated `GET /api/v1/settings` and `PUT /api/v1/settings` continue to work unchanged.
- `GET /api/v1/settings/public` never exposes `vatInfo`, `businessHours`, `address`, `contactNumber`, or `loyaltyOrderThreshold`.
- `tsc --noEmit` passes.
- New test: verify public endpoint returns 200 without auth token and returns only the expected fields.

### Task 2: Frontend — React Query hook

**Description:** Create `features/homepage/api.ts` with a `usePublicSettings` hook.

**Files:**
- `frontend/src/features/homepage/api.ts` (new)

**Acceptance Criteria:**
- Hook returns `{ data, isLoading, isError, error }` from React Query.
- `queryKey` is `['public-settings']`.
- Calls `GET /api/v1/settings/public` via `apiClient`.
- Default `staleTime: 300000` (5 minutes) since Settings rarely changes.
- Return type: `{ restaurantName: string; logo?: { url: string; publicId: string } }`.
- `tsc --noEmit` passes.

### Task 3: Frontend — Wire homepage

**Description:** Update the homepage component to fetch and display live branding data.

**Files:**
- `frontend/src/app/(public)/page.tsx`

**Acceptance Criteria:**
- Navbar brand text shows `settings.restaurantName || 'StationX'`.
- When `settings.logo?.url` is truthy, show the logo image in the navbar (`h-8 w-auto`, positioned before the brand text, hidden on very narrow screens with `hidden sm:inline-block`).
- Logo `<img>` has an `onError` handler that hides the image if it fails to load.
- Footer copyright text uses the restaurant name instead of hardcoded `"StationX"`.
- When `isLoading` is true (first fetch), the page renders immediately with `"StationX"` fallback — no loading spinner or skeleton for the brand text (the existing hardcoded value serves as the placeholder).
- When `isError` is true (API unreachable), same fallback behavior.
- Hero headline, feature cards, CTA buttons, and decorative elements are unchanged.
- `HealthIndicator` remains in footer.
- `tsc --noEmit` passes.

### Task 4: Documentation

**Description:** Document the new public endpoint.

**Files:**
- `docs/API.md` — add public endpoint to §20 route table + explanatory note

**Acceptance Criteria:**
- The new `GET /settings/public` route is listed in the route table with `Auth: none` and `Permission: none`.
- An explanatory note explains why this separate public endpoint exists vs. reusing the authenticated `GET /settings`.

### Task 5: Verification

**Description:** Run all checks.

**Acceptance Criteria:**
- `cd backend && npx tsc --noEmit` passes.
- `cd frontend && npx tsc --noEmit` passes.
- `cd backend && npm test` — all existing + new tests pass.
- Manual verification:
  1. With empty Settings → homepage shows "StationX", no logo.
  2. With configured Settings → homepage shows restaurant name and logo.
  3. With backend down → homepage shows "StationX" fallback, no broken layout.

---

## Final Approved Decisions

| Decision | Value |
|---|---|
| Endpoint for public settings | `GET /api/v1/settings/public` (separate from authenticated `GET /settings`) |
| Fields exposed publicly | Only `restaurantName` and `logo` |
| Default brand name fallback | `"StationX"` (hardcoded in frontend) |
| Logo fallback when unset | Hidden entirely (no placeholder or broken image) |
| Logo error fallback | `onError` hides the image element |
| Data fetching | React Query with 5-minute stale time |
| Page rendering mode | Client-side (`'use client'`) — no SSR change |
| Route registration order | Public route must be registered BEFORE authenticated routes in the router |
| Auth on public endpoint | None — no `authenticate` or `authorize` middleware |
| Existing Settings endpoints | Unchanged — still require authentication |
