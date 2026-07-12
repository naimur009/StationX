# API Design — Restaurant Management Dashboard

> Derived from `PRD.md`, `ARCHITECTURE.md` (§6, §7) and `DATABASE.md`. This document is the **endpoint-level contract**: every route, its permission requirement, request/response shape, and the real-time events tied to it. It does not redefine decisions already made upstream — it implements them. Field types and constraints live in `DATABASE.md`; this document only repeats a field when its *wire shape* (JSON key, computed/derived value, what the client is allowed to send vs. what the server always overrides) needs to be pinned down.
>
> **Why this document is structured the way it is:** PRD modules like POS, Orders, and Reports are not flat CRUD resources — once built out, each grows real sub-features (coupon pre-validation, status transitions, PDF export, bill printing, check-in/out, permission editing) that aren't visible from the module list alone. Rather than guess every sub-feature today, §3 defines a **naming convention** for how sub-endpoints attach to a module's base path. Every module section below follows that convention, and the heavier modules (POS, Orders, Reports, Users) include an explicit **Extension Points** table so future sub-features have a reserved, predictable place to land without renumbering or breaking existing routes.
>
> Per the Golden Rule, this is still skeleton-level for UI concerns: it does not specify component behavior or validation copy — that's each module's future feature spec. It **is** the final word on URL shape, status codes, and payload contracts, since frontend and backend code will be written directly against it.

---

## 1. Purpose & Scope

- Defines every HTTP endpoint for all 15 permission-gated modules + Auth, plus shared utility endpoints (uploads).
- Defines the Socket.io event contract (§23) that complements the REST API for live updates.
- Defines the permission-module key list (§25) — the authoritative source for what string goes in `User.permissions[].module`, since `DATABASE.md` §3.1 references it but doesn't enumerate it.
 - Resolves a few ambiguities left open by `ARCHITECTURE.md` / `DATABASE.md` where the API layer is where they actually surface (flagged inline and summarized in §26).

---

## 2. Global Conventions

These expand `ARCHITECTURE.md` §7; nothing here overrides it.

| Aspect | Rule |
|---|---|
| Base path | `/api/v1` — every path below is relative to this. |
| Content type | `application/json` for all request/response bodies except file upload (`multipart/form-data`) and PDF export (`application/pdf` binary response). |
| Auth header | `Authorization: Bearer <accessToken>` on every route except those explicitly marked **Auth: none**. |
| Success envelope | Single resource: `{ "data": {...} }`. List: `{ "data": [...], "meta": { "total": number, "page": number, "limit": number } }`. Action endpoints with no resource to return: `{ "data": { "success": true } }`. |
| Error envelope | `{ "error": { "code": "STRING_CODE", "message": "human-readable", "details"?: {...} } }`. `details` carries field-level Zod validation errors when `code === "VALIDATION_ERROR"`. |
| Pagination defaults | `page=1`, `limit=20`, `limit` capped at `100`. |
| Date-range filter | Shared shape across Dashboard, Income, Reports, Attendance, Orders, Expenses: `?range=today|week|month|custom&from=ISO8601&to=ISO8601`. `from`/`to` required only when `range=custom`; ignored otherwise (computed server-side from the request's date to avoid client/server clock drift). |
| Sorting | `?sort=field` ascending, `?sort=-field` descending. Default sort is documented per module below. |
| Idempotency | Not implemented in v1 outside the database-level safeguards already in `DATABASE.md` §5 (atomic coupon `$inc`, unique attendance index). `Idempotency-Key` is a **reserved** header name (silently ignored if sent) — see POS Extension Points (§9.5) for why it's reserved now rather than added later. |
| Versioning policy | Breaking changes bump to `/api/v2`; additive changes (new optional field, new endpoint) never require a version bump — this is what §3's convention is designed to guarantee. |

---

## 3. Module Extensibility Pattern

Every module's route file (`modules/<name>/<name>.routes.ts` per `ARCHITECTURE.md` §4) is expected to grow beyond plain CRUD as its feature spec is written. To keep additions non-breaking and predictable, every module follows one of three shapes:

| Pattern | Shape | Used for |
|---|---|---|
| **Resource CRUD** | `GET /<module>`, `GET /<module>/:id`, `POST /<module>`, `PUT /<module>/:id`, `DELETE /<module>/:id` | The default for every module unless a row below says otherwise. |
| **State-transition action** | `PATCH /<module>/:id/<verb>` (verb = past-tense-free action name, e.g. `status`, `toggle`, `check-out`) | Anything that changes a resource's lifecycle state rather than its general fields (order status, coupon enable/disable, attendance checkout, task status, user deactivation). Kept separate from generic `PUT` so each transition can carry its own validation rules and its own `ActivityLog` action string, without the generic edit endpoint needing to special-case every lifecycle field. |
| **Module-level tool** | `GET/POST /<module>/<sub-resource>` (no `:id`, not itself a stored resource) | Functionality that supports a module's resource without being one — POS's coupon pre-validation, Reports' PDF export, Uploads. |

New sub-features added later (per-module feature specs) attach using whichever of these three shapes fits, under the module's existing base path. This is why, for example, `/pos/coupons/validate` and a future `/pos/holds` can both exist without colliding with `/coupons` (the Coupons module's own CRUD) or requiring an API version bump.

---

## 4. Shared Utility Endpoints

Not tied to one PRD module — used by Products (image) and Settings (logo) per `ARCHITECTURE.md` §4 (`lib/upload.ts`).

