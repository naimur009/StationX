# Current Task — Coupons

**PRD Feature 6** | `API.md` §11 | `DATABASE.md` §3.5
**Depends on:** Users & Permissions (Task 3)
**Why before POS:** POS validate/apply flow depends on Coupons existing first.
**Permission module key:** `coupons` — already registered in `backend/src/shared/constants.ts` and `frontend/src/lib/constants.ts`
**Sidebar link:** Already exists at `/coupons` with `TicketPercent` icon
**Activity logger:** Already registered as `coupons: 'Coupon'`, with toggle route pattern `coupon.toggled`

---

## Backend (`backend/src/modules/coupons/` — 4 new files)

### Coupon Model — `backend/src/models/Coupon.ts`

Follow `Product.ts` pattern. Fields per `DATABASE.md` §3.5:

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | String | yes | unique, uppercase, trimmed |
| `discountType` | String enum `flat \| percentage` | yes | per `ARCHITECTURE.md` §1 |
| `value` | Number | yes | flat amount or percentage (0–100), validated by Zod per discountType |
| `maxDiscountAmount` | Number | no | caps the discount when `discountType: 'percentage'` |
| `minOrderAmount` | Number | no | coupon only applicable above this subtotal |
| `validFrom` | Date | yes | |
| `validUntil` | Date | yes | |
| `isEnabled` | Boolean | yes (default `true`) | manual on/off switch, independent of validity window |
| `usageLimit` | Number | no | total redemptions allowed; omit = unlimited |
| `usageCount` | Number | yes (default `0`) | incremented atomically on each successful order |

**Indexes:** `code` (unique), compound `{ isEnabled: 1, validUntil: 1 }`.

- Default export `Coupon` model.
- Export `ICoupon` interface extending `Document`.
- Schema options: `{ timestamps: true, toJSON: { versionKey: false } }`.
- Follow mongoose pattern from `Product.ts`.

### Validation — `coupons.validation.ts`

- `createCouponSchema`: `code` (string, min 1, max 50, trim, transform uppercase), `discountType` (enum `flat | percentage`), `value` (number, positive, max: discountType === 'flat' ? undefined : 100), `maxDiscountAmount` (optional positive number), `minOrderAmount` (optional non-negative number), `validFrom` (string datetime), `validUntil` (string datetime, must be after validFrom), `usageLimit` (optional positive integer). Use `.strict()`.
- `updateCouponSchema`: Same shape but all fields optional.
- `listCouponsSchema`: `isEnabled` (optional boolean, coerce), `search` (optional string, max 100), `page` (optional number, coerce, default 1), `limit` (optional number, coerce, default 20, max 100).
- `couponIdParam`: `{ id: string }`.
- Export inferred DTO types: `CreateCouponDto`, `UpdateCouponDto`, `ListCouponsDto`.

### Service — `coupons.service.ts`

- Import `Coupon`, `ICoupon`.
- Local `CouponResponse` interface + private `toCouponResponse()` mapper. Response includes a computed `status` field:
  ```
  status: isEnabled && now >= validFrom && now <= validUntil → 'active'
         isEnabled && now < validFrom                     → 'scheduled'
         isEnabled && now > validUntil                    → 'expired'
         !isEnabled                                       → 'disabled'
  ```
- **List:** `Coupon.find(filter).sort({ createdAt: -1 }).skip().limit()` with parallel `Coupon.countDocuments(filter)`. `filter` built from `isEnabled`, `search` (regex on `code`). Return `{ data, meta: { total, page, limit } }`.
- **Get by ID:** `Coupon.findById(id)`, throw `404 NOT_FOUND` if null.
- **Create:** `Coupon.create(data)`. `code` auto-uppercased by validation transform. Check duplicate code — throw `409 COUPON_CODE_EXISTS`.
- **Update:** Find doc first (404 if not found). `Coupon.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })`.
- **Toggle:** `Coupon.findById(id)`, flip `isEnabled`, save. Return updated coupon.
- **Delete:** Check `usageCount > 0` → throw `409 COUPON_IN_USE` with message suggesting toggle instead. Otherwise `Coupon.findByIdAndDelete(id)`.
- Use `createError(httpStatus, code, message)` from the error handler.

### Controller — `coupons.controller.ts`

- Named exports: `listCoupons`, `getCoupon`, `createCoupon`, `updateCoupon`, `toggleCoupon`, `deleteCoupon`.
- Pattern: extract from `req.query` / `req.params` / `req.body`, call service, `res.status(200|201).json({ data: result })`, `try/catch/next`.
- Use `import * as couponService from './coupons.service'`.

### Routes — `coupons.routes.ts`

