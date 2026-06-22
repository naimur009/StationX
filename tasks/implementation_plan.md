# Implementation Plan — Task 5: Categories

## Feature Overview

- **Feature name:** Categories
- **PRD reference:** Feature 12
- **Business goal:** Provide a managed list of product categories that can be assigned to products for organization, filtering in POS, and grouping in Income reports.
- **User value:** Staff can organize products into logical groups (Beverages, Snacks, Main Course, etc.), cashiers can filter the POS catalog by category during order creation, and reports can break down income per category.

## Approved Scope

**In scope:**
- Backend: `Category` Mongoose model; full CRUD REST endpoints (create, read, update, soft-delete); permission-gated; Zod validation; activity-logged via global middleware.
- Frontend: `features/categories/` feature module with React Query hooks, Zod schemas, and components; dashboard route page at `app/(dashboard)/categories/page.tsx`; create/edit via dialog; soft-delete with confirmation; hard-delete for inactive categories with separate confirmation dialog; DataTable list with search and active/inactive filter.
- Sidebar: nav item already exists at `Sidebar.tsx:46` (`/categories`, `FolderTree` icon, `categories` module key) — only needs permission-gating (which is automatic via the existing `hasPermission` filter in `Sidebar.tsx:63`).
- Permissions: module key `categories` with `view`, `create`, `edit`, `delete` actions — already defined in both backend and frontend `constants.ts`.

**Out of scope:**
- No category grouping/hierarchy (parent-child categories) — not requested in PRD.
- No category image/icon/color swatch — not in scope; if needed later, add as an additive field (non-breaking).
- No separate `ExpenseCategory` collection — per DATABASE.md §3.12 note, expense categories remain free-text in v1.

## Technical Decisions

| Decision | Rationale |
|---|---|
| Soft-delete via `isActive` as default delete path | Matches `DATABASE.md` §1 soft-delete list: Category is referenced by Product, so preserving historical integrity requires soft-delete. |
| Hard-delete as explicit opt-in via `DELETE /categories/:id/permanent` | Added by user request; allows permanent removal of unused categories. Gated by same `categories:delete` permission. Blocked (via TODO) when active Products reference the category. |
| Allow soft-delete even when Products reference the category | Per `API.md` §17 / `DATABASE.md` §3.3: products keep their (now-inactive) category reference for historical accuracy. The inactive category is hidden from active dropdowns only. |
| Modal-driven CRUD (not a full-page editor) | Per backlog's Design checklist: Categories is low-complexity (single `name` field), so a DataTable list + create/edit dialog follows the pattern of the Users module's `CreateUserForm`/`EditUserForm` modals. |
| Default list filter: show active only (`isActive=true`) | Matches the Users module pattern (`includeInactive` param to include deactivated). `GET /categories?isActive=true` (default) excludes soft-deleted. `GET /categories?isActive=false` shows only soft-deleted. Omitting the param shows active only (same as explicit `true`). |
| No separate rate limiter for `/categories` | Categories is not a public/auth-sensitive endpoint; standard rate-limiting via global middleware is sufficient. |

## Frontend Impact

### New Files

```
frontend/src/
├── features/
│   └── categories/
│       ├── api.ts
│       ├── schema.ts
│       └── components/
│           ├── CategoryList.tsx
│           ├── CategoryForm.tsx
│           └── DeleteCategoryDialog.tsx
└── app/(dashboard)/
    └── categories/
        └── page.tsx
```

### Files That Need No Changes

- `app/(dashboard)/layout.tsx` — already renders sidebar + content area; new page is a child route
- `Sidebar.tsx` — all 15 nav items including `/categories` are already defined at line 46; permission-gating via `hasPermission` at line 63 is already wired. No changes needed.
- `lib/constants.ts` — `categories: ['view', 'create', 'edit', 'delete']` already defined at line 17
- `lib/permissions.ts` — no changes needed
- `lib/api-client.ts` — no changes needed

### Component Details

#### `features/categories/api.ts`
- `CategoryResponse` type: `{ id, name, isActive, createdAt, updatedAt }`
- `useCategoriesList(params)` — `GET /categories?isActive=&search=&page=&limit=`, returns `{ data, meta }`
- `useCategory(id)` — `GET /categories/:id`
- `useCreateCategory()` — `POST /categories`, invalidates `['categories']` query key
- `useUpdateCategory()` — `PUT /categories/:id`, invalidates `['categories']`
- `useDeleteCategory()` — `DELETE /categories/:id`, invalidates `['categories']`