#### `POST /uploads/image`
**Auth:** required. **Permission:** `uploads:create`. The calling module's own permission (e.g. `settings:edit`, `products:create`) is still enforced at the caller route — this endpoint adds its own `uploads:create` gate as a defense-in-depth layer.
Request: `multipart/form-data`, field `file`. Validated server-side by MIME type and size limit (`ARCHITECTURE.md` §12) before reaching Cloudinary.
Response `201`:
```json
{ "data": { "url": "https://res.cloudinary.com/.../product123.jpg", "publicId": "products/product123" } }
```
Errors: `400 UNSUPPORTED_FILE_TYPE`, `400 FILE_TOO_LARGE`.

> Returned `{ url, publicId }` is what gets embedded directly into `Product.image` / `Settings.logo` on the subsequent create/update call — this endpoint never touches Mongo itself.

---

## 5. Auth & Access Control

Base path: `/auth`. **Permission:** none — auth endpoints establish identity, they don't require it.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | none | Credential exchange → tokens |
| POST | `/auth/refresh` | refresh cookie | Issue new access token |
| POST | `/auth/logout` | required | Clears refresh cookie |
| GET | `/auth/me` | optional | Current user + permissions, used to hydrate the auth store on app load. Returns `{ data: null }` when unauthenticated (no 401). |

#### `POST /auth/login`
```json
// Request
{ "email": "manager@restaurant.com", "password": "string" }
```
```json
// Response 200
{
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": "...", "name": "...", "email": "...", "role": "manager",
               "permissions": [{ "module": "pos", "actions": ["view", "create"] }] }
  }
}
```
Refresh token is set as an httpOnly secure cookie in the same response, never in the JSON body.
Errors: `401 INVALID_CREDENTIALS`, `423 ACCOUNT_DEACTIVATED` (when `User.isActive === false`).

#### `GET /auth/me`
```json
// Response 200 — authenticated
{
  "data": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "manager",
    "isActive": true,
    "permissions": [{ "module": "pos", "actions": ["view", "create"] }]
  }
}
```
```json
// Response 200 — unauthenticated (no token, expired, or invalid)
{ "data": null }
```

---

## 6. Users & Permissions

Base path: `/users`. **Permission module key:** `users`.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/users` | `view` | List, `?includeInactive=true` to show deactivated accounts (default excludes them) |
| GET | `/users/:id` | `view` | Detail |
| POST | `/users` | `create` | Create account |
| PUT | `/users/:id` | `edit` | Name/email/role only — **not** permissions or password |
| PATCH | `/users/:id/permissions` | `edit` | Replace the `permissions` array |
| PATCH | `/users/:id/deactivate` | `delete` | Soft delete (`isActive: false`) |
| PATCH | `/users/:id/activate` | `edit` | Reverse a deactivation |
| PATCH | `/users/:id/password` | `edit` | Self-service password change — requires `prevPassword` |
| PATCH | `/users/:id/reset-password` | `edit` | Admin-forced password reset — no `prevPassword` required, takes only `newPassword` |
| DELETE | `/users/:id` | `delete` | Alias for `deactivate` — kept for REST consistency with other modules; same effect, same guard rails below |

> **Why permissions has its own endpoint:** keeping the permission editor's writes separate from the general profile-edit form means each gets its own `ActivityLog` action (`user.updated` vs `user.permissions_updated`) — an admin auditing "who widened someone's access" shouldn't have to diff a generic edit event to find it.

> **Why admin sets password directly during account creation:** `POST /users` accepts a `password` field. The server hashes it with bcrypt (cost 12) before storing. No `PasswordResetToken` is generated — the new user can log in immediately. This avoids an email-provider dependency for account creation and gives the admin immediate certainty that the account is fully usable. The password field is **not** returned in the response; `passwordHash` is excluded at the query projection level.

**Guard rails (service layer, not schema):**
- A user cannot deactivate/delete their own account → `409 CANNOT_DEACTIVATE_SELF`.
- The last remaining active `admin` cannot be deactivated → `409 LAST_ADMIN_PROTECTED`.

```json
// PATCH /users/:id/permissions request
{ "permissions": [
    { "module": "pos", "actions": ["view", "create"] },
    { "module": "orders", "actions": ["view"] }
] }
```

---

## 7. Dashboard

Base path: `/dashboard`. **Permission module key:** `dashboard` (`view` only — this module is read-only aggregation, no create/edit/delete actions apply).

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/metrics?range=` | `{ totalEarned, totalProductsSold, totalOrdersCompleted }` for the selected range |
| GET | `/dashboard/top-items?range=&limit=10` | Top-selling items, same range filter, aggregated from `Order.items` (multikey index, `DATABASE.md` §3.8) |

Both exclude `status: cancelled` orders per `DATABASE.md` §5.4, via the shared aggregation helper noted there — implemented once in `modules/dashboard`, reused by Reports (§20) so the "exclude cancelled" rule can't be forgotten.

Response is short-TTL cacheable (`ARCHITECTURE.md` §2/§10, Redis Phase 2+); until Redis is added, responses carry `Cache-Control: private, max-age=15` as a placeholder so the frontend's React Query layer isn't the only thing preventing redundant aggregation load.

---

## 8. Income _(Removed — folded into Profit Report)_

Income data is now part of the Profit report (`GET /reports/profit`, §20). The standalone `/income` endpoint is removed.

---

## 9. POS

Base path: `/pos`. **Permission module key:** `pos`. Only `view` (browse catalog, validate coupons) and `create` (submit an order) actions apply — POS never edits or deletes a *past* order; that's an Orders-module concern (§10), exactly because once an order exists it's no longer "in progress at the register."

