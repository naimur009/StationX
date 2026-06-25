# Current Task — Customers

**PRD Feature 17** | `API.md` §18 | `DATABASE.md` §3.6
**Depends on:** Users & Permissions (Task 3)
**Why before POS:** POS checkout can optionally attach/search/create a customer inline.
**Permission module key:** `customers` — already registered in `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`
**Sidebar link:** Already exists at `/customers` with `Users` icon

---

## Backend (`backend/src/modules/customers/` — 4 new files)

### Customer Model — `backend/src/models/Customer.ts`

Follow `Category.ts` pattern. Fields per `DATABASE.md` §3.6:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | yes | |
| `phone` | String | yes | NOT unique (walk-ins sharing a line, data-entry dupes), indexed |
| `email` | String | no | |
| `address` | String | no | |
| `isActive` | Boolean | yes (default `true`) | soft delete |

**Indexes:** `phone` (non-unique), text index on `name`.

- Default export `Customer` model.
- Export `ICustomer` interface extending `Document`.
- Schema options: `{ timestamps: true, toJSON: { versionKey: false } }`.

### Validation — `customers.validation.ts`

- `createCustomerSchema`: `name` (string, min 1, max 100, trim), `phone` (string, min 1, max 20, trim), `email` (optional string, email format), `address` (optional string, max 500, trim). Use `.strict()`.
- `updateCustomerSchema`: Same shape but all fields optional.
- `listCustomersSchema`: `search` (optional string, max 100), `isActive` (optional boolean, coerce), `page` (optional number, coerce, default 1), `limit` (optional number, coerce, default 20, max 100).
- `customerIdParam`: `{ id: string }`.
- `saveOrFindCustomerSchema`: `phone` (string, min 1, max 20, trim), `name` (optional string), `email` (optional string, email), `address` (optional string).
- Export inferred DTO types.

### Service — `customers.service.ts`

- Import `Customer`, `ICustomer`.
- **List:** `Customer.find(filter).sort({ createdAt: -1 }).skip().limit()` with parallel `Customer.countDocuments(filter)`. `filter` built from `search` (regex on name or phone), `isActive`. Return `{ data, meta: { total, page, limit } }`.
- **Get by ID:** `Customer.findById(id)`, throw `404 NOT_FOUND` if null.
- **Create:** `Customer.create(data)`.
- **Update:** `Customer.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })`. Throw `404` if null.
- **Delete:** Soft delete — `Customer.findByIdAndUpdate(id, { $set: { isActive: false } })`. Throw `404` if null.
- **Save or find (POS):** Look up by `phone` only. If found, return existing customer. If not found, create with provided data and return new customer. Never duplicates.

### Controller — `customers.controller.ts`

- Named exports: `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer`, `saveOrFindCustomer`.
- Pattern: extract from `req.query` / `req.params` / `req.body`, call service, `res.status(200|201).json({ data: result })`, `try/catch/next`.
- Use `import * as customerService from './customers.service'`.

### Routes — `customers.routes.ts`

```
GET    /customers                -> authenticate, authorize('customers', 'view'), validate(listCustomersSchema, 'query'), listCustomers
GET    /customers/:id            -> authenticate, authorize('customers', 'view'), validate(customerIdParam, 'params'), getCustomer
POST   /customers                -> authenticate, authorize('customers', 'create'), validate(createCustomerSchema), createCustomer
POST   /customers/save-or-find   -> authenticate, authorize('customers', 'create'), validate(saveOrFindCustomerSchema), saveOrFindCustomer
PUT    /customers/:id            -> authenticate, authorize('customers', 'edit'), validate(customerIdParam, 'params'), validate(updateCustomerSchema), updateCustomer
DELETE /customers/:id            -> authenticate, authorize('customers', 'delete'), validate(customerIdParam, 'params'), deleteCustomer
```

- `saveOrFindCustomer` must be registered **before** `GET /customers/:id` to avoid `:id` matching the literal "save-or-find".
- Export default router.

### Module Registration — `backend/src/app.ts`

- Add `import customersRoutes from './modules/customers/customers.routes';`
- Mount: `app.use('/api/v1', customersRoutes);` (after coupons routes, before the catch-all).

---

## Frontend (`frontend/src/features/customers/` — api.ts, schema.ts, components/CustomerList.tsx, components/CustomerForm.tsx + page)

### Schema — `schema.ts`

- `createCustomerSchema`: `name` (min 1, max 100, trim), `phone` (min 1, max 20, trim), `email` (optional, email format), `address` (optional, max 500, trim).
- `updateCustomerSchema`: Same but all optional.
- Export `CreateCustomerFormData`, `UpdateCustomerFormData` types.

### API — `api.ts`