Pattern matches `features/users/api.ts` exactly: `useQuery` for list/detail, `useMutation` for CUD with `onSuccess` calling `queryClient.invalidateQueries({ queryKey: ['categories'] })`.

#### `features/categories/schema.ts`
- `createCategorySchema`: `name` — z.string().min(1, 'Name is required').max(100)
- `updateCategorySchema`: `name` — z.string().min(1, 'Name is required').max(100)
- Pattern matches `features/users/schema.ts` — both schemas are simple objects with string `name` fields

#### `features/categories/components/CategoryList.tsx`
- Uses `useCategoriesList` hook
- Search input (debounced 300ms, matching UserList pattern)
- Active/inactive filter dropdown (`All / Active / Deactivated`)
- DataTable: columns = Name, Status (green dot for active, `Badge variant="slate"` "Deactivated" for inactive), Actions (Edit, Deactivate/Reactivate)
- Pagination (matches UserList pattern)
- Loading state: inline text "Loading categories..."
- Empty state: "No categories yet — create one to get started"
- Error state: inline error banner (matches UserList)
- Color/type/spacing: uses theme.md tokens via Tailwind classes (slate-50, slate-100, slate-200, etc.)

#### `features/categories/components/CategoryForm.tsx`
- Modal dialog (shadcn `Dialog`) for create/edit
- Single form field: `name` (text input)
- Title: "Create Category" / "Edit Category"
- Save button: "Create" / "Save Changes" (active voice per theme.md §19)
- Cancel button: "Cancel"
- Pattern matches `CreateUserForm`/`EditUserForm` — dialog open/close via props, RHF form, submit calls mutation

#### `features/categories/components/DeleteCategoryDialog.tsx`
- Confirmation dialog: "Delete Category" title, body explains "This will soft-delete this category. Products assigned to it will retain their reference but the category will be hidden from active lists."
- Confirm button: "Delete" (destructive variant)
- Cancel button: "Cancel"
- On success: close dialog, show success toast (react-hot-toast per theme.md §16)

#### `app/(dashboard)/categories/page.tsx`
- Wraps content in `<PermissionGate module="categories" action="view">`
- Page header: "Categories" title + "Create Category" button (gated by `categories:create`)
- Renders `CategoryList`, `CategoryForm`, `DeleteCategoryDialog` with open/close state management
- Pattern matches `app/(dashboard)/users/page.tsx` exactly

## Backend Impact

### New Files

```
backend/src/
├── models/
│   └── Category.ts
└── modules/
    └── categories/
        ├── categories.routes.ts
        ├── categories.controller.ts
        ├── categories.service.ts
        └── categories.validation.ts
```

### Files That Need Changes

- `backend/src/app.ts` — add `import categoriesRoutes from './modules/categories/categories.routes';` and `app.use('/api/v1', categoriesRoutes);` after existing module routes.

### File Details

#### `models/Category.ts`
```typescript
// Fields per DATABASE.md §3.3:
//   name: String, required, unique, trimmed
//   isActive: Boolean, default true
// Options: { timestamps: true }
// Index: name (unique)
// Text index on name for search
```

#### `modules/categories/categories.validation.ts`
- `createCategorySchema`: `{ name: z.string().min(1).max(100).trim() }`
- `updateCategorySchema`: `{ name: z.string().min(1).max(100).trim() }`
- `listCategoriesSchema`: `{ page, limit, isActive, search }`
- Both schemas use `.strict()` to reject unknown fields
- Exported types: `CreateCategoryDto`, `UpdateCategoryDto`, `ListCategoriesDto`

#### `modules/categories/categories.routes.ts`
Pattern matches `users.routes.ts` exactly:

```
GET    /categories            authenticate → authorize('categories','view') → validate(listCategoriesSchema, 'query') → handleListCategories
GET    /categories/:id        authenticate → authorize('categories','view') → validate(objectIdParam, 'params') → handleGetCategory
POST   /categories            authenticate → authorize('categories','create') → validate(createCategorySchema) → handleCreateCategory
PUT    /categories/:id        authenticate → authorize('categories','edit') → validate(updateCategorySchema) → handleUpdateCategory
DELETE /categories/:id        authenticate → authorize('categories','delete') → validate(objectIdParam, 'params') → handleDeleteCategory
```

