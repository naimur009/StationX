# Current Task — Products

**PRD Feature 11** | `API.md` §16 | `DATABASE.md` §3.4
**Depends on:** Categories (Task 5), Shared Uploads (Task 6)
**Permission module key:** `products` — already registered in `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`
**Sidebar link:** Already exists at `/products` with `Package` icon
**Activity logger:** Already registered as `products: 'Product'`

---

## Backend (`backend/src/modules/products/` — 4 new files)

### Product Model — `backend/src/models/Product.ts`

Follow `Category.ts` pattern. Fields per `DATABASE.md` §3.4:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | yes | |
| `price` | Number | yes | Current sell price; historical orders use a snapshot, not this live value |
| `categoryId` | ObjectId → Category | yes | ref: 'Category' |
| `image` | `{ url: String, publicId: String }` | no | Cloudinary; `publicId` needed to delete/replace later |
| `description` | String | no | |
| `isActive` | Boolean | yes (default `true`) | Doubles as the PRD's "availability" toggle |

**Indexes:** `categoryId`, `isActive`, text index on `name`.

- Default export `Product` model.
- Export `IProduct` interface extending `Document`.
- Schema options: `{ timestamps: true, toJSON: { versionKey: false } }`.
- Follow mongoose pattern from `Category.ts`.

### Validation — `products.validation.ts`

- `createProductSchema`: `name` (string, min 1, required), `price` (number, positive, required), `categoryId` (string, min 1), `image` (optional object with `url` string and `publicId` string), `description` (optional string). Use `.strict()`.
- `updateProductSchema`: Same shape but all fields optional.
- `listProductsSchema`: `categoryId` (optional string), `isActive` (optional boolean, coerce), `search` (optional string), `page` (optional number, coerce, default 1), `limit` (optional number, coerce, default 20, max 100).
- `productIdParam`: `{ id: string }`.
- Export inferred DTO types: `CreateProductDto`, `UpdateProductDto`, `ListProductsQuery`.

### Service — `products.service.ts`

- Import `Product`, `ICategory`/`Category` (for checking categoryId validity).
- Local `ProductResponse` interface + private `toProductResponse()` mapper (`_id.toString()`, dates to ISO strings).
- **List:** `Product.find(filter).populate('categoryId', 'name').sort({ createdAt: -1 }).skip().limit()` with parallel `Product.countDocuments()`. `filter` built from `categoryId`, `isActive`, `search` (text search or regex on `name`). Return `{ data, meta: { total, page, limit } }`.
- **Get by ID:** `Product.findById(id).populate('categoryId', 'name')`, throw `404 PRODUCT_NOT_FOUND` if null.
- **Create:** Check categoryId exists (if provided) — throw `400 INVALID_CATEGORY` if not. `Product.create(data)`.
- **Update:** Find doc first (404 if not found). Validate categoryId if changed. `Product.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })`.
- **Soft-delete:** `Product.findByIdAndUpdate(id, { $set: { isActive: false } })`.
- Use `createError(httpStatus, code, message)` from the error handler for all structured errors.

### Controller — `products.controller.ts`

- Named exports: `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`.
- Pattern: extract from `req.query` / `req.params` / `req.body`, call service, `res.status(200|201).json({ data: result })`, `try/catch/next`.
- Use `import * as productService from './products.service'`.

### Routes — `products.routes.ts`

```
GET    /products              -> authenticate, authorize('products', 'view'), validate(listProductsSchema, 'query'), listProducts
GET    /products/:id          -> authenticate, authorize('products', 'view'), validate(productIdParam, 'params'), getProduct
POST   /products              -> authenticate, authorize('products', 'create'), validate(createProductSchema, 'body'), createProduct
PUT    /products/:id          -> authenticate, authorize('products', 'edit'), validate(updateProductSchema, 'body'), validate(productIdParam, 'params'), updateProduct
DELETE /products/:id          -> authenticate, authorize('products', 'delete'), validate(productIdParam, 'params'), deleteProduct
```

- Export default router.
- Import route-level rate limiter if needed (check other modules — likely not needed for generic CRUD).

### Module Registration — `backend/src/app.ts`

- Add `import productsRoutes from './modules/products/products.routes';`
- Mount: `app.use('/api/v1', productsRoutes);` (after categories routes, before the catch-all).

---

## Frontend (`frontend/src/features/products/` — api.ts, schema.ts, components/ProductList.tsx, components/ProductForm.tsx, components/DeleteProductDialog.tsx + page)

### Schema — `schema.ts`

- `createProductSchema`: `name` (min 1), `price` (positive number), `categoryId` (string, min 1), `image` (optional `{ url: string, publicId: string }`), `description` (optional string).
- `updateProductSchema`: Same but all optional.
- Export `CreateProductFormData`, `UpdateProductFormData` types.
- Backend-fields not shown in form (like `isActive`) are handled separately.

### API — `api.ts`

- `'use client'` at top.
- `useProductList(params)`: `useQuery` with key `['products', 'list', params]`.
- `useProduct(id)`: `useQuery` with key `['products', 'detail', id]`, `enabled: !!id`.
- `useCreateProduct()`: `useMutation`, invalidates `['products']` on success.
- `useUpdateProduct()`: `useMutation`, invalidates `['products']` on success.
- `useDeleteProduct()`: `useMutation`, invalidates `['products']` on success.
- Use `apiClient<ProductResponse | ProductListResponse>` from `@/lib/api-client`.
- Define `ProductResponse` interface matching backend shape (id, name, price, categoryId, categoryName, image, description, isActive, createdAt, updatedAt).

