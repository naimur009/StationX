# Implementation Plan — Products

## Feature Overview

| Field | Value |
|---|---|
| **Feature name** | Products |
| **PRD Feature** | #11 — Products |
| **Business goal** | Allow restaurant staff to manage the full product catalog (name, price, category, image, description, availability) that powers the POS and administrative workflows. |
| **User value** | Staff can add/edit/deactivate products, organize them by category, search by name, and upload product images — this catalog is consumed by POS for order creation and by the admin product list for management. |

## Approved Scope

- Full CRUD (Create, Read, Update, Soft-Delete) for Products
- Image upload via the existing Shared Uploads endpoint (Task 6)
- Category assignment (dropdown filtered to active categories)
- Text search on product name
- Active/inactive filter and toggle (isActive doubles as availability)
- Dialog-based create/edit form (same pattern as Categories)
- Soft-delete with reactivation via normal PUT (no separate restore route)

## Out of Scope

- **Product inventory/stock tracking** — explicitly deferred per `ARCHITECTURE.md` §1 assumption table and §13 Future Scope. `Product.stock` field is reserved as an additive non-breaking addition.
- **Vendor↔Product linkage** — `Vendor.itemsSupplied` is free-text tags, not a Product reference. Per `ARCHITECTURE.md` §1 decision.
- **Bulk import/export of products** — no requirement in PRD.
- **Real-time events** — Products are CRUD-only, not consumed in real-time by any other module (POS fetches on page load, which is sufficient).
- **Permanent (hard) delete** — Products is a soft-delete collection per `DATABASE.md` §1 conventions. A hard-delete endpoint (`DELETE /products/:id/permanent`) is NOT in scope for this task. If needed, it should mirror the Categories pattern but requires `OrderItem.productId` referential integrity checks first.

## Technical Decisions

| ID | Decision | Rationale |
|---|---|---|
| TD-001 | **Table layout for product list** (not card grid) | Consistency with Categories, Users, and every other admin list — all use tables. Product thumbnails are displayed as a small 48x48 rounded image column. |
| TD-002 | **Dialog-based create/edit form** (not a full page) | Same pattern as Categories. Products has few fields — no benefit from a dedicated page. |
| TD-003 | **Image upload via Shared Uploads endpoint** | `POST /uploads/image` already exists from Task 6. The product form uploads the image first, gets back `{ url, publicId }`, then includes it in the product create/update payload. |
| TD-004 | **Reuse `ImageUpload` shared component** | Already built for Settings (logo). The same component is reused here for product images. |
| TD-005 | **Category dropdown fetches active categories only** | `GET /categories?isActive=true` — deactivated categories are excluded from product assignment but existing references remain intact. |
| TD-006 | **Search by `$regex` on name** (not text index on the list endpoint) | Consistent with how Categories and other modules implement search. The text index on `name` (`DATABASE.md` §3.4) exists for POS consumption (`GET /pos/products?search=`), but the admin list follows the same `$regex` pattern as other admin CRUD lists. |
| TD-007 | **No permanent delete endpoint** | Products is referenced by historical Orders (`OrderItem.productId`). Hard-deleting a product would orphan those references. Soft-delete is sufficient — deactivated products are hidden from active lists and POS. |
| TD-008 | **`price` field uses `inputMode="decimal"`** on mobile | Per `theme.md` §20, money inputs use `inputMode="decimal"` so mobile triggers a numeric keypad. |

## Frontend Impact

### New Files (5)