#### `modules/categories/categories.controller.ts`
- Standard pattern: extract `req` data → call service → send response envelope `{ data: ... }`
- Each handler wraps in try/catch, errors flow to `errorHandler` middleware
- Uses `handleAsync` or explicit `next(error)` (whichever pattern the project uses — check existing controllers)

#### `modules/categories/categories.service.ts`
- `list(query: ListCategoriesDto)` — builds filter: by default `{ isActive: true }` (unless explicit `isActive` param provided); supports text search on `name` if `search` param provided; pagination via `.skip().limit()`
- `getById(id: string)` — `findById(id)`, throw `NOT_FOUND` if null
- `create(dto: CreateCategoryDto)` — check unique name (case-insensitive? — yes, unique index is case-sensitive by default in Mongo; if "Beverages" and "beverages" should be treated as same, add lowercase normalize; per DATABASE.md §3.3, name is just `unique` no lowercase note, so case-sensitive uniqueness is the default)
- `update(id: string, dto: UpdateCategoryDto)` — check unique name if changed, `findByIdAndUpdate` with `{ new: true, runValidators: true }`, throw `NOT_FOUND` if null
- `delete(id: string)` — `findByIdAndUpdate(id, { isActive: false }, { new: true })`, throw `NOT_FOUND` if null. Does NOT check for referencing Products (per approved decision: soft-delete allowed regardless)

#### Activity logging
- No special handling needed — the global `activityLogger` middleware (wired at `app.ts:84`) auto-generates entries for all mutating routes (POST/PUT/DELETE) on `/categories`.

## Database Impact

### New Collection: `Category`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | `unique: true`, `trim: true` |
| `isActive` | Boolean | yes | `true` | soft-delete flag |
| `createdAt` | Date | auto | — | Mongoose `timestamps: true` |
| `updatedAt` | Date | auto | — | Mongoose `timestamps: true` |

### Indexes
- `{ name: 1 }` — unique (covers unique constraint)
- `{ name: 'text' }` — text index for search (optional but matches Products/Users pattern for search; needed if search param is supported)
- `{ isActive: 1 }` — covers the active/inactive filter query

### Relationships
- Referenced-by: `Product.categoryId` → Category (not created yet — this relationship is forward-looking)
- Soft-delete rule: Category can be soft-deleted even when Products reference it; Products keep their (now-inactive) category reference per `DATABASE.md` §3.3

## API Impact

### New Endpoints

Base path: `/api/v1/categories`. Permission module key: `categories`.

| Method | Path | Action | Request | Response | Errors |
|---|---|---|---|---|---|
| GET | `/categories` | `view` | Query: `?isActive=true\|false&search=&page=1&limit=20` | `{ data: [...], meta: { total, page, limit } }` — default filters to `isActive: true` | — |
| GET | `/categories/:id` | `view` | — | `{ data: { id, name, isActive, createdAt, updatedAt } }` | `404 NOT_FOUND` |
| POST | `/categories` | `create` | `{ "name": "Beverages" }` | `201 { data: { id, name, isActive, ... } }` | `400 VALIDATION_ERROR`, `400` (duplicate name) |
| PUT | `/categories/:id` | `edit` | `{ "name": "Hot Beverages" }` | `200 { data: { ... } }` | `404 NOT_FOUND`, `400 VALIDATION_ERROR` |
| DELETE | `/categories/:id` | `delete` | — | `200 { data: { success: true } }` | `404 NOT_FOUND` |

### Request/Response Contracts

```
GET /categories
  Response 200:
    { "data": [
        { "id": "abc123", "name": "Beverages", "isActive": true, "createdAt": "...", "updatedAt": "..." },
        { "id": "def456", "name": "Snacks", "isActive": true, "createdAt": "...", "updatedAt": "..." }
      ],
      "meta": { "total": 2, "page": 1, "limit": 20 } }

POST /categories
  Request: { "name": "Beverages" }
  Response 201:
    { "data": { "id": "abc123", "name": "Beverages", "isActive": true, "createdAt": "...", "updatedAt": "..." } }

DELETE /categories/:id
  Response 200:
    { "data": { "success": true } }
```