### Components

#### `ProductList.tsx`
- Props: `onEdit: (product) => void`, `onDelete: (product) => void`.
- Local state: search (debounced), category filter, active/inactive filter, pagination.
- Use `useProductList` with current filters.
- Table columns: Image (thumbnail), Name, Price, Category, Status (Active/Inactive badge), Actions (Edit, Delete).
- Loading state: skeleton rows.
- Empty state: "No products found" with create CTA if has create permission.
- Error state: error message with retry button.
- Follow layout patterns from `CategoryList.tsx`.

#### `ProductForm.tsx`
- Props: `open: boolean`, `product: ProductResponse | null`, `onClose: () => void`.
- Uses `react-hook-form` with `zodResolver(productSchema)`.
- Create mode if `product` is null, edit mode otherwise.
- Fields: Name (text), Price (number input), Category (select/dropdown — fetches categories via `useCategoryList`), Image (ImageUpload component from shared uploads), Description (textarea).
- `useEffect` to `reset()` form when `open` or `product` changes.
- Renders inside `<Dialog>` with title "Create Product" / "Edit Product".
- Submit calls `useCreateProduct` or `useUpdateProduct`.
- Error handling for `AppError`.

#### `DeleteProductDialog.tsx`
- Props: `product: ProductResponse`, `onClose: () => void`.
- Confirmation dialog: "Are you sure you want to delete {product.name}?" with description "This product will be soft-deleted and hidden from active lists. You can reactivate it later."
- Confirm calls `useDeleteProduct`, shows loading state on button.
- Follow pattern from `DeleteCategoryDialog.tsx`.

### Page — `frontend/src/app/(dashboard)/products/page.tsx`

- `'use client'`.
- `<PermissionGate module="products" action="view">`.
- Local state: `isCreateOpen`, `editingProduct`, `deletingProduct`.
- "Create Product" button gated by `<PermissionGate module="products" action="create">`.
- Renders `<ProductList>` and conditionally `<ProductForm>` / `<DeleteProductDialog>`.
- Follow the exact pattern of `categories/page.tsx`.

---

## Design

- **Product list layout:** Table with columns for thumbnail, name, price, category, status, actions. Thumbnail is a small 48x48 rounded image; products without an image show a placeholder icon (e.g. `ImageOff` from lucide-react in a muted background).
- **Image upload pattern:** Reuse `ImageUpload` shared component from Task 6 (Settings logo already uses it). Accept `jpeg/png/webp`, max 5MB. Show preview. Allow replace and remove.
- **Category selector:** Dropdown fetched from `GET /categories?isActive=true`. Show category name. If no categories exist, show "No categories — create one first" with a link to the categories page.
- **Price field:** Number input with two decimal places. Currency is hardcoded to BDT (tk).
- **Status badge:** "Active" in green/success badge, "Inactive" in gray/neutral badge (matches `theme.md` status-badge conventions already used in Categories, Users).
- **Form:** Dialog/modal (same pattern as CategoryForm — not a full page). Image field near the top since it's visually prominent. Category and Price side by side if space permits.

---

## Implementation Notes

### Files to Create

**Backend (5 files):**
1. `backend/src/models/Product.ts`
2. `backend/src/modules/products/products.validation.ts`
3. `backend/src/modules/products/products.service.ts`
4. `backend/src/modules/products/products.controller.ts`
5. `backend/src/modules/products/products.routes.ts`

**Modify:**
- `backend/src/app.ts` — register products routes

**Frontend (5 files):**
1. `frontend/src/features/products/api.ts`
2. `frontend/src/features/products/schema.ts`
3. `frontend/src/features/products/components/ProductList.tsx`
4. `frontend/src/features/products/components/ProductForm.tsx`
5. `frontend/src/features/products/components/DeleteProductDialog.tsx`

**Modify:**
- `frontend/src/app/(dashboard)/products/page.tsx` — replace placeholder with real page

### Patterns to Follow

- **Backend:** Match `categories/` module exactly — 4-file pattern, named exports, `createError`, `try/catch/next` in controllers, `import * as service` pattern.
- **Frontend:** Match `categories/` feature exactly — `api.ts` with TanStack Query hooks, `schema.ts` with Zod + inferred types, components in `components/` folder, dialog-based CRUD.
- **Model:** Match `Category.ts` — Mongoose schema with `timestamps: true`, `toJSON: { versionKey: false }`, default export model + named export interface.
- **Page:** Match `categories/page.tsx` — `PermissionGate` wrapper, local state for dialog open/close, conditional rendering of form/dialog.

### Already Done (No Changes Needed)
- Permission module key `products` registered in backend constants
- Permission module key `products` registered in frontend constants
- Sidebar nav link `/products` with `Package` icon already exists
- Activity logger mapping `products: 'Product'` already exists
- Category service already has stub references to `Product.countDocuments` for delete-protection checks

### Verification

- `tsc --noEmit` passes clean on both apps
- `npm run dev` — backend starts, frontend loads, products CRUD works end to end
- All endpoints return correct status codes and shapes per `API.md` §16
- Soft-deleted products are hidden from active list, visible when `?isActive=false`
- Image upload → create product with image → edit product image → works
- Category filter works in product list
- Search by name works via text index
- Form validation rejects empty name, negative price, invalid categoryId