| File | Purpose |
|---|---|
| `frontend/src/features/products/api.ts` | React Query hooks: `useProductList`, `useProduct`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct` |
| `frontend/src/features/products/schema.ts` | Zod schemas for create/edit forms |
| `frontend/src/features/products/components/ProductList.tsx` | Table with search, category filter, status filter, pagination |
| `frontend/src/features/products/components/ProductForm.tsx` | Dialog form: name, price, category, image, description |
| `frontend/src/features/products/components/DeleteProductDialog.tsx` | Confirmation dialog for soft-delete |

### Modified Files (1)

| File | Change |
|---|---|
| `frontend/src/app/(dashboard)/products/page.tsx` | Replace placeholder with real page that renders `ProductList`, `ProductForm`, `DeleteProductDialog` |

### Theme Token Mapping

Every visual decision maps to `theme.md` tokens — no new tokens are invented:

| Element | theme.md Reference | Implementation |
|---|---|---|
| Table wrapper | §13 DataTable — `rounded-xl border border-slate-200 overflow-x-auto` | Match `CategoryList.tsx` |
| Table header | §13 — `bg-slate-50 border-b border-slate-200` `text-xs font-semibold uppercase tracking-wider text-slate-500` | Match `CategoryList.tsx` |
| Table body | §13 — `divide-y divide-slate-100`, `.table-row-hover` | Match `CategoryList.tsx` |
| Data cell | §13 — `px-4 py-3 text-slate-700 whitespace-nowrap` | Match `CategoryList.tsx` |
| Thumbnail | §4 — `rounded-xl` (12px) | 48x48 rounded image |
| Image placeholder | — | `ImageOff` icon from lucide-react in `text-slate-300` |
| Status badge (active) | §12 — green variant: `green-100` bg, `green-700` text, `green-500` dot | Green dot for active (same as Categories) |
| Status badge (inactive) | §12 — slate variant: `slate-100` bg, `slate-600` text, `slate-400` dot; row dimmed `opacity-60` | "Deactivated" badge (same as Categories) |
| Search input | §13 Input — `rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm` | Match `CategoryList.tsx` |
| Filter select | §13 Input/Select — same input styling | Match `CategoryList.tsx` |
| Dialog | §13 Dialog — `rounded-2xl shadow-2xl`, `.modal-enter` animation, header/body/footer layout | Match `CategoryForm.tsx` |
| Form input | §13 Input — `rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm` | Match `CategoryForm.tsx` |
| Form label | §13 Input — `text-sm font-medium text-slate-700` | Match `CategoryForm.tsx` |
| Error message | §13 Input — `text-xs text-red-500` | Match `CategoryForm.tsx` |
| Primary button | §13 Button — primary variant: `--primary` bg, white text, `shadow-blue-500/25` | Use `Button` component |
| Warning button | §13 Button — warning variant: `--warning` bg, white text, `shadow-amber-500/25` | For "Deactivate" action |
| Destructive button | §13 Button — destructive variant: `--destructive` bg, white text, `shadow-red-500/25` | For delete confirmation |
| Ghost button | §13 Button — ghost variant: transparent bg, `slate-600` text | For "Cancel" |
| Page heading | §3 Typography — `text-2xl font-bold text-slate-800` | Match Categories page |
| Page subtitle | §3 — `text-sm text-slate-500` | Match Categories page |
| Loading state | §18 — spinner: `w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin` | Also skeleton rows with `animate-pulse` |
| Empty state | §13 DataTable — `px-4 py-12 text-center text-slate-400` | "No products yet" |
| Error state | §13 DataTable — `px-4 py-12 text-center text-red-500` | "Failed to load products" |
| Pagination | — | Same controls as Categories (ChevronLeft/ChevronRight, page info) |
| Mobile degradation | §13 DataTable — `<480px` row → stacked card | Handled by existing shared table styles |

### State Management

| State | Tool | Details |
|---|---|---|
| Product list data | React Query (useQuery) | Key: `['products', 'list', params]` |
| Single product data | React Query (useQuery) | Key: `['products', 'detail', id]`, `enabled: !!id` |
| Create/Update/Delete mutations | React Query (useMutation) | Invalidate `['products']` on success |
| Dialog open/close | React useState | Owned by page component |
| Search text + debounce | React useState + useEffect | 300ms debounce, owned by ProductList |
| Status filter | React useState | Owned by ProductList |
| Pagination page | React useState | Owned by ProductList |

## Backend Impact

### New Files (5)

| File | Purpose |
|---|---|
| `backend/src/models/Product.ts` | Mongoose schema + IProduct interface |
| `backend/src/modules/products/products.validation.ts` | Zod schemas: create, update, list, param |
| `backend/src/modules/products/products.service.ts` | Business logic: CRUD, soft-delete, search, category filter |
| `backend/src/modules/products/products.controller.ts` | Request handlers (thin layer, delegates to service) |
| `backend/src/modules/products/products.routes.ts` | Route definitions with middleware chain |

### Modified Files (1)

| File | Change |
|---|---|
| `backend/src/app.ts` | Register products routes: `import` + `app.use('/api/v1', productsRoutes)` |

### Rate Limiting

- No specific rate limiter needed for Products CRUD — admins/managers are authenticated users, not public endpoints.
- Standard `activityLogger` middleware applies automatically (mounted globally at `/api/v1`).

### Activity Log Actions

The global `activityLogger` middleware captures these actions for Products:
- `product.created` — on POST
- `product.updated` — on PUT
- `product.deleted` — on DELETE (soft delete)

These are auto-generated by the middleware's module-name derivation; no manual logging needed.

## Database Impact

### New Collection: Product

Schema per `DATABASE.md` §3.4:

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | |
| `price` | Number | yes | — | Must be positive, `.multipleOf(0.01)` |
| `categoryId` | ObjectId (ref: Category) | yes | — | Must reference an existing category |
| `image` | `{ url: String, publicId: String }` | no | — | Cloudinary; `publicId` needed for delete/replace |
| `description` | String | no | — | |
| `isActive` | Boolean | yes | `true` | Doubles as availability toggle |
| `createdAt` | Date | auto | — | Via `timestamps: true` |
| `updatedAt` | Date | auto | — | Via `timestamps: true` |

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| `categoryId` | `{ categoryId: 1 }` | Filter products by category |
| `isActive` | `{ isActive: 1 }` | Filter active/inactive |
| Text index | `{ name: 'text' }` | POS product search (per `API.md` §9.1), admin list search |

### Integrity Rules

- `categoryId` must reference an existing `Category` document. Service layer validates this on create/update.
- Soft-delete (`isActive: false`) never cascades to historical Orders — `OrderItem.productId` continues to point to the (now-inactive) Product document.
- `price` is the **current sell price only**. Historical order values use `OrderItem.priceSnapshot` — never recomputed from this live field. This is enforced by the POS order-creation service, not by the Product service.

## API Impact

### New Endpoints

All under `/api/v1` base path. Permission module key: `products`.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/products?categoryId=&isActive=&search=&page=&limit=` | `view` | Admin product list (full payload) |
| GET | `/products/:id` | `view` | Product detail |
| POST | `/products` | `create` | Create product |
| PUT | `/products/:id` | `edit` | Edit product (including `isActive` toggle for restore) |
| DELETE | `/products/:id` | `delete` | Soft delete (sets `isActive: false`) |