### Error Codes Used

| Code | When |
|---|---|
| `400 VALIDATION_ERROR` | Invalid request body (missing/empty name, name >100 chars, extra fields) |
| `404 NOT_FOUND` | Category ID does not exist (or already soft-deleted and not found) |

No new error codes needed — all failure modes are covered by existing codes in `API.md` §23.

### No Real-Time Events

Categories are reference data, not operational data. No Socket.io events are defined for category CRUD — no live-update requirement exists in the PRD for categories.

## Authentication & Authorization

| Endpoint | Auth required | Permission check |
|---|---|---|
| `GET /categories` | Yes (`authenticate`) | `authorize('categories', 'view')` |
| `GET /categories/:id` | Yes | `authorize('categories', 'view')` |
| `POST /categories` | Yes | `authorize('categories', 'create')` |
| `PUT /categories/:id` | Yes | `authorize('categories', 'edit')` |
| `DELETE /categories/:id` | Yes | `authorize('categories', 'delete')` |

- `admin` role bypasses all permission checks per `ARCHITECTURE.md` §6
- `manager`/`employee` are evaluated against their `permissions` array with default-deny
- Frontend `PermissionGate` wraps each page section and action button for UX convenience (not security boundary)

## Security Requirements

| Concern | Implementation |
|---|---|
| Input validation | Zod schema on every mutating endpoint (name: string, min 1, max 100, trimmed, no extra fields) |
| Injection prevention | Mongoose query builders only (no raw/string-interpolated queries) |
| Auth bypass | `authenticate` + `authorize` middleware on every route — no unprotected category routes |
| Data exposure | Standard `data` envelope, no sensitive fields on Category model |
| Rate limiting | Not needed — Categories is not a public/auth-sensitive endpoint |

## Edge Cases

| Edge Case | Expected Behavior |
|---|---|
| `POST /categories` with existing name (duplicate) | Mongo unique index violation → `400 VALIDATION_ERROR` (handled by Mongoose `E11000` error → `errorHandler` maps to 400) |
| `POST /categories` with empty/whitespace-only name | Zod `.min(1)` rejects → `400 VALIDATION_ERROR` |
| `POST /categories` with name >100 characters | Zod `.max(100)` rejects → `400 VALIDATION_ERROR` |
| `GET /categories/:id` with nonexistent ObjectId | Service throws `createError(404, 'NOT_FOUND')` |
| `GET /categories/:id` with invalid ObjectId format | Zod `objectIdParam` validation fails → `400 VALIDATION_ERROR` |
| `PUT /categories/:id` renaming to an already-used name | Unique index violation → `400 VALIDATION_ERROR` |
| `PUT /categories/:id` with no changes (same name) | Succeeds — no conflict since the same document owns the name |
| `DELETE /categories/:id` on a category referenced by Products | Soft-delete succeeds; referencing Products keep the (now-inactive) reference (per approved decision) |
| `DELETE /categories/:id` on an already-deleted category | `404 NOT_FOUND` (query filters by `_id` only, not `isActive`; but if `findById` returns the inactive doc, it still exists — should succeed as a no-op, or return 404? Decision: since it's a soft-delete, `findByIdAndUpdate` with `{ isActive: false }` succeeds idempotently — it's already false, but the update is a no-op. Return `200` with `{ success: true }`.) |
| `POST /categories` with extra/unknown fields in body | Zod `.strict()` strips them; no error (matching existing pattern) |
| `GET /categories` with `page` beyond last page | Empty `data: []` with correct `meta.total` |
| `GET /categories` with `limit=0` or negative | Zod `z.coerce.number().positive()` rejects → `400 VALIDATION_ERROR` |
| `GET /categories` with `limit > 100` | Capped at 100 (matching API.md §2 and existing pattern) |
| `GET /categories` with no `isActive` param | Defaults to `isActive: true` (active only) |
| `GET /categories` with `isActive=false` explicit | Shows only soft-deleted categories |
| `GET /categories` with `search` param matching no categories | Empty `data: []`, correct `meta` |
| Reactivating a category via `PUT /categories/:id` with `isActive: true` | Succeeds — `PUT` is full edit, includes `isActive` setter. Though the schema only defines `name`, the service can accept a partial body with `isActive`. Decision: the update schema includes `isActive` as an optional boolean field so re-activation doesn't need a separate endpoint. This matches the API.md §17 note: "PUT /categories/:id — Edit". |
| `PUT /categories/:id` attempting to set `isActive` to false (deactivate via PUT) | Allowed — `PUT` includes `isActive` in the schema. This provides a quick toggle path without requiring a separate PATCH or DELETE endpoint. |
| Multiple concurrent `POST /categories` with different names | Both succeed — no race condition |
| Creating a category with name that differs only by case from an existing one | Allowed — Mongoose unique index is case-sensitive by default. "Beverages" and "beverages" are distinct. |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Category model drift from DATABASE.md | Low | Low | Model file is simple (2 fields); code review catches field mismatch |
| Forgetting to wire `categoriesRoutes` in `app.ts` | Low | Medium | Standard checklist item; tests catch 404 on `/categories` |
| Navigation to `/categories` before Sidebar has it | None | — | Already present in `Sidebar.tsx:46` — no risk |
| Permission key mismatch (backend vs frontend) | Low | Medium | Both constants files already define `categories: ['view', 'create', 'edit', 'delete']` identically — verified |
| Inactive category still appears in POS dropdown later | Low | Medium | POS product-fetch route (`GET /pos/products`) will need to filter by category `isActive: true` when implemented — noted in POS backlog item |