### 9.1 Product Catalog for POS
`GET /pos/products?categoryId=&search=`
Returns only `isActive: true` products, trimmed to the fields the POS grid needs (`id, name, price, image.url, categoryId`). Deliberately a separate route from `GET /products` (§17) rather than the admin product list with a filter flag — the POS screen has its own latency budget (NFR: fast loading for POS) and shouldn't pay for the heavier admin-list payload shape (full image object, `isActive` toggle metadata, timestamps).

### 9.2 Coupon Validation (pre-check)
`POST /pos/coupons/validate`
```json
// Request
{ "code": "WELCOME10", "subtotal": 540, "customerId": "..." }
```
```json
// Response 200 (valid)
{ "data": { "valid": true, "couponId": "...", "discountType": "percentage",
            "value": 10, "discountAmount": 54 } }
```
```json
// Response 200 (invalid)
{ "data": { "valid": false, "reason": "EXPIRED" } }
```
`reason` ∈ `NOT_FOUND | DISABLED | NOT_YET_VALID | EXPIRED | BELOW_MIN_ORDER | USAGE_LIMIT_REACHED`.

This is a **read-only preview** — `Coupon.usageCount` is *not* incremented here, even though the cart may call this endpoint multiple times as items change. The actual increment happens exactly once, atomically, inside the order-creation transaction (§9.3), per `DATABASE.md` §5.2's race-condition handling. Calling this endpoint is purely advisory for the POS UI.

### 9.3 Order Creation
`POST /pos/orders`
This is where `ARCHITECTURE.md` §4's `pos.service.ts` ("order total calc, coupon application") lives. The server **recalculates** `subtotal`, `discountAmount`, and `taxAmount` from the submitted `items` + `couponCode` + per-category `vatRate` — client-submitted totals are never trusted directly, satisfying the NFR "no rounding/discount errors in billing." The request only sends what the cashier chose; the response is the source of truth for what was charged.

```json
// Request
{
  "orderType": "dine-in",
  "tableNumber": "12",
  "customerId": null,
  "items": [{ "productId": "...", "quantity": 2 }, { "productId": "...", "quantity": 1 }],
  "couponCode": "WELCOME10",
  "status": "pending"
}
```

`payment` is optional at creation. When omitted, the order is created with `paymentStatus: 'unpaid'`. When provided, the order is created with `paymentStatus: 'paid'` (legacy quick-checkout path).

```json
// Response 201
{ "data": {
    "id": "...", "orderNumber": "ORD-000482", "orderType": "dine-in", "tableNumber": "12",
    "items": [{ "productId": "...", "nameSnapshot": "Chicken Fry", "priceSnapshot": 220, "quantity": 2, "lineTotal": 440 }],
    "subtotal": 540, "discountAmount": 54, "taxAmount": 0, "grandTotal": 486,
    "paymentStatus": "unpaid",
    "status": "pending", "createdBy": "..."
} }
```

Internally this delegates to the transaction described in `DATABASE.md` §5.1 (`Counter` increment, `Order` insert, `ActivityLog` write) — POS is the route, not a separate code path. `Coupon.usageCount` `$inc` is deferred to a separate transaction at payment capture time. On success it also emits `order:created` and `dashboard:metricsInvalidate` (§23).

Errors: `400 VALIDATION_ERROR`, `409 PRODUCT_UNAVAILABLE` (a submitted `productId` was deactivated between catalog load and submit).

### 9.4 Bill / Print
Intentionally **not** duplicated under `/pos` — once an order exists, printing or reprinting its bill is an Orders concern regardless of whether the request originates from the POS screen's "print" button or the Orders detail page. See `GET /orders/:id/bill` in §10.

### 9.5 Extension Points

These are deliberately **not built in v1**, but the route shapes below are reserved so they can be added later without colliding with anything above or requiring a version bump.

| Future feature | Anticipated route | Pattern used (§3) | Why it's not built yet |
|---|---|---|---|
| Hold / park a bill, resume later | `POST /pos/holds`, `GET /pos/holds`, `DELETE /pos/holds/:id` | Module-level tool | Not in PRD; would need a lightweight `Hold` collection (cart snapshot only) kept deliberately separate from `Order` so a parked cart never touches `ActivityLog` or coupon usage until it's actually checked out |
| Void / refund a completed order or single line item | `PATCH /orders/:id/void`, `PATCH /orders/:id/items/:itemId/void` | State-transition | Distinct from `cancelled` (which is pre-fulfillment); a post-completion correction needs its own audit trail and likely a stricter approval step — deferred until a feature spec defines that flow |
| Split one cart into multiple orders/customers | `POST /pos/orders/split` | Module-level tool | Not to be confused with `payment.splits`, which already splits **one** order's total across payment methods and is in v1 today |
| Kitchen Display System ticket push | *(none needed)* | — | Already covered — `order:created` (§23) is exactly the event a future KDS client would subscribe to, per `ARCHITECTURE.md` §13 |
| Offline POS queue sync | `POST /pos/orders` + `Idempotency-Key` header | Existing route, additive header | Header name is reserved now (§2) so the route signature won't change shape when offline support is built |

---

## 10. Orders