- `'use client'` at top.
- `useCustomerList(params)`: `useQuery` with key `['customers', 'list', params]`.
- `useCustomer(id)`: `useQuery` with key `['customers', 'detail', id]`, `enabled: !!id`.
- `useCreateCustomer()`: `useMutation`, invalidates `['customers']` on success.
- `useSaveOrFindCustomer()`: `useMutation`, invalidates `['customers']` on success.
- `useUpdateCustomer()`: `useMutation`, invalidates `['customers']` on success.
- `useDeleteCustomer()`: `useMutation`, invalidates `['customers']` on success.
- Use `apiClient<CustomerResponse | CustomerListResponse>` from `@/lib/api-client`.
- Define `CustomerResponse` interface matching backend shape (id, name, phone, email, address, isActive, createdAt, updatedAt).

### Components

#### `CustomerList.tsx`
- Props: `onEdit: (customer) => void`, `onDelete: (customer) => void`.
- Local state: search (debounced), isActive filter, pagination.
- Use `useCustomerList` with current filters.
- Responsive layout: cards on <md, table on md+ (follow CouponList pattern).
- Table/card columns: Name, Phone, Email, Address, Status (active/inactive badge), Actions (Edit, Delete).
- Loading state: skeleton rows.
- Empty state: "No customers found" with create CTA if has create permission.
- Error state: error message with retry button.
- Follow layout patterns from `CouponList.tsx`.

#### `CustomerForm.tsx`
- Props: `open: boolean`, `customer: CustomerResponse | null`, `onClose: () => void`.
- Uses `react-hook-form` with `zodResolver(customerSchema)`.
- Create mode if `customer` is null, edit mode otherwise.
- Fields: Name (text), Phone (text), Email (email), Address (textarea).
- `useEffect` to `reset()` form when `open` or `customer` changes.
- Renders inside `<Dialog>` with title "Create Customer" / "Edit Customer".
- Submit calls `useCreateCustomer` or `useUpdateCustomer`.
- Error handling for `AppError`.
- Follow pattern from `CategoryForm.tsx` or `CouponForm.tsx`.

### Page — `frontend/src/app/(dashboard)/customers/page.tsx`

- `'use client'`.
- `<PermissionGate module="customers" action="view">`.
- Local state: `isCreateOpen`, `editingCustomer`, `deletingCustomer`.
- "Create Customer" button gated by `<PermissionGate module="customers" action="create">`.
- Renders `<CustomerList>` and conditionally `<CustomerForm>` / delete confirmation.
- Follow the exact pattern of `categories/page.tsx`.

---

## Design

- **Customer list layout:** Responsive — cards on small screens, table on md+. Table columns: Name, Phone, Email, Address, Status badge, Actions. Cards show same fields stacked.
- **Status badge:** Active → green/success, Inactive → slate-600 (matches theme.md §12).
- **Phone field:** Input as plain text (no formatting), stored as-is. Search matches partial phone numbers.
- **Email field:** Optional, email-validated via Zod.
- **Save-or-find endpoint:** Called from POS during checkout. Takes `{ phone, name?, email?, address? }`. Looks up by phone only — if found, returns existing customer (ignores sent name/email/address). If not found, creates with provided data. This is the dedupe mechanism: phone is the lookup key, so the POS simply sends the phone first and the backend either returns the match or creates a new record.

---

## Implementation Notes

### Files to Create

**Backend (5 files):**
1. `backend/src/models/Customer.ts`
2. `backend/src/modules/customers/customers.validation.ts`
3. `backend/src/modules/customers/customers.service.ts`
4. `backend/src/modules/customers/customers.controller.ts`
5. `backend/src/modules/customers/customers.routes.ts`

**Modify:**
- `backend/src/app.ts` — register customers routes

**Frontend (4 files):**
1. `frontend/src/features/customers/api.ts`
2. `frontend/src/features/customers/schema.ts`
3. `frontend/src/features/customers/components/CustomerList.tsx`
4. `frontend/src/features/customers/components/CustomerForm.tsx`

**Modify:**
- `frontend/src/app/(dashboard)/customers/page.tsx` — replace placeholder with real page

### Patterns to Follow

- **Backend:** Match `categories/` module exactly — 4-file pattern, named exports, `createError`, `try/catch/next` in controllers, `import * as service` pattern.
- **Frontend:** Match `categories/` feature exactly — `api.ts` with TanStack Query hooks, `schema.ts` with Zod + inferred types, components in `components/` folder, dialog-based CRUD.
- **Model:** Match `Category.ts` — Mongoose schema with `timestamps: true`, `toJSON: { versionKey: false }`, default export model + named export interface.
- **Page:** Match `categories/page.tsx` — `PermissionGate` wrapper, local state for dialog open/close, conditional rendering of form.

### Already Done (No Changes Needed)
- Permission module key `customers` registered in backend constants
- Permission module key `customers` registered in frontend constants
- Sidebar nav link `/customers` with `Users` icon already exists

### Verification

- `tsc --noEmit` passes clean on both apps
- `npm run dev` — backend starts, frontend loads, customers CRUD works end to end
- All endpoints return correct status codes and shapes per `API.md` §18
- `POST /customers/save-or-find` returns existing customer when phone matches, creates new otherwise
- Soft delete sets `isActive: false`, does not remove document
- Search by name or phone works via text index
- Phone is NOT unique — two customers can share a phone