## Doc Updates Required

**None.** This feature does not resolve any open item in `AI_rules.md` §13, `database.md` §8, or `API.md` §25. The `categories` module key is already defined in all relevant docs.

## Implementation Order

The build sequence minimizes context-switching between frontend and backend:

1. **Backend model** — `models/Category.ts`
2. **Backend validation** — `categories.validation.ts`
3. **Backend service** — `categories.service.ts`
4. **Backend controller** — `categories.controller.ts`
5. **Backend routes** — `categories.routes.ts`
6. **Wire in app.ts** — add import and `app.use(...)` in `app.ts`
7. **Test backend** — manual test via curl/Postman
8. **Frontend api hooks** — `features/categories/api.ts`
9. **Frontend schemas** — `features/categories/schema.ts`
10. **Frontend components** — `CategoryList.tsx`, `CategoryForm.tsx`, `DeleteCategoryDialog.tsx`
11. **Frontend page** — `app/(dashboard)/categories/page.tsx`
12. **Verify end-to-end** — run both apps, navigate to Categories page, CRUD a category

## Task Breakdown

### Task 5.1: Backend Model — Category

**Description:** Create the Mongoose model for Category.

**Files to create:**
- `backend/src/models/Category.ts`

**Acceptance Criteria:**
- Model has fields: `name` (String, required, unique, trim), `isActive` (Boolean, default true)
- `{ timestamps: true }` enabled
- Unique index on `name`
- Text index on `name`
- Model file matches `DATABASE.md` §3.3 exactly

### Task 5.2: Backend Validation — Zod Schemas

**Description:** Create Zod validation schemas for all Category endpoints.

**Files to create:**
- `backend/src/modules/categories/categories.validation.ts`

**Acceptance Criteria:**
- `createCategorySchema`: `{ name: z.string().min(1).max(100).trim() }`, `.strict()`
- `updateCategorySchema`: `{ name: z.string().min(1).max(100).trim(), isActive: z.boolean().optional() }`, `.strict()`
- `listCategoriesSchema`: `{ page, limit, isActive: z.enum(['true','false']).optional(), search: z.string().max(100).optional() }`
- Exported TypeScript types: `CreateCategoryDto`, `UpdateCategoryDto`, `ListCategoriesDto`
- Patterns match `users.validation.ts` conventions

### Task 5.3: Backend Service — Business Logic

**Description:** Create the service layer with all CRUD business logic.

**Files to create:**
- `backend/src/modules/categories/categories.service.ts`

**Acceptance Criteria:**
- `list(query: ListCategoriesDto)`:
  - Default filter `{ isActive: true }` when no `isActive` param
  - Supports `search` via text index on `name` (or regex, matching existing pattern)
  - Pagination: page/limit defaults 1/20, max 100
  - Returns `{ data: Category[], meta: { total, page, limit } }`
- `getById(id: string)`:
  - `findById(id)` — returns doc or throws `NOT_FOUND`