Base path: `/orders`. **Permission module key:** `orders`.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/orders?status=&from=&to=&createdBy=&customerId=&search=&sort=-createdAt` | `view` | List, default sort newest first. `search` matches `orderNumber`. |
| GET | `/orders/:id` | `view` | Full detail, `customerId`/`createdBy` populated |
| PUT | `/orders/:id` | `edit` | **Restricted** — see below |
| PATCH | `/orders/:id/status` | `edit` | Status transition |
| GET | `/orders/:id/bill?format=pdf\|html` | `view` | Puppeteer-rendered bill, same template POS would trigger |
| DELETE | `/orders/:id` | `delete` | See open item below — not a true hard delete in most cases |

**`PUT /orders/:id` supports the following fields:** `tableNumber`, `customerId`, `items`, `payment`, `discountPercent`, `cashTendered`, `changeAmount`. `items` replacement triggers server-side recalculation of all financial fields (subtotal, tax, discount, grandTotal). Items are editable until `paymentStatus` becomes `paid`; once paid, any attempt to edit financial fields returns `400 ORDER_ALREADY_PAID`. `tableNumber` and `customerId` remain editable even after payment.

```json
// PATCH /orders/:id/status request
{ "status": "cancelled", "cancelReason": "Customer changed their mind before payment" }
```
Valid transitions: `pending → completed`, `pending → cancelled`, `completed → cancelled` (the latter requires `cancelReason` and is effectively a refund acknowledgment — gated by the same `orders:edit` permission since the schema's action enum doesn't define a separate `cancel` action; a stricter approval step is a candidate future feature spec, not added here to avoid inventing a permission action `DATABASE.md` doesn't define). `cancelled` is terminal. Sets `completedAt`/`cancelledAt` accordingly and excludes the order from revenue per `DATABASE.md` §5.4.

**Open item — `DELETE /orders/:id` needs a DATABASE.md decision (carried to §26):** the PRD lists "Delete order" as a feature, but `Order` has no `isActive` field in `DATABASE.md` §3.8, and a true hard delete of a *settled* order would silently corrupt historical Reports/Income — directly contradicting the snapshot-pricing rationale that document goes out of its way to protect. Until that's resolved, this endpoint is implemented narrowly: it only succeeds for orders that are `status: pending`, created the same day, and have no coupon usage recorded (i.e., a mistaken/duplicate draft, not a completed sale). Any other order returns `409 ORDER_NOT_DELETABLE` with a message pointing the user to `PATCH /orders/:id/status` (cancel) instead.

---

## 11. Coupons

Base path: `/coupons`. **Permission module key:** `coupons`. Hard-deletable per `DATABASE.md` §1.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/coupons?isEnabled=&search=` | `view` | List; response includes a computed `status` field (`active\|expired\|scheduled\|disabled`) derived from `validFrom`/`validUntil`/`isEnabled` so the frontend doesn't recompute it |
| GET | `/coupons/:id` | `view` | Detail |
| POST | `/coupons` | `create` | Create |
| PUT | `/coupons/:id` | `edit` | Full edit |
| PATCH | `/coupons/:id/toggle` | `edit` | Flip `isEnabled` — single-purpose action endpoint for the common "quickly disable a coupon" case, instead of requiring a full `PUT` body |
| DELETE | `/coupons/:id` | `delete` | Hard delete |

---

## 12. Tasks