```
GET    /coupons                -> authenticate, authorize('coupons', 'view'), validate(listCouponsSchema, 'query'), listCoupons
GET    /coupons/:id            -> authenticate, authorize('coupons', 'view'), validate(couponIdParam, 'params'), getCoupon
POST   /coupons                -> authenticate, authorize('coupons', 'create'), validate(createCouponSchema), createCoupon
PUT    /coupons/:id            -> authenticate, authorize('coupons', 'edit'), validate(couponIdParam, 'params'), validate(updateCouponSchema), updateCoupon
PATCH  /coupons/:id/toggle     -> authenticate, authorize('coupons', 'edit'), validate(couponIdParam, 'params'), toggleCoupon
DELETE /coupons/:id            -> authenticate, authorize('coupons', 'delete'), validate(couponIdParam, 'params'), deleteCoupon
```

- Export default router.

### Module Registration — `backend/src/app.ts`

- Add `import couponsRoutes from './modules/coupons/coupons.routes';`
- Mount: `app.use('/api/v1', couponsRoutes);` (after categories routes, before the catch-all).

---

## Frontend (`frontend/src/features/coupons/` — api.ts, schema.ts, components/CouponList.tsx, components/CouponForm.tsx, components/DeleteCouponDialog.tsx + page)

### Schema — `schema.ts`

- `createCouponSchema`: `code` (min 1, max 50, trim, transform uppercase), `discountType` (enum `flat | percentage`), `value` (positive number, max conditional on discountType), `maxDiscountAmount` (optional positive number), `minOrderAmount` (optional non-negative number), `validFrom` (string, date), `validUntil` (string, date), `usageLimit` (optional positive integer). Use `.refine()` to validate `validUntil > validFrom`.
- `updateCouponSchema`: Same but all optional.
- Export `CreateCouponFormData`, `UpdateCouponFormData` types.

### API — `api.ts`

- `'use client'` at top.
- `useCouponList(params)`: `useQuery` with key `['coupons', 'list', params]`.
- `useCoupon(id)`: `useQuery` with key `['coupons', 'detail', id]`, `enabled: !!id`.
- `useCreateCoupon()`: `useMutation`, invalidates `['coupons']` on success.
- `useUpdateCoupon()`: `useMutation`, invalidates `['coupons']` on success.
- `useToggleCoupon()`: `useMutation`, invalidates `['coupons']` on success.
- `useDeleteCoupon()`: `useMutation`, invalidates `['coupons']` on success.
- Use `apiClient<CouponResponse | CouponListResponse>` from `@/lib/api-client`.
- Define `CouponResponse` interface matching backend shape (id, code, discountType, value, maxDiscountAmount, minOrderAmount, validFrom, validUntil, isEnabled, usageLimit, usageCount, status, createdAt, updatedAt).

### Components

#### `CouponList.tsx`
- Props: `onEdit: (coupon) => void`, `onDelete: (coupon) => void`, `onToggle: (coupon) => void`.
- Local state: search (debounced), enabled filter, pagination.
- Use `useCouponList` with current filters.
- Table columns: Code, Value, Type (Flat/%), Min Order, Valid Period, Usage (count/limit), Status (active/scheduled/expired/disabled badge), Actions (Toggle, Edit, Delete).
- Status badge colors per `theme.md` §12: `active` (green/success), `scheduled` (blue/info), `expired` (red/destructive), `disabled` (slate/neutral).
- Loading state: skeleton rows.
- Empty state: "No coupons found" with create CTA if has create permission.
- Error state: error message with retry button.
- Follow layout patterns from `ProductList.tsx`.

#### `CouponForm.tsx`
- Props: `open: boolean`, `coupon: CouponResponse | null`, `onClose: () => void`.
- Uses `react-hook-form` with `zodResolver(couponSchema)`.
- Create mode if `coupon` is null, edit mode otherwise.
- Fields: Code (text, uppercased), Discount Type (select: Flat/Percentage), Value (number, label changes to "Amount" or "Percentage"), Max Discount Amount (number, shown only when type=percentage), Min Order Amount (number), Valid From (date input), Valid Until (date input), Usage Limit (number, optional).
- Conditional field display: `maxDiscountAmount` and `value` max change based on `discountType`.
- `useEffect` to `reset()` form when `open` or `coupon` changes.
- Renders inside `<Dialog>` with title "Create Coupon" / "Edit Coupon".
- Submit calls `useCreateCoupon` or `useUpdateCoupon`.
- Error handling for `AppError` including `COUPON_CODE_EXISTS`.

#### `DeleteCouponDialog.tsx`
- Props: `coupon: CouponResponse`, `onClose: () => void`.
- Check `coupon.usageCount > 0` → show "This coupon has been used {usageCount} times and cannot be deleted. Disable it instead." with a "Disable" action button and no delete option.
- If `usageCount === 0`: confirmation dialog "Are you sure you want to delete coupon {coupon.code}?" with description "This action cannot be undone."
- Confirm calls `useDeleteCoupon`, shows loading state on button.
- Error handling for `409 COUPON_IN_USE`.
- Follow pattern from `DeleteProductDialog.tsx`.

