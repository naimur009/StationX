# API Design — Restaurant Management Dashboard

> Derived from `PRD.md`, `ARCHITECTURE.md` (§6, §7) and `DATABASE.md`. This document is the **endpoint-level contract**: every route, its permission requirement, request/response shape, and the real-time events tied to it. It does not redefine decisions already made upstream — it implements them. Field types and constraints live in `DATABASE.md`; this document only repeats a field when its *wire shape* (JSON key, computed/derived value, what the client is allowed to send vs. what the server always overrides) needs to be pinned down.
>
> **Why this document is structured the way it is:** PRD modules like POS, Orders, and Reports are not flat CRUD resources — once built out, each grows real sub-features (coupon pre-validation, status transitions, PDF export, bill printing, check-in/out, permission editing) that aren't visible from the module list alone. Rather than guess every sub-feature today, §3 defines a **naming convention** for how sub-endpoints attach to a module's base path. Every module section below follows that convention, and the heavier modules (POS, Orders, Reports, Users) include an explicit **Extension Points** table so future sub-features have a reserved, predictable place to land without renumbering or breaking existing routes.
>
> Per the Golden Rule, this is still skeleton-level for UI concerns: it does not specify component behavior or validation copy — that's each module's future feature spec. It **is** the final word on URL shape, status codes, and payload contracts, since frontend and backend code will be written directly against it.

---

## 1. Purpose & Scope

- Defines every HTTP endpoint for all 15 permission-gated modules + Auth, plus shared utility endpoints (uploads).
- Defines the Socket.io event contract (§22) that complements the REST API for live updates.
- Defines the permission-module key list (§24) — the authoritative source for what string goes in `User.permissions[].module`, since `DATABASE.md` §3.1 references it but doesn't enumerate it.
- Resolves a few ambiguities left open by `ARCHITECTURE.md` / `DATABASE.md` where the API layer is where they actually surface (flagged inline and summarized in §25).

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
| POST | `/auth/forgot-password` | none | Issues `PasswordResetToken`, emails link |
| POST | `/auth/reset-password` | none | Consumes token, sets new password |
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

#### `POST /auth/reset-password`
```json
// Request
{ "token": "raw-token-from-email-link", "newPassword": "string" }
```
`200` on success; `400 INVALID_OR_EXPIRED_TOKEN` if the `PasswordResetToken` lookup (by `tokenHash`) fails, is expired, or `used: true`.

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

Both exclude `status: cancelled` orders per `DATABASE.md` §5.4, via the shared aggregation helper noted there — implemented once in `modules/dashboard`, reused by Reports (§19) and Income (§8) so the "exclude cancelled" rule can't be forgotten in one of the three places it applies.

Response is short-TTL cacheable (`ARCHITECTURE.md` §2/§10, Redis Phase 2+); until Redis is added, responses carry `Cache-Control: private, max-age=15` as a placeholder so the frontend's React Query layer isn't the only thing preventing redundant aggregation load.

---

## 8. Income

Base path: `/income`. **Permission module key:** `dashboard` — Income is a sub-view of the Dashboard feature (`ARCHITECTURE.md` §9 maps it to `features/dashboard (sub-view)`), so it does not get its own row in the permission editor. **Decision, not previously made explicit — flag if Income should be its own permission module instead.**

| Method | Path | Description |
|---|---|---|
| GET | `/income?range=&groupBy=product` | Per-product income breakdown for the selected range |

```json
// Response 200
{ "data": [
  { "productId": "...", "name": "Chicken Fry", "unitsSold": 142, "income": 28400 },
  { "productId": "...", "name": "Tea", "unitsSold": 310, "income": 9300 }
], "meta": { "range": "month", "from": "2026-06-01", "to": "2026-06-20" } }
```

---

## 9. POS

Base path: `/pos`. **Permission module key:** `pos`. Only `view` (browse catalog, validate coupons) and `create` (submit an order) actions apply — POS never edits or deletes a *past* order; that's an Orders-module concern (§10), exactly because once an order exists it's no longer "in progress at the register."

### 9.1 Product Catalog for POS
`GET /pos/products?categoryId=&search=`
Returns only `isActive: true` products, trimmed to the fields the POS grid needs (`id, name, price, image.url, categoryId`). Deliberately a separate route from `GET /products` (§16) rather than the admin product list with a filter flag — the POS screen has its own latency budget (NFR: fast loading for POS) and shouldn't pay for the heavier admin-list payload shape (full image object, `isActive` toggle metadata, timestamps).

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
This is where `ARCHITECTURE.md` §4's `pos.service.ts` ("order total calc, coupon application") lives. The server **recalculates** `subtotal`, `discountAmount`, and `taxAmount` from the submitted `items` + `couponCode` + `Settings.taxConfig` — client-submitted totals are never trusted directly, satisfying the NFR "no rounding/discount errors in billing." The request only sends what the cashier chose; the response is the source of truth for what was charged.