- `create(dto: CreateCategoryDto)`:
  - `create(dto)` — returns new doc
  - Catches Mongo `E11000` duplicate key error → throws `400 VALIDATION_ERROR`
- `update(id: string, dto: UpdateCategoryDto)`:
  - `findByIdAndUpdate(id, dto, { new: true, runValidators: true })` — returns updated doc or throws `NOT_FOUND`
  - Catches `E11000` for rename-to-duplicate
- `delete(id: string)`:
  - `findByIdAndUpdate(id, { isActive: false }, { new: true })` — returns updated doc or throws `NOT_FOUND`
- All errors use `createError(code, message)` from `errorHandler.ts`

### Task 5.4: Backend Controller — Request Handlers

**Description:** Create the controller layer.

**Files to create:**
- `backend/src/modules/categories/categories.controller.ts`

**Acceptance Criteria:**
- `handleListCategories`, `handleGetCategory`, `handleCreateCategory`, `handleUpdateCategory`, `handleDeleteCategory`
- Each extracts validated data from `req` (body, query, params)
- Calls the corresponding service method
- Sends response in standard envelope (`{ data: ... }`)
- Wraps in try/catch, passes errors to `next(error)`
- Pattern matches `.controller.ts` files in existing modules (e.g., `users.controller.ts`)

### Task 5.5: Backend Routes — Wire Everything

**Description:** Create the routes file and wire into the Express app.

**Files to create:**
- `backend/src/modules/categories/categories.routes.ts`

**Files to modify:**
- `backend/src/app.ts` — add import and middleware wiring

**Acceptance Criteria:**
- Routes file defines all 5 endpoints with correct middleware stack:
  - `authenticate` (all)
  - `authorize('categories', '<action>')` (all)
  - `validate(schema, 'body'|'query'|'params')` (all)
  - Controller handler
- `app.ts` imports `categoriesRoutes` and registers `app.use('/api/v1', categoriesRoutes)`
- Routes file pattern matches `users.routes.ts` exactly

### Task 5.6: Frontend API — React Query Hooks

**Description:** Create the frontend API layer for Categories.

**Files to create:**
- `frontend/src/features/categories/api.ts`

**Acceptance Criteria:**
- `CategoryResponse` type: `{ id: string; name: string; isActive: boolean; createdAt: string; updatedAt: string }`
- `useCategoriesList(params)` — calls `GET /categories?isActive=&search=&page=&limit=`, returns `{ data, meta }`
- `useCategory(id)` — `GET /categories/:id`
- `useCreateCategory()` — `POST /categories`, invalidates `['categories']` on success
- `useUpdateCategory()` — `PUT /categories/:id`, invalidates `['categories']` on success
- `useDeleteCategory()` — `DELETE /categories/:id`, invalidates `['categories']` on success
- Pattern matches `features/users/api.ts` exactly

### Task 5.7: Frontend Schemas — Zod Form Validation

**Description:** Create frontend Zod schemas for Category forms.

**Files to create:**
- `frontend/src/features/categories/schema.ts`

**Acceptance Criteria:**
- `createCategorySchema`: `{ name: z.string().min(1, 'Name is required').max(100) }`
- `updateCategorySchema`: `{ name: z.string().min(1, 'Name is required').max(100) }`
- Exported types: `CreateCategoryFormData`, `UpdateCategoryFormData`
- Pattern matches `features/users/schema.ts` — same field shape, same validation rules
- Must stay in sync with backend `categories.validation.ts`

### Task 5.8: Frontend Components — List, Form, Delete Dialog

**Description:** Build the three UI components for Categories management.

**Files to create:**
- `frontend/src/features/categories/components/CategoryList.tsx`
- `frontend/src/features/categories/components/CategoryForm.tsx`
- `frontend/src/features/categories/components/DeleteCategoryDialog.tsx`

**Acceptance Criteria:**

`CategoryList.tsx`:
- Search input with 300ms debounce (matching UserList)
- Active/inactive filter dropdown (All / Active / Deactivated)
- DataTable with columns: Name, Status (green dot / slate badge), Actions (Edit, Deactivate/Reactivate)
- Pagination with page nav (prev/next, "Showing X-Y of Z")
- Loading state: text "Loading categories..."
- Empty state: "No categories yet — create one to get started"
- Error state: inline banner (matching UserList) with dismiss
- Color/type/spacing per theme.md tokens