### Page — `frontend/src/app/(dashboard)/coupons/page.tsx`

- `'use client'`.
- `<PermissionGate module="coupons" action="view">`.
- Local state: `isCreateOpen`, `editingCoupon`, `deletingCoupon`, `togglingCoupon`.
- "Create Coupon" button gated by `<PermissionGate module="coupons" action="create">`.
- Renders `<CouponList>` and conditionally `<CouponForm>` / `<DeleteCouponDialog>`.
- Follow the exact pattern of `products/page.tsx`.

---

## Design

- **Coupon list layout:** Table with columns for code, value, type, min order, valid period, usage, status badge, actions. Compact row — coupons are information-dense but each field is small.
- **Status badge colors:** `active` (green/success — `bg-success`), `scheduled` (blue/info — `bg-info`), `expired` (red/destructive — `bg-destructive`), `disabled` (slate/neutral — `bg-slate-600`). Matches `theme.md` §12 coupon status badges.
- **Code field:** Auto-uppercased display. Input transforms to uppercase on blur.
- **Discount Type selector:** `Radio` or `Select` — switching between Flat/Percentage changes the `value` field label and max validation:
  - Flat: "Amount (€)" — no max
  - Percentage: "Percentage (%)" — max 100
- **Conditional field:** `maxDiscountAmount` only visible when `discountType === 'percentage'`. Label: "Max Discount Amount (optional)".
- **Date fields:** Two date inputs side by side (Valid From / Valid Until) with inline validation that `validUntil > validFrom`.
- **Usage display:** "3 / 100" format — usageCount / usageLimit (or "3 / ∞" if no limit). Red text if `usageCount >= usageLimit`.
- **Toggle action:** Inline switch/button in the Actions column. Calls `useToggleCoupon`. Loading state on the toggle button only (not the whole row). Optimistic update via `queryClient.setQueryData` if desired.
- **Delete button:** Always present but behavior differs per `usageCount`. Used coupons show a "Disable" suggestion; unused coupons show normal delete confirmation.

---

## Implementation Notes

### Files to Create

**Backend (5 files):**
1. `backend/src/models/Coupon.ts`
2. `backend/src/modules/coupons/coupons.validation.ts`
3. `backend/src/modules/coupons/coupons.service.ts`
4. `backend/src/modules/coupons/coupons.controller.ts`
5. `backend/src/modules/coupons/coupons.routes.ts`

**Modify:**
- `backend/src/app.ts` — register coupons routes

**Frontend (5 files):**
1. `frontend/src/features/coupons/api.ts`
2. `frontend/src/features/coupons/schema.ts`
3. `frontend/src/features/coupons/components/CouponList.tsx`
4. `frontend/src/features/coupons/components/CouponForm.tsx`
5. `frontend/src/features/coupons/components/DeleteCouponDialog.tsx`

**Modify:**
- `frontend/src/app/(dashboard)/coupons/page.tsx` — replace placeholder with real page

### Patterns to Follow

- **Backend:** Match `products/` module exactly — 4-file pattern, named exports, `createError`, `try/catch/next` in controllers, `import * as service` pattern.
- **Frontend:** Match `products/` feature exactly — `api.ts` with TanStack Query hooks, `schema.ts` with Zod + inferred types, components in `components/` folder, dialog-based CRUD.
- **Model:** Match `Product.ts` — Mongoose schema with `timestamps: true`, `toJSON: { versionKey: false }`, default export model + named export interface.
- **Page:** Match `products/page.tsx` — `PermissionGate` wrapper, local state for dialog open/close, conditional rendering of form/dialog.

### Already Done (No Changes Needed)
- Permission module key `coupons` registered in backend constants
- Permission module key `coupons` registered in frontend constants
- Sidebar nav link `/coupons` with `TicketPercent` icon already exists
- Activity logger mapping `coupons: 'Coupon'` already exists
- Activity logger toggle route pattern `/coupons/:id/toggle` → `coupon.toggled` already registered

### Verification

- `tsc --noEmit` passes clean on both apps
- `npm run dev` — backend starts, frontend loads, coupons CRUD works end to end
- All endpoints return correct status codes and shapes per `API.md` §11
- Computed `status` field correct for all four states (active, scheduled, expired, disabled)
- Toggle endpoint flips `isEnabled` correctly
- Delete blocked with `409 COUPON_IN_USE` when `usageCount > 0`
- Form validation rejects invalid values (percentage > 100, validUntil before validFrom, code too long)
- Search by code works
- Status badges render correct colors per `theme.md` §12