```json
// Request
{
  "orderType": "dine-in",
  "tableNumber": "12",
  "customerId": null,
  "items": [{ "productId": "...", "quantity": 2 }, { "productId": "...", "quantity": 1 }],
  "couponCode": "WELCOME10",
  "payment": { "method": "split", "splits": [{ "method": "cash", "amount": 300 }, { "method": "card", "amount": 186 }] },
  "status": "completed"
}
```
```json
// Response 201
{ "data": {
    "id": "...", "orderNumber": "ORD-000482", "orderType": "dine-in", "tableNumber": "12",
    "items": [{ "productId": "...", "nameSnapshot": "Chicken Fry", "priceSnapshot": 220, "quantity": 2, "lineTotal": 440 }],
    "subtotal": 540, "discountAmount": 54, "taxAmount": 0, "grandTotal": 486,
    "payment": { "method": "split", "splits": [...] },
    "status": "completed", "createdBy": "...", "completedAt": "2026-06-20T10:32:00Z"
} }
```

**`status` field — assumption made here, flag if wrong:** every POS order requires `payment` upfront (it's a required field per `DATABASE.md` §3.8), which implies payment is captured at the moment of sale in v1 — there's no separate kitchen/fulfillment workflow yet (KDS is `ARCHITECTURE.md` §13 Future Scope). So `status` **defaults to `completed`** if omitted. Staff may explicitly pass `status: "pending"` to represent a dine-in tab taken but not yet finalized; pending orders transition via `PATCH /orders/:id/status` (§10) like any other order.

Internally this delegates to the same transaction described in `DATABASE.md` §5.1 (`Counter` increment, `Order` insert, `Coupon.usageCount` `$inc`, `ActivityLog` write) — POS is the route, not a separate code path. On success it also emits `order:created` and `dashboard:metricsInvalidate` (§22).

Errors: `400 VALIDATION_ERROR`, `409 COUPON_USAGE_LIMIT_REACHED` (if a race lost between validate-preview and submit — rare, but the transaction re-checks per `DATABASE.md` §5.2), `409 PRODUCT_UNAVAILABLE` (a submitted `productId` was deactivated between catalog load and submit).

### 9.4 Bill / Print
Intentionally **not** duplicated under `/pos` — once an order exists, printing or reprinting its bill is an Orders concern regardless of whether the request originates from the POS screen's "print" button or the Orders detail page. See `GET /orders/:id/bill` in §10.

### 9.5 Extension Points

These are deliberately **not built in v1**, but the route shapes below are reserved so they can be added later without colliding with anything above or requiring a version bump.

| Future feature | Anticipated route | Pattern used (§3) | Why it's not built yet |
|---|---|---|---|
| Hold / park a bill, resume later | `POST /pos/holds`, `GET /pos/holds`, `DELETE /pos/holds/:id` | Module-level tool | Not in PRD; would need a lightweight `Hold` collection (cart snapshot only) kept deliberately separate from `Order` so a parked cart never touches `ActivityLog` or coupon usage until it's actually checked out |
| Void / refund a completed order or single line item | `PATCH /orders/:id/void`, `PATCH /orders/:id/items/:itemId/void` | State-transition | Distinct from `cancelled` (which is pre-fulfillment); a post-completion correction needs its own audit trail and likely a stricter approval step — deferred until a feature spec defines that flow |
| Split one cart into multiple orders/customers | `POST /pos/orders/split` | Module-level tool | Not to be confused with `payment.splits`, which already splits **one** order's total across payment methods and is in v1 today |
| Kitchen Display System ticket push | *(none needed)* | — | Already covered — `order:created` (§22) is exactly the event a future KDS client would subscribe to, per `ARCHITECTURE.md` §13 |
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

**`PUT /orders/:id` is intentionally narrow:** only `tableNumber`, `orderType`, and `customerId` (e.g. attaching a walk-in to a customer record after the fact) are editable. `items`, `subtotal`, `discountAmount`, `taxAmount`, and `grandTotal` are **never** editable post-creation — they're the financial record of what was actually charged, and `DATABASE.md`'s entire snapshot-pricing rationale (§3.8) exists to protect exactly this. Editing line items after the fact is the "void/amend" extension point in §9.5, not a feature of generic edit.

```json
// PATCH /orders/:id/status request
{ "status": "cancelled", "cancelReason": "Customer changed their mind before payment" }
```
Valid transitions: `pending → completed`, `pending → cancelled`, `completed → cancelled` (the latter requires `cancelReason` and is effectively a refund acknowledgment — gated by the same `orders:edit` permission since the schema's action enum doesn't define a separate `cancel` action; a stricter approval step is a candidate future feature spec, not added here to avoid inventing a permission action `DATABASE.md` doesn't define). `cancelled` is terminal. Sets `completedAt`/`cancelledAt` accordingly and excludes the order from revenue per `DATABASE.md` §5.4.

**Open item — `DELETE /orders/:id` needs a DATABASE.md decision (carried to §25):** the PRD lists "Delete order" as a feature, but `Order` has no `isActive` field in `DATABASE.md` §3.8, and a true hard delete of a *settled* order would silently corrupt historical Reports/Income — directly contradicting the snapshot-pricing rationale that document goes out of its way to protect. Until that's resolved, this endpoint is implemented narrowly: it only succeeds for orders that are `status: pending`, created the same day, and have no coupon usage recorded (i.e., a mistaken/duplicate draft, not a completed sale). Any other order returns `409 ORDER_NOT_DELETABLE` with a message pointing the user to `PATCH /orders/:id/status` (cancel) instead.

---

## 11. Coupons

Base path: `/coupons`. **Permission module key:** `coupons`. Hard-deletable per `DATABASE.md` §1, with the in-use guard from §3.5.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/coupons?isEnabled=&search=` | `view` | List; response includes a computed `status` field (`active\|expired\|scheduled\|disabled`) derived from `validFrom`/`validUntil`/`isEnabled` so the frontend doesn't recompute it |
| GET | `/coupons/:id` | `view` | Detail |
| POST | `/coupons` | `create` | Create |
| PUT | `/coupons/:id` | `edit` | Full edit |
| PATCH | `/coupons/:id/toggle` | `edit` | Flip `isEnabled` — single-purpose action endpoint for the common "quickly disable a coupon" case, instead of requiring a full `PUT` body |
| DELETE | `/coupons/:id` | `delete` | Hard delete — blocked with `409 COUPON_IN_USE` if `usageCount > 0` per `DATABASE.md` §3.5; the error message suggests `PATCH /coupons/:id/toggle` instead |

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

Base path: `/attendance`. **Permission module key:** `attendance`. No `delete` action — corrections go through `PUT`, preserving the audit trail rather than erasing a mistaken entry.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/attendance?userId=&range=` | `view` | History/report list |
| GET | `/attendance/:id` | `view` | Single record |
| POST | `/attendance/check-in` | `create` | Self check-in (or `{ "userId": "..." }` if a manager is checking in someone else) |
| PATCH | `/attendance/:id/check-out` | `edit` | Sets `checkOutAt` on today's record |
| PUT | `/attendance/:id` | `edit` | Manual correction (admin/manager) — e.g. fixing a forgotten check-out, with `notes` explaining why |

```json
// POST /attendance/check-in response 201
{ "data": { "id": "...", "userId": "...", "date": "2026-06-20", "checkInAt": "2026-06-20T09:01:00Z" } }
```
`409 ALREADY_CHECKED_IN` if the `{userId, date}` unique index (`DATABASE.md` §3.11) would be violated — this is the actual guard, the API error is just surfacing the DB constraint. `hoursWorked` is computed on read, never stored, matching `DATABASE.md` §3.11.

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

---

## 15. Vendors

Base path: `/vendors`. **Permission module key:** `vendors`. Standard soft-delete CRUD.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/vendors?search=&isActive=` | `view` | List |
| GET | `/vendors/:id` | `view` | Detail |
| POST | `/vendors` | `create` | Create |
| PUT | `/vendors/:id` | `edit` | Edit |
| DELETE | `/vendors/:id` | `delete` | Soft delete (`isActive: false`) |

---

## 16. Products

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

## 17. Categories

Base path: `/categories`. **Permission module key:** `categories`. Standard soft-delete CRUD.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/categories?isActive=` | `view` | List |
| GET | `/categories/:id` | `view` | Detail |
| POST | `/categories` | `create` | Create |
| PUT | `/categories/:id` | `edit` | Edit |
| DELETE | `/categories/:id` | `delete` | Soft delete — products referencing it keep their (now-inactive) reference per `DATABASE.md` §3.3, just hidden from active dropdowns |

---

## 18. Customers

Base path: `/customers`. **Permission module key:** `customers`. Standard soft-delete CRUD.

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/customers?search=` | `view` | List/search by name or phone (text index, `DATABASE.md` §4) |
| GET | `/customers/:id` | `view` | Detail — `?includeOrders=true` populates recent `Order` history via `customerId` |
| POST | `/customers` | `create` | Create |
| PUT | `/customers/:id` | `edit` | Edit |
| DELETE | `/customers/:id` | `delete` | Soft delete |

> **Cross-module note:** a cashier attaching a customer to a sale during POS checkout calls this module's `GET`/`POST`, gated by the *Customers* permission — not a `pos`-scoped duplicate. A staff member without `customers:create` can still complete a walk-in order (`customerId: null`); they just can't attach/register a new customer inline.

---

## 19. Reports

Base path: `/reports`. **Permission module key:** `reports`. One key covers all four report types (Sales, Income, Expense, Attendance) — they share the same aggregation/export infrastructure per `ARCHITECTURE.md` §9, so splitting permissions per report type would add UI complexity with no real access-control benefit (an admin/manager who can see one financial report can reasonably see all of them).

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/reports/:type?range=&from=&to=` | `view` | On-screen JSON data. `type ∈ sales\|income\|expense\|attendance` |
| GET | `/reports/:type/export?range=&from=&to=&format=pdf` | `create` | Streams a Puppeteer-rendered PDF download |

`create` is used (rather than `view`) for the export action because rendering a PDF is meaningfully more expensive than reading the on-screen numbers, and it's the action most worth distinguishing if a future role should see reports but not be able to generate exportable documents from them.

All four report types reuse the cancelled-orders-excluded aggregation helper from §7.

### Extension Point
`ARCHITECTURE.md` §13 lists scheduled/automated report email delivery as out of scope for v1. The `export` route above is deliberately what a future cron/worker (`POST /reports/:type/schedule`, not built yet) would call internally to produce the PDF it emails — so no second code path needs to be written when that feature is picked up.

---

## 20. Settings

Base path: `/settings`. **Permission module key:** `settings`. Singleton (fixed `_id`, `DATABASE.md` §3.14).

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/settings` | `view` | Returns the one document |
| PUT | `/settings` | `edit` | Partial-merge update — see below |

**`PUT` here behaves like a merge, not a full replace:** the Settings UI is naturally split into sections (Business Info, Tax, Business Hours, Logo), and requiring the frontend to resend the entire document on every section save would be both wasteful and risky (a stale `logo` object in a Tax-tab form could accidentally null it out). The server merges the submitted fields into the singleton document rather than replacing it wholesale. Flagged here as a deliberate departure from strict REST `PUT` semantics, consistent with this document being where such calls get made explicit.

---

## 21. Activity Log

Base path: `/activity-log`. **Permission module key:** `activity-log`. **`view` is the only action that exists** — no `PUT`/`DELETE`/`POST` handler is ever registered for this collection (`DATABASE.md` §3.13's "read-only by omission" rule), so there's nothing to list beyond:

| Method | Path | Action | Description |
|---|---|---|---|
| GET | `/activity-log?actor=&module=&action=&from=&to=` | `view` | Reverse-chronological feed |

---

## 22. Real-Time Events (Socket.io)

Single namespace, all authenticated dashboard clients join one shared room — no tenant scoping needed per `ARCHITECTURE.md` §1 (single-restaurant v1). A future multi-tenant build would room-scope these by `restaurantId` per `ARCHITECTURE.md` §13.

| Event | Emitted when | Payload | Typical consumer |
|---|---|---|---|
| `order:created` | `POST /pos/orders` succeeds | `{ orderId, orderNumber, grandTotal, status, createdBy }` | Orders list (live row insert), future KDS |
| `order:statusChanged` | `PATCH /orders/:id/status` succeeds | `{ orderId, status }` | Orders list, Dashboard |
| `dashboard:metricsInvalidate` | Any revenue-affecting event (order created/status changed, expense created) | *(signal only, no payload)* | Dashboard triggers a React Query `invalidateQueries(['dashboard'])`, per `ARCHITECTURE.md` §8 |
| `task:assigned` | Task created/reassigned | `{ taskId, assignedTo }` | Assignee's live task badge |
| `attendance:checkedIn` / `attendance:checkedOut` | Respective endpoints succeed | `{ userId, date }` | Live attendance view |

---

## 23. Error Code Reference

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod schema rejected the request body; see `details` |
| 400 | `UNSUPPORTED_FILE_TYPE` / `FILE_TOO_LARGE` | Upload rejected before reaching Cloudinary |
| 400 | `EMAIL_EXISTS` | A user with this email already exists |
| 400 | `ALREADY_INACTIVE` | Attempt to deactivate an already-deactivated user |
| 400 | `ALREADY_ACTIVE` | Attempt to reactivate an already-active user |
| 400 | `INVALID_ACTION` | Permission action is not valid for the given module |
| 400 | `INVALID_CATEGORY` | Referenced category does not exist |
| 400 | `COUPON_CODE_EXISTS` | A coupon with this code already exists |
| 400 | `PRODUCT_IS_ACTIVE` | Attempt to permanently delete an active product without deactivating first |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired access token |
| 401 | `INVALID_CREDENTIALS` | Login failed |
| 403 | `FORBIDDEN` | Valid token, but `authorize(module, action)` denied it |
| 404 | `NOT_FOUND` | Resource doesn't exist (or is soft-deleted and the route doesn't opt into `includeInactive`) |
| 409 | `COUPON_IN_USE` | Hard-delete blocked, `usageCount > 0` |
| 409 | `COUPON_USAGE_LIMIT_REACHED` | Lost a race at order-commit time |
| 409 | `ALREADY_CHECKED_IN` | Attendance unique-index violation |
| 409 | `LAST_ADMIN_PROTECTED` / `CANNOT_DEACTIVATE_SELF` | User-deactivation guard rails |
| 409 | `ORDER_NOT_DELETABLE` | See §10 open item |
| 409 | `PRODUCT_UNAVAILABLE` | A submitted product went inactive mid-checkout |
| 409 | `PRODUCT_IN_USE` | Hard-delete of product blocked because it is referenced by one or more orders |
| 423 | `ACCOUNT_DEACTIVATED` | Login attempt on a deactivated user (`isActive: false`) |
| 429 | `RATE_LIMITED` | Hit on `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` per `ARCHITECTURE.md` §12 |
| 500 | `INTERNAL_ERROR` | Unhandled — never exposes stack traces or raw DB errors to the client |

---

## 24. Permission Module Keys

The authoritative list referenced loosely by `DATABASE.md` §3.1 ("≤18 modules"). Sixteen keys in practice — Home needs no permission (public), and Income folds into `dashboard` (§8) rather than getting its own key.

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
| `settings` | `view`, `edit` | |
| `reports` | `view`, `create` | `create` gates PDF export, see §19 |
| `uploads` | `create` | Utility — gates `POST /uploads/image` endpoint |
| `activity-log` | `view` | Read-only by design |

`Admin` bypasses all of the above (`ARCHITECTURE.md` §6); this table only matters for `manager`/`employee` accounts.

---

## 25. Open Items Carried Forward

1. **`Order` deletion vs. schema** (§10): the PRD's "Delete order" feature doesn't cleanly map to `DATABASE.md`'s schema — `Order` has no `isActive` field (so it isn't in the soft-delete bucket) but a true hard delete would corrupt historical Reports/Income. Current behavior restricts real deletion to same-day, never-completed, no-coupon-used draft orders only. **Decide:** either accept this restriction permanently, or add `Order.isActive` / a dedicated `deletedAt` field to `DATABASE.md` §3.8 to support a real soft-delete of settled orders.
2. **Income permission key** (§8): currently folded into `dashboard:view` rather than its own module. Confirm this matches the intended permission-editor UX before `users.permissions` data starts getting created in real accounts (changing this later is a migration, not just a doc edit).
3. **`completed → cancelled` transition** (§10): currently gated by the same `orders:edit` action as any other status change, since `DATABASE.md`'s permission-action enum (`view|create|edit|delete`) has no `approve`/`cancel` action. If post-payment cancellations should require a stricter check than a normal edit, that needs a schema-level decision (new action type) before it can be enforced here.
4. ~~**User invite flow** (§6): assumes account creation reuses the password-reset token mechanism rather than an admin-set-password field. Confirm before `modules/users` is implemented, since the alternative skips the email-provider dependency entirely for this one flow.~~ **RESOLVED:** Admin sets password directly during account creation (`POST /users` accepts a `password` field). `API.md` §6 updated accordingly.
5. ~~**`Settings.taxConfig.mode: itemized`** (carried from `DATABASE.md` §8, item 2): until resolved, `Order.taxAmount` calculation in `POS` (§9.3) assumes a single flat rate.~~ **RESOLVED:** v1 uses `mode: 'none'` — no tax calculation. See `decisions.md` and `tasks/implementation_plan.md`.