`CategoryForm.tsx`:
- shadcn `Dialog` (modal)
- Create mode: title "Create Category", save button "Create"
- Edit mode: title "Edit Category", save button "Save Changes"
- Single field: `name` (text input with label)
- React Hook Form with Zod resolver
- Loading state on submit button
- Error state for duplicate name
- Calls `useCreateCategory()` or `useUpdateCategory()` mutation

`DeleteCategoryDialog.tsx`:
- shadcn `Dialog` (modal)
- Title: "Delete Category"
- Body: explains "This will soft-delete this category. Products assigned to it will retain their reference but the category will be hidden from active lists."
- Confirm button: "Delete" (destructive variant)
- Cancel button: "Cancel"
- Calls `useDeleteCategory()` mutation
- Success → toast "Category deleted" (react-hot-toast)

### Task 5.9: Frontend Page — Dashboard Route

**Description:** Create the dashboard route page for Categories.

**Files to create:**
- `frontend/src/app/(dashboard)/categories/page.tsx`

**Acceptance Criteria:**
- Wrapped in `<PermissionGate module="categories" action="view">`
- Page header: title "Categories" with description "Manage product categories"
- "Create Category" button visible only when user has `categories:create` permission (gated by `<PermissionGate module="categories" action="create">`)
- Renders `CategoryList`, `CategoryForm` (create/edit), `DeleteCategoryDialog` with open/close state
- Pattern matches `page.tsx` implementations in Users and Settings exactly

### Task 5.10: Verification

**Description:** Verify the full CRUD flow works end-to-end.

**Acceptance Criteria:**
- Backend `npm run dev` compiles and starts without errors
- Frontend `npm run dev` compiles and starts without errors
- Backend tests pass: `npm test` (if any Category tests exist)
- Backend lint passes: `npm run lint` / `npm run typecheck`
- Frontend lint passes: `npm run lint` / `npm run typecheck` (if those scripts exist)
- Manual verification via browser:
  1. Login as admin → navigate to Categories via sidebar
  2. See empty list with correct empty-state message
  3. Create "Beverages" — appears in list with green active dot
  4. Create "Snacks" — appears in list
  5. Edit "Beverages" → "Hot Beverages" — name updates
  6. Delete "Snacks" — disappears from list (shows only in "Deactivated" filter)
  7. Reactivate "Snacks" — reappears in active list
  8. Try creating empty name — validation error shown
  9. Try duplicate name — error shown
  10. Filter by "Deactivated" — only Snacks shown (was deactivated in step 6)
  11. Navigate away and back — list persists

## Final Approved Decisions

| ID | Decision | Source | Rationale |
|---|---|---|---|
| D-5.1 | Soft-delete via `isActive` | DATABASE.md §1 | Category is referenced by Product; must preserve historical integrity |
| D-5.2 | Soft-delete allowed even when Products reference the category | API.md §17 / DATABASE.md §3.3 | Products keep their (now-inactive) reference; hidden from active dropdowns only |
| D-5.3 | Modal-driven CRUD (not full-page editor) | backlog.md (Task 5 Design checklist) | Categories is low-complexity (single `name` field); matches UserForm pattern |
| D-5.4 | Default list filter: active only (`isActive: true`) | Users module precedent (matching `includeInactive` pattern) | Admin list page — showing active by default is standard admin UX |
| D-5.5 | `updateCategorySchema` includes optional `isActive` field | No separate activate/deactivate endpoint needed | Allows re-activation via PUT without a dedicated PATCH route; matches API.md §17 "PUT — Edit" |
| D-5.6 | Case-sensitive category names | Mongoose unique index default behavior | "Beverages" and "beverages" are distinct — no requirement for case-insensitive names |
| D-5.7 | No separate rate limiter for categories | Category endpoints are not public/auth-sensitive | Standard middleware handles rate limiting if needed |
| D-5.8 | No real-time Socket.io events for categories | PRD has no live-update requirement for categories | Categories are reference data, not operational data |
| D-5.9 | Sidebar already has Categories nav item at line 46 | Verified in Sidebar.tsx | No frontend navigation changes needed for this task |
| D-5.10 | Permission module key `categories` with 4 actions | Verified in both constants.ts files | No new permission configuration needed for this task |