### Request/Response Contracts

#### `GET /products`

Query params: `categoryId` (optional string), `isActive` (optional "true"|"false"), `search` (optional string), `page` (optional number, default 1), `limit` (optional number, default 20, max 100).

Response:
```json
{
  "data": [
    {
      "id": "...",
      "name": "Chicken Fry",
      "price": 220,
      "categoryId": "...",
      "categoryName": "Main Course",
      "image": { "url": "https://res.cloudinary.com/...", "publicId": "products/chicken-fry" },
      "description": "Crispy fried chicken, served with mint chutney",
      "isActive": true,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

#### `GET /products/:id`

Response:
```json
{ "data": { "id": "...", "name": "Chicken Fry", ... } }
```

Errors: `404 NOT_FOUND` if product doesn't exist.

#### `POST /products`

Request:
```json
{
  "name": "Chicken Fry",
  "price": 220,
  "categoryId": "...",
  "image": { "url": "https://res.cloudinary.com/...", "publicId": "products/chicken-fry" },
  "description": "Crispy fried chicken, served with mint chutney"
}
```

Response `201` with the created product object.

Errors: `400 VALIDATION_ERROR` (Zod), `400 INVALID_CATEGORY` (categoryId doesn't exist).

#### `PUT /products/:id`

Request (all fields optional):
```json
{
  "name": "Chicken Fry (Updated)",
  "price": 250,
  "categoryId": "...",
  "image": { "url": "https://res.cloudinary.com/...", "publicId": "products/chicken-fry" },
  "description": "Updated description",
  "isActive": true
}
```

Response `200` with the updated product object.

Errors: `404 NOT_FOUND`, `400 VALIDATION_ERROR`, `400 INVALID_CATEGORY`.

#### `DELETE /products/:id`

Response `200`: `{ "data": { "success": true } }`.

Errors: `404 NOT_FOUND`.

### Error Codes

| Code | HTTP | When |
|---|---|---|
| `NOT_FOUND` | 404 | Product not found by ID |
| `VALIDATION_ERROR` | 400 | Zod schema rejection |
| `INVALID_CATEGORY` | 400 | CategoryId references a non-existent or deactivated category |

## Authentication & Authorization

| Concern | Implementation |
|---|---|
| **Authentication** | All 5 endpoints require `Authorization: Bearer <token>` via `authenticate` middleware. |
| **Authorization** | Each endpoint uses `authorize('products', action)` — action per the table in "API Impact" above. |
| **Admin bypass** | Admin role bypasses all permission checks per `authorize` middleware. |
| **Default-deny** | If `products` module is absent from a user's `permissions` array, all actions return `403 FORBIDDEN`. |
| **Permission module key** | `products` with actions `['view', 'create', 'edit', 'delete']` — already registered in both `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`. |

## Security Requirements

| Requirement | Implementation |
|---|---|
| **Input validation** | Every mutating endpoint validated by Zod schema via `validate` middleware before reaching controller. |
| **Money precision** | `price` validated with `.multipleOf(0.01)` to prevent rounding errors (per `DATABASE.md` §1). |
| **Category existence** | `categoryId` validated against the `Category` collection at the service layer — not just Zod (which sees it as a string). |
| **No raw Mongo queries** | All queries use Mongoose query builders (`find`, `findById`, `findByIdAndUpdate`, etc.) — never string-interpolated queries. |
| **No sensitive data exposure** | Product model has no sensitive fields (no passwords, no secrets). Standard response mapping via `toProductResponse()` ensures no extra fields leak. |
| **Activity logging** | All mutating routes are automatically logged by the global `activityLogger` middleware. |

## Edge Cases

| ID | Edge Case | Handling |
|---|---|---|
| EC-001 | **Create product with deactivated category** | Service validates `categoryId` exists AND `isActive = true`. If category is inactive, throw `400 INVALID_CATEGORY`. |
| EC-002 | **Create product with non-existent categoryId** | Service queries `Category.findById(id)`. If null, throw `400 INVALID_CATEGORY`. |
| EC-003 | **Update product to move it to a deactivated category** | Same validation as EC-001/EC-002. |
| EC-004 | **Reactivate a soft-deleted product** | `PUT /products/:id` with `{ "isActive": true }` — same endpoint, no separate restore route needed. Service handles this via `$set`. |
| EC-005 | **Search with no results** | Returns `{ data: [], meta: { total: 0, page: 1, limit: 20 } }`. Frontend shows empty state. |
| EC-006 | **Category filter with no matching products** | Same as EC-005. |
| EC-007 | **Product name with leading/trailing whitespace** | Zod `.trim()` on `name` field (same as Categories). |
| EC-008 | **Price with more than 2 decimal places** | Zod `.multipleOf(0.01)` rejects. |
| EC-009 | **Negative price** | Zod `.positive()` rejects. |
| EC-010 | **Zero price** | Zod `.positive()` rejects — price must be > 0. |
| EC-011 | **Null/undefined categoryId** | Zod requires `categoryId` as a non-empty string on create. |
| EC-012 | **Image upload then create product — network failure between the two** | Image remains in Cloudinary (orphaned). Product create fails, user retries. This is acceptable — Cloudinary orphan cleanup is a future concern. The product form flow (upload first, then create) makes this unlikely in normal use. |
| EC-013 | **Edit product image — remove old image, upload new one** | The frontend `ImageUpload` component handles replace/remove. The old Cloudinary asset is not deleted in v1 (no public delete endpoint exists). This matches the Settings logo behavior. |
| EC-014 | **Page number beyond total pages** | Service returns empty `data` array with correct `meta` (`total: 0` for that page, but actual total unchanged). Frontend pagination controls prevent navigating beyond `Math.ceil(total/limit)` pages. |
| EC-015 | **Concurrent duplicate product name** | Service doesn't enforce uniqueness on `name` (unlike Categories). Products can have the same name. No race condition to handle. |
| EC-016 | **Soft-deleted product referenced by existing Orders** | `DATABASE.md` §5.5 ensures soft-deletes never cascade. `OrderItem.productId` continues to point to the inactive product. Historical reports remain accurate. |

## Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-001 | **Image upload flow is two-step (upload first, then create product)** | Medium | Medium — if user uploads image then navigates away, orphaned Cloudinary assets accumulate over time | Documented as acceptable (EC-012). Future task could add a cleanup cron. For v1, the form flow guides users to complete product creation after upload. |
| R-002 | **Category service already has TODO stubs referencing `Product.countDocuments`** | Low | Low — those stubs are for the *Categories* module's permanent-delete guard, not for Products | The TODO in `categories.service.ts` (`permanentDeleteCategory`) becomes implementable once Product model exists. This is a positive dependency fulfillment, not a risk. |
| R-003 | **Product list performance with large catalog** | Low (v1) | Medium — no pagination for category dropdown (all active categories loaded at once). If 500+ categories exist, dropdown becomes sluggish. | Unlikely for a single restaurant. If it becomes an issue, add server-side search to the category dropdown. |

## Doc Updates Required

This feature resolves no open items from `API.md` §25, `DATABASE.md` §8, or `AI_rules.md` §13. The Products feature is straightforward CRUD with no open questions that need upstream doc edits.

However, there is one downstream effect: the `Category` service's `permanentDeleteCategory` function contains a TODO that references `Product.countDocuments`. This TODO can now be implemented:

**File:** `backend/src/modules/categories/categories.service.ts` (line ~132-136)

Old:
```ts
// TODO: Block hard-delete if any Product references this category.
// Add check once Product model exists:
//   const productCount = await Product.countDocuments({ categoryId: id, isActive: true });
//   if (productCount > 0) {
//     throw createError(409, 'CATEGORY_IN_USE', 'Cannot delete category referenced by active products');
//   }
```

New:
```ts
const productCount = await Product.countDocuments({ categoryId: id, isActive: true });
if (productCount > 0) {
  throw createError(409, 'CATEGORY_IN_USE', 'Cannot delete category referenced by active products');
}
```

**Note:** This edit is part of the Categories module, not Products. It is a consequence of implementing the Product model. The implementer should check whether `Product` is already imported in `categories.service.ts` and add the import if needed.

## Implementation Order

The build sequence is dependency-ordered: backend foundation before frontend, model before service, service before controller, controller before routes.

```
Step 1: Product Model (backend/src/models/Product.ts)
Step 2: Validation Schemas (backend/src/modules/products/products.validation.ts)
Step 3: Service (backend/src/modules/products/products.service.ts)
Step 4: Controller (backend/src/modules/products/products.controller.ts)
Step 5: Routes (backend/src/modules/products/products.routes.ts)
Step 6: Module Registration (backend/src/app.ts)
Step 7: Category Service Update (implement Product.countDocuments TODO)
Step 8: Backend Verification (compile, typecheck, manual endpoint test)
Step 9: Frontend Schema (frontend/src/features/products/schema.ts)
Step 10: Frontend API (frontend/src/features/products/api.ts)
Step 11: Frontend Components (ProductList, ProductForm, DeleteProductDialog)
Step 12: Products Page (frontend/src/app/(dashboard)/products/page.tsx)
Step 13: Frontend Verification (compile, lint, manual UI test)
Step 14: End-to-End Verification (full CRUD flow)
```

## Task Breakdown

### Task 1: Create Product Model

**Description:** Create the Mongoose schema and model for the `Product` collection, matching `DATABASE.md` §3.4 exactly.

**Files to create:** `backend/src/models/Product.ts`

**Acceptance Criteria:**
- Schema has fields: `name` (String, required), `price` (Number, required), `categoryId` (ObjectId, ref 'Category', required), `image` (`{ url: String, publicId: String }`, optional), `description` (String, optional), `isActive` (Boolean, default true)
- Schema has `{ timestamps: true, toJSON: { versionKey: false } }`
- Indexes: `categoryId`, `isActive`, text index on `name`
- Exports `IProduct` interface extending `Document`
- Exports `Product` model as default
- Matches `Category.ts` pattern exactly

---

### Task 2: Create Validation Schemas

**Description:** Create Zod validation schemas for all Products endpoints.

**Files to create:** `backend/src/modules/products/products.validation.ts`

**Acceptance Criteria:**
- `createProductSchema`: `name` (string, min 1, trim), `price` (number, positive, multipleOf(0.01)), `categoryId` (string, min 1), `image` (optional `{ url: string, publicId: string }`), `description` (optional string, trim). Uses `.strict()`.
- `updateProductSchema`: Same shape as create but all fields optional. Uses `.strict()`.
- `listProductsSchema`: `page` (coerce, int, positive, default 1), `limit` (coerce, int, positive, max 100, default 20), `categoryId` (optional string), `isActive` (optional enum 'true'|'false'), `search` (optional string, max 100).
- `productIdParam`: `{ id: z.string().min(1) }`
- All inferred types exported: `CreateProductDto`, `UpdateProductDto`, `ListProductsDto`

---

### Task 3: Create Product Service

**Description:** Implement all business logic for Products CRUD.

**Files to create:** `backend/src/modules/products/products.service.ts`

**Acceptance Criteria:**
- `toProductResponse()` mapper: transforms Mongoose doc → API response shape (id as string, populated categoryName, dates as ISO strings)
- `listProducts(query)`: builds filter from `categoryId`, `isActive`, `search` (`$regex` on name, case-insensitive); parallel `find` + `countDocuments`; paginates with `skip = (page-1) * limit`; sorts by `createdAt: -1`; populates `categoryId` with `name`; returns `{ data, meta }`
- `getProductById(id)`: `findById` with category populate; throws `404 NOT_FOUND` if null
- `createProduct(dto)`: validates `categoryId` exists and is active (`Category.findById`) → throw `400 INVALID_CATEGORY` if not; creates via `Product.create`; returns created product
- `updateProduct(id, dto)`: finds existing (404 if null); if `categoryId` changed, validates it; builds `updates` object; `findByIdAndUpdate` with `{ $set: updates, new: true, runValidators: true }`
- `deleteProduct(id)`: `findByIdAndUpdate` with `{ $set: { isActive: false } }`; throws `404 NOT_FOUND` if null; returns `{ success: true }`
- Uses `createError(statusCode, code, message)` for all error conditions

---

### Task 4: Create Product Controller

**Description:** Create thin request handlers that delegate to the Product service.

**Files to create:** `backend/src/modules/products/products.controller.ts`

**Acceptance Criteria:**
- `handleListProducts`: extracts query params, calls `listProducts`, returns `200` with result
- `handleGetProduct`: extracts `req.params.id`, calls `getProductById`, returns `200` with `{ data: product }`
- `handleCreateProduct`: extracts `req.body`, calls `createProduct`, returns `201` with `{ data: product }`
- `handleUpdateProduct`: extracts `req.params.id` + `req.body`, calls `updateProduct`, returns `200` with `{ data: product }`
- `handleDeleteProduct`: extracts `req.params.id`, calls `deleteProduct`, returns `200` with `{ data: result }`
- All handlers are `async (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>`
- All handlers use `try/catch` with `next(error)`
- Imports service as `import * as productService from './products.service'`

---

### Task 5: Create Product Routes

**Description:** Define route definitions with middleware chain.

**Files to create:** `backend/src/modules/products/products.routes.ts`

**Acceptance Criteria:**
- Creates `Router()` and exports it as default
- Route chain: `authenticate → authorize('products', action) → validate(schema, source) → handler`
- Routes defined:
  - `GET /products` → `authorize('products', 'view')` + `validate(listProductsSchema, 'query')`
  - `GET /products/:id` → `authorize('products', 'view')` + `validate(productIdParam, 'params')`
  - `POST /products` → `authorize('products', 'create')` + `validate(createProductSchema)`
  - `PUT /products/:id` → `authorize('products', 'edit')` + `validate(updateProductSchema)`
  - `DELETE /products/:id` → `authorize('products', 'delete')` + `validate(productIdParam, 'params')`
- No permanent-delete route (out of scope)

---

### Task 6: Register Products Module in App

**Description:** Wire the products routes into the Express app.

**Files to modify:** `backend/src/app.ts`

**Acceptance Criteria:**
- `import productsRoutes from './modules/products/products.routes'` added
- `app.use('/api/v1', productsRoutes)` added (after categoriesRoutes, before errorHandler)
- No rate limiter needed for products routes (authenticated only)
- `tsc --noEmit` passes

---

### Task 7: Update Category Service TODO

**Description:** Implement the `Product.countDocuments` check in the Categories permanent-delete function that was left as a TODO.

**Files to modify:** `backend/src/modules/categories/categories.service.ts`

**Acceptance Criteria:**
- Import `Product` at the top of the file
- Replace the TODO block in `permanentDeleteCategory` with real `Product.countDocuments({ categoryId: id, isActive: true })` check
- If product count > 0, throw `createError(409, 'CATEGORY_IN_USE', 'Cannot delete category referenced by active products')`
- Update the `productCount` field in `toCategoryResponse` to use real `Product.countDocuments({ categoryId: category._id })` instead of the hardcoded `0`

---

### Task 8: Backend Verification

**Description:** Verify the backend compiles, typechecks, and endpoints work.

**Acceptance Criteria:**
- `tsc --noEmit` passes in `backend/` directory
- Server starts without errors
- All 5 endpoints return correct status codes and shapes
- Create product with valid data → `201` with product object
- Create product with invalid data → `400 VALIDATION_ERROR`
- Create product with non-existent categoryId → `400 INVALID_CATEGORY`
- List products returns `{ data, meta }` structure
- List products with `?isActive=false` shows deactivated products
- Search by name works via `$regex`
- Soft-delete sets `isActive: false`
- Reactivated product via PUT with `{ isActive: true }` works
- Deleted product returns `404` on `GET /products/:id` (if list defaults to `isActive: true` only — confirm behavior)
- Unauthenticated request returns `401 UNAUTHORIZED`
- Unauthorized role (no `products` permission) returns `403 FORBIDDEN`

---

### Task 9: Create Frontend Zod Schemas

**Description:** Create Zod schemas for the product form validation on the frontend.

**Files to create:** `frontend/src/features/products/schema.ts`

**Acceptance Criteria:**
- `createProductSchema`: `name` (string, min 1, "Name is required"), `price` (number, positive, "Price must be positive"), `categoryId` (string, min 1, "Category is required"), `image` (optional `{ url: string, publicId: string }`), `description` (optional string)
- `updateProductSchema`: Same shape, all optional except those required (match backend's update schema)
- Both exported as inferable types: `CreateProductFormData`, `UpdateProductFormData`

---

### Task 10: Create Frontend API Layer

**Description:** Create React Query hooks for Products CRUD.

**Files to create:** `frontend/src/features/products/api.ts`

**Acceptance Criteria:**
- `'use client'` directive at top
- `ProductResponse` interface: `id`, `name`, `price`, `categoryId`, `categoryName`, `image` (nullable), `description` (nullable), `isActive`, `createdAt`, `updatedAt`
- `useProductList(params)` → `useQuery` with key `['products', 'list', qs]`, builds query string from `page`, `limit`, `isActive`, `categoryId`, `search` params
- `useProduct(id)` → `useQuery` with key `['products', 'detail', id]`, `enabled: !!id`
- `useCreateProduct()` → `useMutation`, invalidates `['products']` on success
- `useUpdateProduct()` → `useMutation`, invalidates `['products']` on success
- `useDeleteProduct()` → `useMutation`, invalidates `['products']` on success
- All mutations use `mutationFn` that calls `apiClient` with appropriate method and body

---

### Task 11: Create Frontend Components

**Description:** Create the three product UI components: list, form, and delete dialog.

**Files to create:**
- `frontend/src/features/products/components/ProductList.tsx`
- `frontend/src/features/products/components/ProductForm.tsx`
- `frontend/src/features/products/components/DeleteProductDialog.tsx`

#### `ProductList.tsx` Acceptance Criteria:
- Props: `onEdit: (product: ProductResponse) => void`, `onDelete: (product: ProductResponse) => void`
- Local state: search (debounced 300ms), status filter (all/active/inactive), category filter, pagination page
- Search input with magnifying glass icon (left inset)
- Status filter dropdown: "All", "Active", "Deactivated"
- Category filter dropdown: fetches categories via existing `useCategoriesList` or a dedicated small query
- Table columns: Image (48x48 rounded thumbnail, `ImageOff` placeholder if no image), Name, Price (formatted with 2 decimals), Category, Status (green dot for active, "Deactivated" badge for inactive), Actions (Edit icon button + Deactivate/Reactivate button)
- Loading state: skeleton rows
- Empty state: "No products found. Create one to get started." (with create CTA if user has create permission)
- Error state: error message with retry
- Pagination controls at bottom (same pattern as CategoryList)
- Inactive rows have `opacity-60` (same as CategoryList)

#### `ProductForm.tsx` Acceptance Criteria:
- Props: `open: boolean`, `product: ProductResponse | null`, `onClose: () => void`
- Uses `react-hook-form` with `zodResolver(schema)` — dynamic schema based on isEdit
- Fields:
  - **Image**: Uses `ImageUpload` shared component from `@/components/shared/` — uploads via `uploadFile`, returns `{ url, publicId }`, stored in form state
  - **Name**: Text input
  - **Price**: Number input with `step="0.01"` and `inputMode="decimal"`
  - **Category**: Select dropdown populated from `useCategoriesList({ isActive: 'true' })` — shows category names, value is category ID
  - **Description**: Textarea (optional)
- `useEffect` to `reset()` form when `open` or `product` changes
- Renders inside `<Dialog>` with title "Create Product" / "Edit Product"
- Footer: Cancel (ghost) + Save/Create (primary)
- Error handling for `AppError` — shown as inline error banner inside dialog
- Submit calls `useCreateProduct` or `useUpdateProduct`

#### `DeleteProductDialog.tsx` Acceptance Criteria:
- Props: `product: ProductResponse`, `onClose: () => void`
- Confirmation text: "Are you sure you want to deactivate {product.name}?"
- Product info card: name, price, category, current status badge
- Info text: "This product will be soft-deleted and hidden from active lists. You can reactivate it later."
- Confirm button: "Deactivate" (warning variant), loading state during mutation
- Cancel button: ghost variant
- Error handling for `AppError`

---

### Task 12: Create Products Page

**Description:** Create the dashboard page for Products that wires the components together.

**Files to modify:** `frontend/src/app/(dashboard)/products/page.tsx`

**Acceptance Criteria:**
- `'use client'` directive
- `<PermissionGate module="products" action="view">` wraps the entire page content
- Page heading: "Products" (`text-2xl font-bold text-slate-800`) with subtitle "Manage your product catalog"
- "Create Product" button in header, wrapped in `<PermissionGate module="products" action="create">`
- Local state: `isCreateOpen` (boolean), `editingProduct` (ProductResponse | null), `deletingProduct` (ProductResponse | null)
- Renders:
  - `<ProductList onEdit={setEditingProduct} onDelete={setDeletingProduct} />`
  - `<ProductForm open={isCreateOpen} category={null} onClose={() => setCreateOpen(false)} />`
  - `<ProductForm open={!!editingProduct} category={editingProduct} onClose={() => setEditingProduct(null)} />`
  - `<DeleteProductDialog product={deletingProduct} onClose={() => setDeletingProduct(null)} />`
- Follows exact pattern of `categories/page.tsx`

---

### Task 13: Frontend Verification

**Description:** Verify the frontend compiles, typechecks, and renders correctly.

**Acceptance Criteria:**
- `tsc --noEmit` passes in `frontend/` directory
- `npm run lint` passes (or equivalent)
- Products page renders in the dashboard sidebar navigation
- Products page shows "No products yet" empty state when no products exist
- Create Product dialog opens and shows all fields
- Form validation works: empty name → error, negative price → error, no category → error
- Image upload component appears and functions
- Product list shows products after creation
- Edit product dialog pre-populates with existing values
- Soft-delete deactivates product, row shows as dimmed with "Deactivated" badge
- Reactivate button works

---

### Task 14: End-to-End Verification

**Description:** Verify the full CRUD flow works from frontend to backend.

**Acceptance Criteria:**
- `npm run dev` for both frontend and backend
- Log in as admin
- Navigate to Products page via sidebar
- Create a product with all fields including image → appears in list
- Create a product with minimal fields (name, price, category) → appears in list
- Edit a product → changes reflected in list
- Soft-delete a product → disappears from active list, shows in inactive filter
- Reactivate a deactivated product → appears back in active list
- Search by name → filters correctly
- Filter by category → filters correctly
- Filter by active/inactive → filters correctly
- Pagination works when >20 products exist
- Log in as a user without `products` permission → Products page shows "no permission" fallback

## Final Approved Decisions

| ID | Decision |
|---|---|
| AD-001 | Product list uses **table layout** (not card grid). Thumbnail is a 48x48 rounded image column. |
| AD-002 | Create/edit form is **dialog-based** (same pattern as Categories), not a full page. |
| AD-003 | Image upload uses the existing **Shared Uploads** endpoint (`POST /uploads/image`) and reuses the **`ImageUpload`** component. |
| AD-004 | Category dropdown fetches **active categories only** (`GET /categories?isActive=true`). |
| AD-005 | Admin list search uses **`$regex` on name** (case-insensitive), same as Categories. The text index is for POS. |
| AD-006 | **No permanent delete endpoint** for Products. Soft-delete is sufficient. |
| AD-007 | **No separate restore endpoint** — re-enabling uses the same `PUT /products/:id` with `isActive: true`. |
| AD-008 | **No real-time events** for Products CRUD. |
| AD-009 | **Price field** validates with `.multipleOf(0.01)` (2 decimal places) and `.positive()` (>0). `inputMode="decimal"` on mobile. |
| AD-010 | **No uniqueness constraint on `name`** — multiple products can share a name (unlike Categories). |
| AD-011 | The **Category service's `productCount` TODO** can now be implemented using the real `Product.countDocuments` query. |
| AD-012 | **Dialogs follow the existing shadcn/ui `Dialog` pattern** with `title`, `size`, `footer` props as used by `CategoryForm.tsx`/`DeleteCategoryDialog.tsx`. |
| AD-013 | **Status badge for active uses the green dot** (same as Categories active). **Inactive uses "Deactivated" slate badge** with row `opacity-60`. |
| AD-014 | **No new error codes** beyond `NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_CATEGORY` — all are already in `API.md` §23 or are natural extensions of existing codes. `INVALID_CATEGORY` maps to `400` with a specific message, not a unique error code (consistent with how Categories handles duplicate names). |