Base path: `/tasks`. **Permission module key:** `tasks`. Hard-deletable per `DATABASE.md` §1.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/tasks?assignedTo=&status=&priority=&sort=deadline` | `view` | List |
| GET | `/tasks/:id` | `view` | Detail |
| POST | `/tasks` | `create` | Create (assigns to a user) |
| PUT | `/tasks/:id` | `edit` | Edit title/description/priority/deadline/assignee |
| PATCH | `/tasks/:id/status` | `edit` | `{ "status": "in_progress" | "completed" }` — sets `completedAt` on transition to `completed` |
| DELETE | `/tasks/:id` | `delete` | Hard delete |

---

## 13. Attendance

Base path: `/attendance`. **Permission module key:** `attendance`. No `delete` action — corrections go through `PUT`, preserving the audit trail.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/attendance/today?date=` | `view` | Returns all employees with their attendance status for the given date (defaults to server's today). Staff without a record have `attendance: null`. Includes a `summary` with counts. |
| GET | `/attendance` | `view` | List with filters: `?employeeId=&status=&from=&to=&page=&limit=&search=` |
| GET | `/attendance/:id` | `view` | Single record |
| POST | `/attendance` | `create` | Mark attendance for one employee — `{ employeeId, status, date?, checkInAt?, checkOutAt?, notes? }` |
| POST | `/attendance/batch` | `create` | Mark attendance for multiple employees — `{ date?, records: [{ employeeId, status, checkInAt?, checkOutAt?, notes? }] }` |
| PUT | `/attendance/:id` | `edit` | Correct an existing record — `{ status?, checkInAt?, checkOutAt?, notes? }` |

```json
// POST /attendance request
{ "employeeId": "...", "status": "present", "date": "2026-06-27", "checkInAt": "2026-06-27T09:00:00Z" }
// Response 201
{ "data": { "id": "...", "employee": { "_id": "...", "name": "Alice" }, "date": "2026-06-27", "status": "present", "checkInAt": "2026-06-27T09:00:00Z", "checkOutAt": null, "notes": "", "markedBy": { "_id": "...", "name": "Bob" } } }
```
`409 ALREADY_CHECKED_IN` if the `{employee, date}` unique index would be violated. `hoursWorked` is computed on read, never stored.

> **Cascade delete:** When an Employee is deleted from the Employees module, all associated Attendance records are automatically removed.

---

## 13.5 Employees

Base path: `/employees`. **Permission module key:** `employees`.

Manages restaurant staff records. Employees are users with role `employee` or `manager`. Each employee record includes contact information and a default base salary used as a preset when creating monthly salary records in the Salaries sub-feature (§14.1).

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/employees?search=&page=&limit=` | `view` | List employees (filters to `employee`/`manager` roles, active only by default) |
| GET | `/employees/:id` | `view` | Single employee detail |
| POST | `/employees` | `create` | Create employee account (creates a User with role `employee`) |
| PUT | `/employees/:id` | `edit` | Update employee info |
| DELETE | `/employees/:id` | `delete` | Hard-delete employee (removes the User document) |

```json
// POST /employees request
{ "name": "John Doe", "phone": "+8801712345678", "email": "john@restaurant.com",
  "address": "123 Main Street, Dhaka", "baseSalary": 10000, "password": "Secret123" }
```

```json
// GET /employees response
{
  "data": [
    {
      "id": "...",
      "name": "John Doe",
      "phone": "+8801712345678",
      "email": "john@restaurant.com",
      "address": "123 Main Street, Dhaka",
      "baseSalary": 10000,
      "role": "employee",
      "isActive": true,
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

> **Email is optional.** When creating an employee without an email, a placeholder (`{phone}@employee.local`) is generated automatically to satisfy the User model's email requirement.
>
> **Base salary** is a per-employee default rate, distinct from per-month `baseSalary` tracked in the Salary collection (§14.1). When creating a monthly salary record, this value can be used as a pre-fill.

---

## 14. Expenses

Base path: `/expenses`. **Permission module key:** `expenses`. **Hard-deletable** — `Expense` has no `isActive` field in `DATABASE.md` §3.12, so unlike Vendors/Products/etc. it falls outside the five-collection soft-delete list in §1's conventions table.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/expenses?range=&category=&vendorId=` | `view` | List, feeds Reports |
| GET | `/expenses/:id` | `view` | Detail |
| POST | `/expenses` | `create` | Create |
| PUT | `/expenses/:id` | `edit` | Edit |
| DELETE | `/expenses/:id` | `delete` | Hard delete |

```json
// POST /expenses request
{ "amount": 4500, "date": "2026-06-19", "description": "Weekly vegetable supply",
  "category": "Ingredients", "vendorId": "...", "paidBy": "...", "paidTo": "Fresh Farms Co.",
  "paymentMethod": "cash" }
```

## 15. Salaries

Manages employee monthly salary records with advance tracking. `baseSalary` is fixed per employee (from the Employee record, not user-entered). When creating a salary record, `paidAmount` is entered instead — it creates the first advance automatically. `remainingBalance` = `baseSalary` - sum of all advances. Uses the `expenses` permission module key.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/salaries?month=&year=&employeeId=&status=` | `expenses:view` | List salary records |
| GET | `/salaries/:id` | `expenses:view` | Detail with advance history |
| POST | `/salaries` | `expenses:create` | Create a monthly salary record |
| PATCH | `/salaries/:id/advance` | `expenses:edit` | Add an advance (partial salary payment) |
| PATCH | `/salaries/:id/status` | `expenses:edit` | Update status (`active` → `paid` or `cancelled`) |
| DELETE | `/salaries/:id` | `expenses:delete` | Delete — blocked if advances exist |

```json
// POST /salaries request
{ "employeeId": "...", "paidAmount": 8000, "month": 6, "year": 2026 }
```

> `baseSalary` is no longer accepted in the request body. It is derived from the employee's `baseSalary` field on the Employee record at creation time. The `paidAmount` (default 0) creates the first advance entry automatically. `remainingBalance` = `baseSalary` - sum of advances.

```json
// PATCH /salaries/:id/advance request
{ "amount": 4000, "date": "2026-06-10", "note": "First advance" }
```

```json
// GET /salaries response
{
  "data": [
    {
      "id": "...",
      "employeeId": { "_id": "...", "name": "John", "email": "john@restaurant.com" },
      "baseSalary": 10000,
      "month": 6,
      "year": 2026,
      "advances": [
        { "_id": "...", "amount": 4000, "date": "2026-06-10", "note": "First advance", "createdBy": { "_id": "...", "name": "Admin" } }
      ],
      "totalPaid": 4000,
      "remainingBalance": 6000,
      "status": "active"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### 15.1 Salary Adjustments (Bonus / Cut)

Manages bonuses (positive adjustments) and salary cuts/deductions for employees. Each adjustment is a single record with a type, amount, and reason. Uses the `expenses` permission module key.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/salary-adjustments?employeeId=&salaryId=&type=&month=&year=` | `expenses:view` | List adjustments (bonuses/cuts) |
| GET | `/salary-adjustments/:id` | `expenses:view` | Single adjustment detail |
| POST | `/salary-adjustments` | `expenses:create` | Create a bonus or cut adjustment |
| DELETE | `/salary-adjustments/:id` | `expenses:delete` | Delete an adjustment |

```json
// POST /salary-adjustments request
{ "employeeId": "...", "type": "bonus", "amount": 2000, "reason": "Festival bonus",
  "date": "2026-07-01", "month": 7, "year": 2026 }
```

```json
// POST /salary-adjustments response (201)
{
  "data": {
    "id": "...",
    "employeeId": "...",
    "type": "bonus",
    "amount": 2000,
    "reason": "Festival bonus",
    "date": "2026-07-01T00:00:00.000Z",
    "month": 7,
    "year": 2026,
    "createdBy": { "_id": "...", "name": "Admin" },
    "createdAt": "2026-07-01T10:00:00.000Z"
  }
}
```

```json
// GET /salary-adjustments response
{
  "data": [
    {
      "id": "...",
      "employeeId": "...",
      "type": "bonus",
      "amount": 2000,
      "reason": "Festival bonus",
      "date": "2026-07-01T00:00:00.000Z",
      "month": 7,
      "year": 2026,
      "createdBy": { "_id": "...", "name": "Admin" },
      "createdAt": "2026-07-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### 15.2 Salary Summary

Read-only endpoint that computes or retrieves a monthly salary summary for an employee, including total salary, total bonus, total cut, total paid, and net salary. Uses the `expenses:view` permission.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/salary-summary?employeeId=&month=&year=` | `expenses:view` | Get salary summary for an employee/period |

```json
// GET /salary-summary?employeeId=xxx&month=7&year=2026 response
{
  "data": {
    "id": "...",
    "employeeId": "...",
    "month": 7,
    "year": 2026,
    "totalSalary": 10000,
    "totalBonus": 2000,
    "totalCut": 500,
    "totalPaid": 8000,
    "netSalary": 11500
  }
}
```

The summary is auto-created on first query if it doesn't exist, computed from the salary record + all adjustments. To refresh, re-query.

---

## 16. Vendors

Base path: `/vendors`. **Permission module key:** `vendors`. Standard soft-delete CRUD.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/vendors?search=` | `view` | List |
| GET | `/vendors/:id` | `view` | Detail |
| POST | `/vendors` | `create` | Create |
| PUT | `/vendors/:id` | `edit` | Edit |
| DELETE | `/vendors/:id` | `delete` | Hard delete — document removed from database |

---

## 17. Products

Base path: `/products`. **Permission module key:** `products`. Standard soft-delete CRUD; `image` is set via `POST /uploads/image` (§4) first, then referenced here.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/products?categoryId=&isActive=&search=` | `view` | Admin product list (full payload — see §9.1 for the leaner POS variant) |
| GET | `/products/:id` | `view` | Detail |
| POST | `/products` | `create` | Create |
| PUT | `/products/:id` | `edit` | Edit, including `isActive` (so re-enabling a soft-deleted product is just a normal `PUT`, no separate restore route needed) |
| DELETE | `/products/:id` | `delete` | Soft delete |
| DELETE | `/products/:id/permanent` | `delete` | Hard delete — blocked if referenced by any Order (guard not yet enforced; TODO added in service layer for when Orders module exists) |

```json
// POST /products request
{ "name": "Chicken Fry", "price": 220, "categoryId": "...",
  "image": { "url": "https://res.cloudinary.com/.../chicken-fry.jpg", "publicId": "products/chicken-fry" },
  "description": "Crispy fried chicken, served with mint chutney" }
```

---

## 18. Categories

Base path: `/categories`. **Permission module key:** `categories`. Standard hard-delete CRUD.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/categories` | `view` | List |
| GET | `/categories/:id` | `view` | Detail |
| POST | `/categories` | `create` | Create |
| PUT | `/categories/:id` | `edit` | Edit |
| DELETE | `/categories/:id` | `delete` | Hard delete — permanently removes the category. Products that reference it will retain the `categoryId` but `populate` returns `null`; historical orders are safe via snapshot fields. |

---

## 19. Customers

Base path: `/customers`. **Permission module key:** `customers`. Standard CRUD with **hard delete**.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/customers?search=` | `view` | List/search by name or phone (text index, `DATABASE.md` §4) |
| GET | `/customers/:id` | `view` | Detail — `?includeOrders=true` populates recent `Order` history via `customerId` |
| POST | `/customers` | `create` | Create |
| PUT | `/customers/:id` | `edit` | Edit — previous field values are automatically pushed to the customer's `history` array |
| DELETE | `/customers/:id` | `delete` | **Hard delete** — permanently removes the customer document |

**Response includes `orderCount`** — the total number of POS orders placed by this customer. This field is maintained automatically by the POS order-creation flow; it is not manually editable.

```json
// GET /customers/:id response
{
  "data": {
    "id": "...",
    "name": "John Doe",
    "phone": "+8801712345678",
    "email": "john@example.com",
    "address": "123 Main Street, Dhaka",
    "orderCount": 5,
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-20T14:30:00.000Z"
  }
}
```

```json
// GET /customers/:id?includeOrders=true response — additional `orders` array
{
  "data": {
    "id": "...",
    "name": "John Doe",
    ...
    "orderCount": 5,
    "orders": [
      { "id": "...", "total": 540, "status": "completed", "createdAt": "2026-06-20T14:30:00.000Z" },
      { "id": "...", "total": 320, "status": "completed", "createdAt": "2026-06-15T12:00:00.000Z" }
    ],
    ...
  }
}
```

> **Cross-module note:** a cashier attaching a customer to a sale during POS checkout calls this module's `GET`/`POST`, gated by the *Customers* permission — not a `pos`-scoped duplicate. A staff member without `customers:create` can still complete a walk-in order (`customerId: null`); they just can't attach/register a new customer inline.
>
> **Phone is the primary customer identifier.** When a POS order is created (`POST /pos/orders`) with `customerPhone` filled in, the server looks up by phone. If found, the customer's name is updated (if provided, old name pushed to `history`) and `orderCount` is incremented — no name-matching required. If not found, a new customer is created with `orderCount: 1`. This ensures customer records stay current without manual data-entry overhead.

---

## 20. Reports

Base path: `/reports`. **Permission module key:** `reports`. One key covers both report types (Sales, Profit).

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/reports/:type?range=&from=&to=` | `view` | On-screen JSON data. `type ∈ sales\|profit` |
| GET | `/reports/:type/export?range=&from=&to=&format=pdf` | `create` | Streams a Puppeteer-rendered PDF download |

`create` is used (rather than `view`) for the export action because rendering a PDF is meaningfully more expensive than reading the on-screen numbers, and it's the action most worth distinguishing if a future role should see reports but not be able to generate exportable documents from them.

Sales report excludes cancelled orders via the shared aggregation helper from §7.

### Profit Report Response

```json
{
  "range": { "from": "2026-06-01", "to": "2026-06-30" },
  "income": { "totalRevenue": 150000, "totalOrders": 320, "totalProductsSold": 580 },
  "expenses": { "totalExpenses": 45000, "totalEntries": 28, "byCategory": [...] },
  "salaries": { "totalSalary": 60000, "totalRecords": 5, "byEmployee": [...] },
  "profit": 45000
}
```

Profit is calculated as: `profit = income.totalRevenue - expenses.totalExpenses - salaries.totalSalary`.

### Extension Point
`ARCHITECTURE.md` §13 lists scheduled/automated report email delivery as out of scope for v1. The `export` route above is deliberately what a future cron/worker (`POST /reports/:type/schedule`, not built yet) would call internally to produce the PDF it emails — so no second code path needs to be written when that feature is picked up.

---

## 21. Settings

Base path: `/settings`. **Permission module key:** `settings`. Singleton (fixed `_id`, `DATABASE.md` §3.14).

| Method | Path | Auth | Action | Description |
|---|---|---|---|---|---|
| GET | `/settings/public` | none | none | Public — returns `restaurantName` and `logo` for the homepage (no auth required) |
| GET | `/settings` | required | `view` | Returns the full Settings document |
| PUT | `/settings` | required | `edit` | Partial-merge update — see below |

> **`GET /settings/public` is intentionally separate from the authenticated `GET /settings`.** The public endpoint returns only `restaurantName` and `logo` — the two fields the unauthenticated homepage needs. All other Settings fields (`vatInfo`, `businessHours`, `address`, etc.) remain gated behind authentication.

**`PUT` here behaves like a merge, not a full replace:** the Settings UI is naturally split into sections (Business Info, VAT Information, Business Hours, Logo), and requiring the frontend to resend the entire document on every section save would be both wasteful and risky (a stale `logo` object in a VAT-tab form could accidentally null it out). The server merges the submitted fields into the singleton document rather than replacing it wholesale. Flagged here as a deliberate departure from strict REST `PUT` semantics, consistent with this document being where such calls get made explicit.

---

## 22. Activity Log

Base path: `/activity-log`. **Permission module key:** `activity-log`. **`view` is the only action that exists** — no `PUT`/`DELETE`/`POST` handler is ever registered for this collection (`DATABASE.md` §3.13's "read-only by omission" rule).

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/activity-log?actor=&module=&action=&search=&from=&to=&page=&limit=` | `view` | Reverse-chronological feed with pagination and filters |
| DELETE | `/activity-log` | `delete` | Clear all activity log entries (admin-only in practice). Returns `{ data: { success: true } }`. |

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

> **Only `DELETE` is registered on this collection — `PUT`/`PATCH`/`POST` are never registered.** The single `DELETE` endpoint clears all entries and is gated by `activity-log:delete`, which is realistically only granted to admin accounts.

---

## 23. Real-Time Events (Socket.io)

Single namespace, all authenticated dashboard clients join one shared room — no tenant scoping needed per `ARCHITECTURE.md` §1 (single-restaurant v1). A future multi-tenant build would room-scope these by `restaurantId` per `ARCHITECTURE.md` §13.

| Event | Emitted when | Payload | Typical consumer |
|---|---|---|---|
| `order:created` | `POST /pos/orders` succeeds | `{ orderId, orderNumber, grandTotal, status, createdBy }` | Orders list (live row insert), future KDS |
| `order:statusChanged` | `PATCH /orders/:id/status` succeeds | `{ orderId, status }` | Orders list, Dashboard |
| `order:itemsUpdated` | `PUT /orders/:id` succeeds with item changes on a completed order | `{ orderId, orderNumber }` | Kitchen display (re-notification for added items) |
| `order:paid` | `PATCH /orders/:id/status` with `paymentStatus: 'paid'` succeeds | `{ orderId, orderNumber, paymentStatus }` | Orders list, Dashboard |
| `dashboard:metricsInvalidate` | Any revenue-affecting event (order created/status changed, expense created) | *(signal only, no payload)* | Dashboard triggers a React Query `invalidateQueries(['dashboard'])`, per `ARCHITECTURE.md` §8 |
| `task:assigned` | Task created/reassigned | `{ taskId, assignedTo }` | Assignee's live task badge |
| `attendance:marked` | `POST /attendance` or `POST /attendance/batch` succeeds | `{ employeeId, date, status }` | Live attendance view |
| `attendance:updated` | `PUT /attendance/:id` succeeds | `{ employeeId, date, status }` | Live attendance view |

---

## 24. Error Code Reference

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod schema rejected the request body; see `details` |
| 400 | `INVALID_REPORT_TYPE` | `:type` param is not one of `sales\|profit` |
| 400 | `UNSUPPORTED_FILE_TYPE` / `FILE_TOO_LARGE` | Upload rejected before reaching Cloudinary |
| 400 | `EMAIL_EXISTS` | A user with this email already exists |
| 400 | `ALREADY_INACTIVE` | Attempt to deactivate an already-deactivated user |
| 400 | `ALREADY_ACTIVE` | Attempt to reactivate an already-active user |
| 400 | `INVALID_ACTION` | Permission action is not valid for the given module |
| 400 | `INVALID_CATEGORY` | Referenced category does not exist |
| 400 | `COUPON_CODE_EXISTS` | A coupon with this code already exists |
| 400 | `ORDER_ALREADY_PAID` | Attempt to edit items or financial fields on a paid order |
| 400 | `PRODUCT_IS_ACTIVE` | Attempt to permanently delete an active product without deactivating first |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired access token |
| 401 | `INVALID_CREDENTIALS` | Login failed |
| 403 | `FORBIDDEN` | Valid token, but `authorize(module, action)` denied it |
| 404 | `NOT_FOUND` | Resource doesn't exist (or is soft-deleted and the route doesn't opt into `includeInactive`) |
| 409 | `COUPON_IN_USE` | (reserved — not currently used; coupons are unconditionally hard-deletable) |
| 409 | `COUPON_USAGE_LIMIT_REACHED` | Lost a race at order-commit time |
| 409 | `ALREADY_CHECKED_IN` | Attendance unique-index violation (duplicate mark for same user+date) |
| 409 | `LAST_ADMIN_PROTECTED` / `CANNOT_DEACTIVATE_SELF` | User-deactivation guard rails |
| 409 | `ORDER_NOT_DELETABLE` | See §10 open item |
| 409 | `PRODUCT_UNAVAILABLE` | A submitted product went inactive mid-checkout |
| 409 | `PRODUCT_IN_USE` | Hard-delete of product blocked because it is referenced by one or more orders |
| 409 | `SALARY_ALREADY_EXISTS` | Salary record for this employee/month/year already exists |
| 409 | `SALARY_HAS_ADVANCES` | Cannot delete a salary record that has advances |
| 400 | `INVALID_SALARY_STATUS` | Can only add advances to active salary records |
| 400 | `EXCEEDS_SALARY` | Advance amount would exceed remaining balance |
| 400 | `ADJUSTMENT_EXCEEDS_SALARY` | Cut amount exceeds base salary |
| 400 | `HAS_ADVANCES` | Cannot cancel a salary record with advances |
| 423 | `ACCOUNT_DEACTIVATED` | Login attempt on a deactivated user (`isActive: false`) |
| 429 | `RATE_LIMITED` | Hit on `/auth/login`, `/auth/refresh` per `ARCHITECTURE.md` §12 |
| 500 | `INTERNAL_ERROR` | Unhandled — never exposes stack traces or raw DB errors to the client |

---

## 25. Permission Module Keys

The authoritative list referenced loosely by `DATABASE.md` §3.1 ("≤18 modules").

| Key | Actions that apply | Notes |
|---|---|---|
| `dashboard` | `view` | Includes the Income sub-view |
| `pos` | `view`, `create` | No edit/delete — see §9 |
| `orders` | `view`, `edit`, `delete` | No `create` — orders are only created via `pos:create` |
| `coupons` | `view`, `create`, `edit`, `delete` | |
| `tasks` | `view`, `create`, `edit`, `delete` | |
| `attendance` | `view`, `create`, `edit` | No `delete` — corrections only |
| `expenses` | `view`, `create`, `edit`, `delete` | |
| `vendors` | `view`, `create`, `edit`, `delete` | |
| `products` | `view`, `create`, `edit`, `delete` | |
| `categories` | `view`, `create`, `edit`, `delete` | |
| `customers` | `view`, `create`, `edit`, `delete` | |
| `users` | `view`, `create`, `edit`, `delete` | Realistically admin-only, but permission-gated like everything else, not hardcoded to role |
| `employees` | `view`, `create`, `edit`, `delete` | Manages employee-specific data (name, phone, base salary, etc.) |
| `settings` | `view`, `edit` | |
| `reports` | `view`, `create` | `create` gates PDF export, see §20 |
| `uploads` | `create` | Utility — gates `POST /uploads/image` endpoint |
| `activity-log` | `view`, `delete` | `delete` clears all log entries; realistically admin-only |
| `salary` | `view`, `create`, `edit`, `delete` | Reserved — not used by any backend route in v1. Listed for forward compatibility. |

`Admin` bypasses all of the above (`ARCHITECTURE.md` §6); this table only matters for `manager`/`employee` accounts.

---

## 26. Open Items Carried Forward

1. **`Order` deletion vs. schema** (§10): **RESOLVED — narrow hard-delete rules accepted for v1.** `Order` gets no `isActive` field. `DELETE /orders/:id` succeeds only for orders that are `status: pending`, created the same day (server date), and have no `couponId` set. All other orders return `409 ORDER_NOT_DELETABLE`. Decision rationale: see `tasks/implementation_plan.md` Decision 1.
2. **`completed → cancelled` transition** (§10): **RESOLVED — gated by `orders:edit` for v1.** No new permission action added. The `cancelReason` field provides the audit trail. If a stricter gate is wanted later, it's a non-breaking addition. Decision rationale: see `tasks/implementation_plan.md` Decision 2.
4. ~~**User invite flow** (§6): assumes account creation reuses the password-reset token mechanism rather than an admin-set-password field. Confirm before `modules/users` is implemented, since the alternative skips the email-provider dependency entirely for this one flow.~~ **RESOLVED:** Admin sets password directly during account creation (`POST /users` accepts a `password` field). `API.md` §6 updated accordingly.
5. ~~**`Settings.taxConfig.mode: itemized`** (carried from `DATABASE.md` §8, item 2): until resolved, `Order.taxAmount` calculation in `POS` (§9.3) assumes a single flat rate.~~ **RESOLVED:** The system uses a per-category VAT model (`Category.vatRate`). The old `taxConfig` has been removed. VAT is calculated per line item and is informational (does not inflate `grandTotal`).