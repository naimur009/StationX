# TEST_CASES.md — Restaurant Management Dashboard

> Derived from `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, and `AI_RULES.md`. Per `guideline.md` Phase 6, this document enumerates exhaustive test cases **before** implementation review — happy paths, validation errors, security tests, edge cases, and mobile tests for every module.
>
> **Format:** each test case lists Preconditions → Action → Expected Result, referencing the exact error `code` from `API.md` §23 where applicable. IDs are stable (`<MODULE>-<TYPE>-<NUM>`) so they can be linked from bug reports and CI test files without renumbering when new cases are inserted.
>
> **Scope note:** this document tests *contract behavior* (what API.md/DATABASE.md promise), not UI pixel layout. Component-level UI test specs belong in each module's future feature spec.

---

## 0. Cross-Cutting Test Suites

These apply to **every** module below; listed once here and referenced by ID rather than repeated 18 times.

### 0.1 Auth & Permission Gate (apply to every protected endpoint)

| ID | Type | Case | Expected |
|---|---|---|---|
| CC-AUTH-01 | Happy | Valid `accessToken`, user has required `module:action` permission | `200`/`201`, resource returned |
| CC-AUTH-02 | Security | No `Authorization` header | `401 UNAUTHORIZED` |
| CC-AUTH-03 | Security | Malformed/garbage Bearer token | `401 UNAUTHORIZED` |
| CC-AUTH-04 | Security | Expired access token | `401 UNAUTHORIZED`; frontend client transparently calls `/auth/refresh` and retries once (`ARCHITECTURE.md` §6.3) |
| CC-AUTH-05 | Security | Valid token, `role: admin` | Bypasses granular permission check entirely — succeeds regardless of `permissions` array contents |
| CC-AUTH-06 | Security | Valid token, `role: manager`/`employee`, module **absent** from `permissions` array | `403 FORBIDDEN` (default-deny per `DATABASE.md` §3.1) |
| CC-AUTH-07 | Security | Valid token, module present in `permissions` but required action missing (e.g. has `view`, route needs `edit`) | `403 FORBIDDEN` |
| CC-AUTH-08 | Edge | User's account deactivated (`isActive: false`) mid-session, existing access token not yet expired | Document expected behavior: token remains valid until natural expiry (no server-side revocation list in v1) — **flag if immediate revocation is required**, since `ARCHITECTURE.md` §6.6 defers this to Phase 2+ Redis denylist |
| CC-AUTH-09 | Security | Token signed with wrong/old JWT secret | `401 UNAUTHORIZED` |
| CC-AUTH-10 | Security | Token replay after logout (refresh cookie cleared, but access token JWT itself is stateless) | Access token still validates until its own expiry — confirms stateless-JWT tradeoff is intentional, not a bug |

### 0.2 Pagination & List Endpoints

| ID | Type | Case | Expected |
|---|---|---|---|
| CC-LIST-01 | Happy | No `page`/`limit` params | Defaults `page=1, limit=20` |
| CC-LIST-02 | Edge | `limit=500` | Capped at `100` (`API.md` §2) |
| CC-LIST-03 | Edge | `limit=0` or negative | `400 VALIDATION_ERROR` |
| CC-LIST-04 | Edge | `page` beyond last page (e.g. `page=999` on 3 total records) | `200` with empty `data: []`, correct `meta.total` |
| CC-LIST-05 | Happy | `meta.total` accuracy | Matches actual unfiltered/filtered count, not page-size count |

### 0.3 Date-Range Filter (Dashboard, Income, Reports, Attendance, Orders, Expenses)

| ID | Type | Case | Expected |
|---|---|---|---|
| CC-DATE-01 | Happy | `range=today` | Server computes `from`/`to` from request time, ignores any client-sent `from`/`to` |
| CC-DATE-02 | Happy | `range=week` | Server-computed week boundary (confirm Mon-start vs Sun-start in feature spec) |
| CC-DATE-03 | Happy | `range=month` | Server-computed calendar month boundary |
| CC-DATE-04 | Happy | `range=custom&from=2026-06-01&to=2026-06-15` | Uses client-provided bounds |
| CC-DATE-05 | Validation | `range=custom` with missing `from`/`to` | `400 VALIDATION_ERROR` |
| CC-DATE-06 | Validation | `range=custom&from=2026-06-15&to=2026-06-01` (from > to) | `400 VALIDATION_ERROR` |
| CC-DATE-07 | Edge | `range=custom&from=&to=` spans a DST transition | Verify no off-by-one-hour bucketing error |
| CC-DATE-08 | Security | `range=custom&from=2026-06-01&to=2026-06-01` plus extremely large unrelated range attempted via repeated calls (scraping) | Not a hard block in v1 — note as rate-limit gap if abused |
| CC-DATE-09 | Edge | `range=today`, client and server in different timezones | Confirm "today" is server-time-anchored, not client-time-anchored (per `API.md` §2 "computed server-side to avoid client/server clock drift") |

### 0.4 Validation Envelope

| ID | Type | Case | Expected |
|---|---|---|---|
| CC-VAL-01 | Validation | Missing required field on any `POST`/`PUT` | `400 VALIDATION_ERROR`, `details` contains field-level Zod errors |
| CC-VAL-02 | Validation | Wrong type (e.g. string where number expected) | `400 VALIDATION_ERROR` |
| CC-VAL-03 | Security | Extra/unknown fields in request body (e.g. trying to set `isActive` via a route that shouldn't allow it) | Stripped/ignored by Zod `.strict()` or schema allow-list, never silently persisted |
| CC-VAL-04 | Security | Attempt to set server-controlled fields directly (`createdBy`, `_id`, `usageCount`, `orderNumber`) | Ignored — server always overrides with its own computed value |

### 0.5 Mobile / Responsive (applies per `PRD.md` NFR "mobile responsive")

| ID | Type | Case | Expected |
|---|---|---|---|
| CC-MOB-01 | Mobile | Load POS screen on a tablet viewport (768–1024px) | Product grid and cart remain usable, no horizontal scroll, touch targets ≥ 44px |
| CC-MOB-02 | Mobile | Load POS screen on a phone viewport (<480px) | Cart and grid stack or tab rather than overflow; checkout button always reachable without excessive scrolling |
| CC-MOB-03 | Mobile | DataTable-based list pages (Orders, Products, etc.) on phone viewport | Table degrades to a card/list layout or horizontal scroll container — no clipped columns with no way to access them |
| CC-MOB-04 | Mobile | Submit a form (e.g. Expense create) via mobile on-screen keyboard | Numeric fields trigger numeric keyboard; no input obscured by the keyboard overlay |
| CC-MOB-05 | Mobile | Dark mode toggle on mobile | Applies consistently across POS, Dashboard, and modals — no flash of unstyled/wrong-theme content |
| CC-MOB-06 | Mobile/Perf | POS catalog load time on a throttled 3G/4G mobile connection | Meets the "fast loading for POS" NFR; verify the lean `GET /pos/products` payload (§9.1) is actually smaller than the admin product list |

### 0.6 Real-Time / Socket.io

| ID | Type | Case | Expected |
|---|---|---|---|
| CC-RT-01 | Happy | Two dashboard clients connected; Terminal A completes a POS order | Terminal B receives `order:created` and `dashboard:metricsInvalidate` without refresh |
| CC-RT-02 | Edge | Client disconnects mid-order-creation, reconnects after | No duplicate event replay; client re-syncs via normal React Query fetch, not missed socket events |
| CC-RT-03 | Edge | Socket connection never established (network blocks WebSocket) | Dashboard still functions via polling/manual refresh fallback — confirm graceful degradation, not a broken UI |
| CC-RT-04 | Security | Unauthenticated socket connection attempt | Rejected/disconnected — socket auth must mirror REST auth, not be an open channel |

---

## 1. Home Page (Public)

| ID | Type | Case | Expected |
|---|---|---|---|
| HOME-H-01 | Happy | Visit `/` unauthenticated | Public landing page renders, no redirect |
| HOME-H-02 | Happy | Click "Admin Login" | Navigates to `/login` |
| HOME-E-01 | Edge | Already-authenticated user visits `/` | Confirm intended behavior — stay on public page, or redirect to dashboard (undefined in PRD; flag for feature spec) |

---

## 2. Authentication & Access Control

### `POST /auth/login`

| ID | Type | Case | Expected |
|---|---|---|---|
| AUTH-H-01 | Happy | Correct email + password, active account | `200`, `accessToken` + `user` in body, refresh cookie set httpOnly+secure, never in JSON body |
| AUTH-V-01 | Validation | Missing `email` or `password` | `400 VALIDATION_ERROR` |
| AUTH-V-02 | Validation | Malformed email format | `400 VALIDATION_ERROR` |
| AUTH-E-01 | Error | Correct email, wrong password | `401 INVALID_CREDENTIALS` |
| AUTH-E-02 | Error | Email doesn't exist | `401 INVALID_CREDENTIALS` (same error as wrong password — **must not** leak which field was wrong) |
| AUTH-E-03 | Error | Correct credentials, `isActive: false` | `423 ACCOUNT_DEACTIVATED` |
| AUTH-S-01 | Security | SQL/NoSQL injection payload in `email` (e.g. `{"$gt": ""}`) | Rejected by Zod type validation (string expected) before reaching the query |
| AUTH-S-02 | Security | Brute-force: repeated failed logins for same account | Rate limited per `ARCHITECTURE.md` §12 → `429 RATE_LIMITED` after threshold |
| AUTH-S-03 | Security | Response body on failed login never includes `passwordHash` or any hash fragment | Confirmed absent in all error paths |
| AUTH-S-04 | Security | Case sensitivity of email login (`Manager@Restaurant.com` vs stored lowercase) | Login succeeds — email is normalized lowercase per `DATABASE.md` §3.1 |

### `POST /auth/refresh`

| ID | Type | Case | Expected |
|---|---|---|---|
| AUTH-H-02 | Happy | Valid refresh cookie | `200`, new `accessToken` issued |
| AUTH-E-04 | Error | Missing/expired/invalid refresh cookie | `401 UNAUTHORIZED`, frontend redirects to `/login` |
| AUTH-S-05 | Security | Refresh cookie reused after logout cleared it | Should fail — verify cookie is actually cleared server-side, not just client-side |

### `POST /auth/logout`

| ID | Type | Case | Expected |
|---|---|---|---|
| AUTH-H-03 | Happy | Authenticated logout | `200`, refresh cookie cleared |
| AUTH-E-05 | Error | Logout with no valid session | `401 UNAUTHORIZED` (auth required per §5) |

### `POST /auth/forgot-password` / `POST /auth/reset-password`

| ID | Type | Case | Expected |
|---|---|---|---|
| AUTH-H-04 | Happy | Forgot-password with valid registered email | `200`, `PasswordResetToken` created, email sent (verify email content doesn't leak whether account exists if testing enumeration-resistance is in scope) |
| AUTH-E-06 | Error | Forgot-password with unregistered email | Document expected behavior: generic `200` regardless (anti-enumeration) vs explicit error — **flag for security review**, since `API.md` §5 doesn't specify this explicitly |
| AUTH-H-05 | Happy | Reset-password with valid, unexpired, unused token | `200`, password updated, subsequent login works with new password |
| AUTH-E-07 | Error | Reset-password with expired token | `400 INVALID_OR_EXPIRED_TOKEN` |
| AUTH-E-08 | Error | Reset-password with already-`used: true` token (replay) | `400 INVALID_OR_EXPIRED_TOKEN` |
| AUTH-E-09 | Error | Reset-password with tampered/garbage token string | `400 INVALID_OR_EXPIRED_TOKEN` (lookup by `tokenHash` simply fails to match) |
| AUTH-S-06 | Security | Reset token usable more than once | Must fail on second attempt — `used` flag enforced |
| AUTH-S-07 | Security | `PasswordResetToken` TTL index actually expires/removes old tokens | Confirm via direct DB check after `expiresAt` passes |
| AUTH-H-06 | Happy | New-user "set your password" flow reuses `/auth/reset-password` (per `API.md` §6 design) | Confirm same endpoint correctly distinguishes "first-time setup" vs "forgot password" in `ActivityLog` description text |

### `GET /auth/me`

| ID | Type | Case | Expected |
|---|---|---|---|
| AUTH-H-07 | Happy | Valid token | `200`, current user + permissions, matches what hydrates the auth store |
| AUTH-E-10 | Error | No token / expired token | `401 UNAUTHORIZED` |

---

## 3. Dashboard

### `GET /dashboard/metrics`

| ID | Type | Case | Expected |
|---|---|---|---|
| DASH-H-01 | Happy | `range=today`, has completed orders today | Correct `totalEarned`, `totalProductsSold`, `totalOrdersCompleted` |
| DASH-H-02 | Happy | `range=week`/`month` | Correctly scoped aggregation |
| DASH-E-01 | Edge | No orders in selected range | `200` with all metrics `0`, not an error |
| DASH-E-02 | Edge | All orders in range are `cancelled` | Metrics `0` — cancelled orders excluded (`DATABASE.md` §5.4) |
| DASH-E-03 | Edge | Mix of `pending`/`completed`/`cancelled` orders | Only `completed` orders count. `pending` and `cancelled` are excluded. Dashboard pipeline filters `status: 'completed'` strictly — see `tasks/implementation_plan.md` Decision 1. |
| DASH-AUTH-01 | Security | User has `dashboard` permission with only `view` action | Succeeds — module only supports `view` per `API.md` §24 |
| DASH-CACHE-01 | Edge | Repeated requests within 15s | `Cache-Control: private, max-age=15` header present; verify client respects it pre-Redis |

### `GET /dashboard/top-items`

| ID | Type | Case | Expected |
|---|---|---|---|
| DASH-H-03 | Happy | `limit=10` default | Returns top 10 by quantity/revenue (confirm sort metric in feature spec) sorted descending |
| DASH-E-04 | Edge | Fewer than 10 distinct products sold in range | Returns however many exist, no padding/errors |
| DASH-E-05 | Edge | Tie in ranking (two products with identical sales) | Deterministic secondary sort (e.g. by name or productId) — verify no flaky ordering between requests |
| DASH-E-06 | Edge | A top-selling product was later soft-deleted (`isActive: false`) | Still appears in historical top-items (data comes from `Order.items` snapshot, not live Product) |

---

## 4. Income

### `GET /income`

| ID | Type | Case | Expected |
|---|---|---|---|
| INC-H-01 | Happy | `range=month&groupBy=product` | Per-product breakdown with `unitsSold`, `income`, matches `meta.range/from/to` |
| INC-E-01 | Edge | Product with sales has since been soft-deleted | Still listed (uses `nameSnapshot` data via Order items, not live Product) |
| INC-AUTH-01 | Security | User has `dashboard:view` but not a separate `income` permission | Succeeds — Income folds into `dashboard` module key per `API.md` §8 |
| INC-AUTH-02 | Security | User explicitly lacks `dashboard` in `permissions` | `403 FORBIDDEN` |
| INC-E-02 | Edge | Cancelled orders included in a product's sales history | Excluded from `income`/`unitsSold` totals per shared aggregation helper |

---

## 5. POS

### `GET /pos/products`

| ID | Type | Case | Expected |
|---|---|---|---|
| POS-H-01 | Happy | No filters | Returns only `isActive: true` products, lean payload (`id, name, price, image.url, categoryId`) |
| POS-H-02 | Happy | `categoryId=` filter | Only matching category's active products |
| POS-H-03 | Happy | `search=chicken` | Text-index matches on product name |
| POS-E-01 | Edge | `search=` matches nothing | `200`, empty list |
| POS-E-02 | Edge | Product deactivated mid-session (cashier has stale catalog cached) | Caught at order-submission time, not catalog-fetch time (see POS-E-09) |

### `POST /pos/coupons/validate`

| ID | Type | Case | Expected |
|---|---|---|---|
| POS-H-04 | Happy | Valid, active, in-window coupon, subtotal above minimum | `{ valid: true, couponId, discountType, value, discountAmount }`, correctly computed |
| POS-E-03 | Edge | Coupon `code` not found | `{ valid: false, reason: "NOT_FOUND" }`, HTTP `200` (not a 4xx — it's a valid response shape per §9.2) |
| POS-E-04 | Edge | Coupon exists but `isEnabled: false` | `reason: "DISABLED"` |
| POS-E-05 | Edge | `validFrom` is in the future | `reason: "NOT_YET_VALID"` |
| POS-E-06 | Edge | `validUntil` has passed | `reason: "EXPIRED"` |
| POS-E-07 | Edge | `subtotal` below `minOrderAmount` | `reason: "BELOW_MIN_ORDER"` |
| POS-E-08 | Edge | `usageCount >= usageLimit` | `reason: "USAGE_LIMIT_REACHED"` |
| POS-E-09 | Edge | Coupon with `maxDiscountAmount` set, percentage discount would exceed it | `discountAmount` capped at `maxDiscountAmount`, not the raw percentage calculation |
| POS-INT-01 | Integration | Calling `/validate` repeatedly while cart changes | `usageCount` is **not** incremented by repeated validate calls — confirm via direct DB read before/after multiple validate calls |
| POS-V-01 | Validation | Missing `code` or `subtotal` | `400 VALIDATION_ERROR` |
| POS-S-01 | Security | Negative `subtotal` | `400 VALIDATION_ERROR` |

### `POST /pos/orders`

| ID | Type | Case | Expected |
|---|---|---|---|
| POS-H-05 | Happy | Valid items, no coupon, `payment.method: cash`, omitted `status` | `201`, `status` defaults to `completed`, totals correctly recalculated server-side |
| POS-H-06 | Happy | Valid order with coupon applied | `discountAmount` matches recalculated value, `Coupon.usageCount` incremented exactly once (verify via DB read after) |
| POS-H-07 | Happy | `payment.method: split` with splits summing to `grandTotal` | `201`, order created |
| POS-H-08 | Happy | `status: "pending"` explicitly passed | Order created as `pending`, not auto-completed |
| POS-H-09 | Happy | `orderType: dine-in` with `tableNumber` | Both persisted |
| POS-H-10 | Happy | `orderType: takeaway`/`delivery`, no `tableNumber` | Succeeds, `tableNumber` omitted/null |
| POS-H-11 | Happy | `customerId: null` (walk-in) | Succeeds, no customer attached |
| POS-S-02 | Security | Client sends a manipulated `subtotal`/`grandTotal` that doesn't match recalculated totals from `items` | Server **ignores client totals entirely** and recalculates — response reflects server-computed values, not client-submitted ones |
| POS-S-03 | Security | Client sends `priceSnapshot` directly in `items` trying to override product price | Ignored — server derives `priceSnapshot` from live `Product.price` at submission time |
| POS-V-02 | Validation | `items: []` (empty array) | `400 VALIDATION_ERROR` (min 1 item per `DATABASE.md` §3.8) |
| POS-V-03 | Validation | `items[].quantity: 0` or negative | `400 VALIDATION_ERROR` |
| POS-V-04 | Validation | Missing `payment` object entirely | `400 VALIDATION_ERROR` (required field) |
| POS-V-05 | Validation | `payment.method: split` but `splits` sum ≠ `grandTotal` | `400 VALIDATION_ERROR` (Zod `.refine` failure) |
| POS-V-06 | Validation | `payment.method: split` but `splits` array missing/empty | `400 VALIDATION_ERROR` |
| POS-V-07 | Validation | `payment.method: cash` but `splits` also provided | Confirm expected behavior — likely ignored since not required for non-split, or rejected as unexpected field |
| POS-E-10 | Error | `productId` references a now-`isActive: false` product | `409 PRODUCT_UNAVAILABLE` |
| POS-E-11 | Error | `productId` doesn't exist at all (deleted document, bad ID) | `409 PRODUCT_UNAVAILABLE` or `400 VALIDATION_ERROR` depending on whether ID format is even valid — confirm in implementation |
| POS-E-12 | Error/Race | Coupon hits `usageLimit` in the gap between validate-preview and order submit (two terminals race) | `409 COUPON_USAGE_LIMIT_REACHED`; transaction-level re-check catches it (`DATABASE.md` §5.2) |
| POS-CONCUR-01 | Concurrency | Two POS terminals submit orders using the same near-limit coupon (`usageLimit - usageCount = 1`) simultaneously | Exactly one order succeeds with the coupon applied; the other gets `409 COUPON_USAGE_LIMIT_REACHED` — **no double-spend of the last usage slot** |
| POS-CONCUR-02 | Concurrency | Two terminals submit orders simultaneously, both relying on `Counter` for `orderNumber` | No duplicate `orderNumber` ever generated — verify via the atomic `$inc` (`DATABASE.md` §3.9) under load |
| POS-TXN-01 | Integrity | Simulate a failure mid-transaction (e.g. `ActivityLog` write fails after `Order` insert succeeds, via fault injection) | Entire transaction rolls back — no orphaned `Order` document, no incremented `Coupon.usageCount` without a corresponding order |
| POS-RT-01 | Real-time | Successful order creation | Emits `order:created` and `dashboard:metricsInvalidate` (verify both, not just one) |
| POS-AUTH-01 | Security | User has `pos:view` but not `pos:create` | Catalog browsing succeeds, `POST /pos/orders` returns `403 FORBIDDEN` |
| POS-MOB-01 | Mobile | Full order flow (browse → add to cart → apply coupon → checkout) on a tablet | Cart state persists correctly through the flow without being wiped by a background product-list refetch (Zustand isolation per `ARCHITECTURE.md` §8) |

---

## 6. Orders

| ID | Type | Case | Expected |
|---|---|---|---|
| ORD-H-01 | Happy | `GET /orders` no filters | Default sort `-createdAt`, paginated |
| ORD-H-02 | Happy | `GET /orders?status=completed&from=&to=` | Correctly filtered |
| ORD-H-03 | Happy | `GET /orders?search=ORD-000482` | Matches `orderNumber` |
| ORD-H-04 | Happy | `GET /orders/:id` | Full detail, `customerId`/`createdBy` populated |
| ORD-E-01 | Error | `GET /orders/:id` with nonexistent ID | `404 NOT_FOUND` |
| ORD-V-01 | Validation | `PUT /orders/:id` attempts to edit `items` | Rejected/ignored — only `tableNumber`, `orderType`, `customerId` are editable (`API.md` §10) |
| ORD-S-01 | Security | `PUT /orders/:id` attempts to edit `subtotal`/`grandTotal`/`discountAmount` directly | Must fail or be silently stripped — these fields are immutable post-creation per the snapshot-pricing rule |
| ORD-H-05 | Happy | `PUT /orders/:id` editing `customerId` to attach a walk-in to a customer record after the fact | Succeeds |
| ORD-H-06 | Happy | `PATCH /orders/:id/status` `pending → completed` | Succeeds, `completedAt` set |
| ORD-H-07 | Happy | `PATCH /orders/:id/status` `pending → cancelled` | Succeeds, `cancelledAt` set, `cancelReason` required |
| ORD-H-08 | Happy | `PATCH /orders/:id/status` `completed → cancelled` with `cancelReason` | Succeeds (refund acknowledgment path) |
| ORD-V-02 | Validation | `completed → cancelled` without `cancelReason` | `400 VALIDATION_ERROR` (required for this specific transition) |
| ORD-E-02 | Error | Invalid transition attempt, e.g. `cancelled → completed` | Rejected — `cancelled` is terminal |
| ORD-E-03 | Error | Invalid transition `completed → pending` | Rejected — not in the allowed transition set |
| ORD-RT-01 | Real-time | Status change succeeds | Emits `order:statusChanged` with `{ orderId, status }` |
| ORD-H-09 | Happy | `GET /orders/:id/bill?format=pdf` | Returns valid PDF binary, `application/pdf` content-type |
| ORD-H-10 | Happy | `GET /orders/:id/bill?format=html` | Returns rendered HTML, same template as PDF |
| ORD-E-04 | Error | Bill request for nonexistent order | `404 NOT_FOUND` |
| ORD-DEL-01 | Happy | `DELETE /orders/:id` on a `pending`, same-day, no-coupon-used order | Succeeds, hard delete |
| ORD-DEL-02 | Error | `DELETE /orders/:id` on a `completed` order | `409 ORDER_NOT_DELETABLE`, message points to `PATCH /orders/:id/status` |
| ORD-DEL-03 | Error | `DELETE /orders/:id` on a `pending` order created on a previous day | `409 ORDER_NOT_DELETABLE` |
| ORD-DEL-04 | Error | `DELETE /orders/:id` on a `pending` order that has coupon usage recorded | `409 ORDER_NOT_DELETABLE` |
| ORD-DEL-05 | Edge | `DELETE` on an order that's exactly at the day boundary (created 23:59:59, deleted 00:00:01 next day) | Confirm "same day" is computed by server date logic, not client — verify boundary doesn't flip mid-test due to timezone |
| ORD-AUTH-01 | Security | User has `orders:view` only | `GET` routes succeed, `PUT`/`PATCH`/`DELETE` return `403 FORBIDDEN` |
| ORD-MOB-01 | Mobile | Orders list + detail view on phone viewport | List degrades to card layout; detail view's bill-preview/print action remains reachable and functional |

---

## 7. Coupons

| ID | Type | Case | Expected |
|---|---|---|---|
| CPN-H-01 | Happy | `POST /coupons` valid flat coupon | `201`, created with `usageCount: 0` |
| CPN-H-02 | Happy | `POST /coupons` valid percentage coupon with `maxDiscountAmount` | `201`, created |
| CPN-V-01 | Validation | `discountType: percentage`, `value > 100` | `400 VALIDATION_ERROR` |
| CPN-V-02 | Validation | `discountType: flat`, negative `value` | `400 VALIDATION_ERROR` |
| CPN-V-03 | Validation | `validFrom` after `validUntil` | `400 VALIDATION_ERROR` |
| CPN-V-04 | Validation | Duplicate `code` (case variation, e.g. `WELCOME10` vs `welcome10`) | `400 VALIDATION_ERROR` or `409` — confirm uniqueness check is case-insensitive given `code` is stored uppercase-normalized |
| CPN-H-03 | Happy | `GET /coupons` | `status` field computed correctly per item: `active`, `expired`, `scheduled`, `disabled` |
| CPN-E-01 | Edge | Coupon with `isEnabled: true` but `validFrom` in future | `status: "scheduled"` |
| CPN-E-02 | Edge | Coupon with `isEnabled: true`, in valid window | `status: "active"` |
| CPN-E-03 | Edge | Coupon with `isEnabled: true`, `validUntil` passed | `status: "expired"` |
| CPN-E-04 | Edge | Coupon with `isEnabled: false`, otherwise in-window | `status: "disabled"` (disabled takes precedence over window state — confirm computed-status priority order) |
| CPN-H-04 | Happy | `PATCH /coupons/:id/toggle` | Flips `isEnabled`, no full body required |
| CPN-H-05 | Happy | `DELETE /coupons/:id` | Hard-deleted successfully regardless of `usageCount` |
| CPN-AUTH-01 | Security | User lacks `coupons:delete` | `403 FORBIDDEN` |

---

## 8. Task Management

| ID | Type | Case | Expected |
|---|---|---|---|
| TASK-H-01 | Happy | `POST /tasks` valid, assigned to existing user | `201` |
| TASK-V-01 | Validation | `assignedTo` references a nonexistent/deactivated user | `404 NOT_FOUND` — service checks `isActive: true` |
| TASK-V-02 | Validation | `priority` outside `low|medium|high` | `400 VALIDATION_ERROR` |
| TASK-V-03 | Validation | `deadline` in the past on creation | `201` — allowed; frontend shows overdue styling |
| TASK-H-02 | Happy | `PATCH /tasks/:id/status` → `completed` | `completedAt` set |
| TASK-H-03 | Happy | `PATCH /tasks/:id/status` → `in_progress` | Status updates, `completedAt` remains null |
| TASK-E-01 | Edge | Status set to `completed` then back to `pending` | `completedAt` cleared — revert via PUT with full body (PATCH only allows `in_progress`/`completed`) |
| TASK-RT-01 | Real-time | Task created/reassigned | Emits `task:assigned` with `{ taskId, assignedTo }` |
| TASK-H-04 | Happy | `GET /tasks?assignedTo=&status=&priority=&sort=deadline` | Correctly filtered and sorted |
| TASK-H-05 | Happy | `DELETE /tasks/:id` | Hard delete succeeds |
| TASK-AUTH-01 | Security | Employee viewing only their own assigned tasks vs all tasks | `403 FORBIDDEN` if user lacks `tasks:view`. All users with the permission see ALL tasks (no scope restriction). |

---

## 9. Attendance

### `GET /attendance/today`

| ID | Type | Case | Expected |
|---|---|---|---|
| ATT-H-01 | Happy | `?date=2026-06-27`, 5 active staff, 3 have records | Returns all 5 staff. 3 with `attendance` data, 2 with `null`. Summary reflects correct counts. |
| ATT-H-02 | Happy | No `date` param | Uses server's today, same behavior |
| ATT-E-01 | Edge | `date` in the future | All staff return `attendance: null`, summary `unmarked` = total count |
| ATT-E-02 | Edge | No active staff (all users deactivated or only admin accounts) | `staff: []`, summary all zeroes |
| ATT-V-01 | Validation | `date` is not a valid ISO date | `400 VALIDATION_ERROR` |

### `POST /attendance`

| ID | Type | Case | Expected |
|---|---|---|---|
| ATT-H-03 | Happy | Mark valid staff as `present` | `201`, record created with `markedBy` set to authenticated user |
| ATT-H-04 | Happy | Mark staff as `absent` with `notes: "Sick leave"` | `201`, notes persisted |
| ATT-H-05 | Happy | Mark staff as `late` with `checkInAt` timestamp | `201`, checkInAt set |
| ATT-E-03 | Error | Same staff + date already has a record | `409 ALREADY_CHECKED_IN` |
| ATT-E-04 | Error | `employeeId` references a nonexistent employee | `404 NOT_FOUND` |
| ATT-V-02 | Validation | `status` has invalid value | `400 VALIDATION_ERROR` |
| ATT-V-03 | Validation | Missing `employeeId` | `400 VALIDATION_ERROR` |
| ATT-V-04 | Validation | `notes` exceeds 500 characters | `400 VALIDATION_ERROR` |

### `POST /attendance/batch`

| ID | Type | Case | Expected |
|---|---|---|---|
| ATT-H-06 | Happy | 5 valid records, all new | `201`, `created: 5, skipped: 0, errors: []` |
| ATT-H-07 | Happy | 5 records, 3 valid + 2 already exist | `201`, `created: 3, skipped: 2, errors: [{ employeeId, code: "ALREADY_CHECKED_IN" }, ...]` |
| ATT-V-05 | Validation | `records` array empty | `400 VALIDATION_ERROR` |
| ATT-V-06 | Validation | `records` array exceeds 100 items | `400 VALIDATION_ERROR` |

### `PUT /attendance/:id`

| ID | Type | Case | Expected |
|---|---|---|---|
| ATT-H-08 | Happy | Change status from `present` to `absent` | `200`, status updated |
| ATT-H-09 | Happy | Set `checkInAt` on a record that had none | `200`, checkInAt set |
| ATT-H-10 | Happy | Clear `checkInAt` (set to null) | `200`, checkInAt removed |
| ATT-E-06 | Error | Record not found | `404 NOT_FOUND` |

### General

| ID | Type | Case | Expected |
|---|---|---|---|
| ATT-CALC-01 | Edge | `hoursWorked` is computed when both timestamps exist | `(checkOutAt - checkInAt) / 3600000` |
| ATT-CALC-02 | Edge | No `checkOutAt` → `hoursWorked` null | null returned |
| ATT-RT-01 | Real-time | Mark attendance succeeds | Emits `attendance:marked` |
| ATT-RT-02 | Real-time | Update attendance succeeds | Emits `attendance:updated` |
| ATT-AUTH-01 | Security | No `DELETE /attendance/:id` route exists | Confirm at router level |
| ATT-CONCUR-01 | Concurrency | Duplicate mark request sent twice rapidly | Second fails with `409 ALREADY_CHECKED_IN` |
| ATT-CASCADE-01 | Integrity | Delete an employee with existing attendance records | Employee deleted, all associated attendance records also removed |
| ATT-CASCADE-02 | Integrity | Delete an employee with existing salary/salary-adjustment/salary-summary records | Employee deleted, all associated salary records also removed |

---

## 10. Expenses

| ID | Type | Case | Expected |
|---|---|---|---|
| EXP-H-01 | Happy | `POST /expenses` full valid payload with `vendorId` | `201` |
| EXP-H-02 | Happy | `POST /expenses` without `vendorId` (ad-hoc payee via `paidTo` only) | `201` — `vendorId` is optional |
| EXP-V-01 | Validation | Negative `amount` | `400 VALIDATION_ERROR` |
| EXP-V-02 | Validation | Missing `paidBy` or `paidTo` | `400 VALIDATION_ERROR` (both required) |
| EXP-V-03 | Validation | `paymentMethod: split` | `400 VALIDATION_ERROR` — `split` is not in the Expense payment-method enum (only Order supports split) |
| EXP-H-03 | Happy | `GET /expenses?range=&category=&vendorId=` | Correctly filtered |
| EXP-H-04 | Happy | `DELETE /expenses/:id` | Hard delete succeeds (no `isActive` field per `DATABASE.md` §3.12) |
| EXP-E-01 | Edge | `vendorId` references a hard-deleted (removed) vendor | Expense creation fails with `404 VENDOR_NOT_FOUND` — vendor must exist to be referenced; historical expenses retain `paidTo` snapshot |
| EXP-AUTH-01 | Security | User lacks `expenses:create` | `403 FORBIDDEN` |

---

## 11. Vendors

| ID | Type | Case | Expected |
|---|---|---|---|
| VEN-H-01 | Happy | `POST /vendors` minimal valid (`name` only) | `201` |
| VEN-H-02 | Happy | `GET /vendors?search=` | Correctly filtered |
| VEN-H-03 | Happy | `DELETE /vendors/:id` | Hard delete — document removed from database, returns `{ success: true }` |
| VEN-E-01 | Edge | Delete a vendor that is referenced by existing `Expense` records | Deletion succeeds; `Expense.vendorId` populates as `null`; `paidTo` snapshot preserves payee name for historical reporting |

---

## 12. Products

| ID | Type | Case | Expected |
|---|---|---|---|
| PROD-H-01 | Happy | `POST /products` with `image` object from a prior `/uploads/image` call | `201` |
| PROD-V-01 | Validation | Negative or zero `price` | `400 VALIDATION_ERROR` |
| PROD-V-02 | Validation | `categoryId` references a nonexistent category | `400 VALIDATION_ERROR` or `404` |
| PROD-H-02 | Happy | `categoryId` references a soft-deleted (inactive) category | Confirm whether creation is still allowed — likely yes per `DATABASE.md` §3.3's "keep historical reference" philosophy, but flag since it's a *new* product, not a historical one |
| PROD-H-03 | Happy | `GET /products?categoryId=&isActive=&search=` | Admin list, full payload (image object, timestamps, `isActive`) — confirm heavier than `/pos/products` |
| PROD-H-04 | Happy | `PUT /products/:id` setting `isActive: true` | Re-enables a soft-deleted product, no separate restore route |
| PROD-H-05 | Happy | `DELETE /products/:id` | Soft delete |
| PROD-E-01 | Edge | Soft-deleted product still referenced in historical `Order.items` | Order detail view still shows correct `nameSnapshot`/`priceSnapshot`, unaffected by product's current `isActive` state |
| PROD-AUTH-01 | Security | Image upload permission check happens at the calling route, not `/uploads/image` itself | Confirm `/uploads/image` alone, called without a subsequent `products:create` permission, doesn't itself create a Product — it's "thin," per `API.md` §4 |

---

## 13. Categories

| ID | Type | Case | Expected |
|---|---|---|---|
| CAT-H-01 | Happy | `POST /categories` with unique `name` | `201` |
| CAT-V-01 | Validation | Duplicate `name` | `400 VALIDATION_ERROR` or `409` (unique index violation) |
| CAT-H-02 | Happy | `DELETE /categories/:id` while Products still reference it | Soft delete succeeds; referencing Products keep their now-inactive category reference, hidden from active dropdowns only (`API.md` §17) |
| CAT-E-01 | Edge | Category soft-deleted, then a Product is queried with `?categoryId=<deleted>` | Confirm whether this still returns matching products (historical accuracy) or is filtered — flag for feature spec |

---

## 14. Customers

| ID | Type | Case | Expected |
|---|---|---|---|
| CUST-H-01 | Happy | `POST /customers` valid | `201` |
| CUST-H-02 | Happy | Two customers created with the same `phone` number | Both succeed — `phone` is not globally unique (`DATABASE.md` §3.6, UX-nudge-not-hard-constraint design) |
| CUST-H-03 | Happy | `GET /customers/:id?includeOrders=true` | Populates recent `Order` history via `customerId` |
| CUST-H-04 | Happy | `GET /customers?search=` matching by name | Text-index match works |
| CUST-H-05 | Happy | `GET /customers?search=` matching by phone | Confirm phone search also works, not just name (per `DATABASE.md` §4 "search by name or phone") |
| CUST-CROSS-01 | Integration | Cashier without `customers:create` permission completes a walk-in order with `customerId: null` | Order creation succeeds — confirms POS doesn't require Customer permission for a walk-in (`API.md` §18 cross-module note) |
| CUST-CROSS-02 | Integration | Cashier without `customers:create` attempts to register a new customer inline during checkout | `403 FORBIDDEN` on the `POST /customers` call specifically, while the order itself can still proceed without attaching one |
| CUST-H-06 | Happy | `DELETE /customers/:id` | **Hard delete** — document permanently removed from database |
| CUST-H-07 | Happy | POS order created with `customerPhone` for a new phone number (no `customerName` needed) | New `Customer` document created with name = phone, `orderCount: 1`, `order.customerId` linked |
| CUST-H-08 | Happy | POS order created with `customerPhone` for an existing phone number | Existing customer's `orderCount` incremented by 1; name updated if provided, old name pushed to `history` |
| CUST-H-09 | Happy | `PUT /customers/:id` changing a customer's name | Previous name pushed to `history` array with `field: 'name'`, `oldValue`, `newValue`, `changedAt` |
| CUST-H-10 | Happy | `PUT /customers/:id` changing phone/email/address | Each changed field gets its own entry in `history` |
| CUST-H-11 | Happy | `GET /customers/:id?includeOrders=true` | Returns `orderCount` plus `orders[]` array with recent orders (id, total, status, createdAt) |
| CUST-CROSS-03 | Integration | POS order created with `customerPhone` links `customerId` on the Order | Fetching the Order returns `customerId` populated with the auto-created/updated Customer |
| CUST-CROSS-04 | Integration | After POS order creation, customers list auto-refreshes | React Query `['customers']` key invalidated — list updates without manual refresh |
| CUST-E-02 | Edge | `PUT /customers/:id` with no field changes (same values) | No history entries added — only actually-changed fields produce a history entry |

---

## 15. User Management

| ID | Type | Case | Expected |
|---|---|---|---|
| USR-H-01 | Happy | `POST /users` valid (admin creating a manager account) | `201`, account created **without** a usable password, `PasswordResetToken` issued, "set your password" email sent |
| USR-V-01 | Validation | Duplicate `email` | `400 VALIDATION_ERROR` or `409` (unique index) |
| USR-V-02 | Validation | `role` outside `admin|manager|employee` | `400 VALIDATION_ERROR` |
| USR-H-02 | Happy | `GET /users` default | Excludes deactivated accounts |
| USR-H-03 | Happy | `GET /users?includeInactive=true` | Includes deactivated accounts |
| USR-H-04 | Happy | `PUT /users/:id` editing name/email/role | Succeeds |
| USR-S-01 | Security | `PUT /users/:id` attempts to also set `permissions` or `password` in the same request | Ignored/stripped — those fields are **not** editable via this route per `API.md` §6 |
| USR-H-05 | Happy | `PATCH /users/:id/permissions` replacing the array | Succeeds, logged as `user.permissions_updated` (distinct from `user.updated`) |
| USR-V-03 | Validation | `permissions` array references an invalid module key (not in `API.md` §24 list) | `400 VALIDATION_ERROR` |
| USR-V-04 | Validation | `permissions[].actions` includes an action not valid for that module (e.g. `pos: ["delete"]`, but `pos` has no `delete`) | Confirm whether this is rejected at validation time or silently a no-op — **flag**, since `API.md` §24's per-module action list isn't explicitly cross-validated in the schema shown |
| USR-H-06 | Happy | `PATCH /users/:id/deactivate` | `isActive: false`, soft delete |
| USR-E-01 | Error | A user attempts to deactivate their own account | `409 CANNOT_DEACTIVATE_SELF` |
| USR-E-02 | Error | Attempt to deactivate the last remaining active `admin` | `409 LAST_ADMIN_PROTECTED` |
| USR-H-07 | Happy | Deactivate one of two active admins (a second admin still exists) | Succeeds — guard only triggers when it would leave **zero** active admins |
| USR-H-08 | Happy | `PATCH /users/:id/activate` reversing a deactivation | Succeeds |
| USR-H-09 | Happy | `DELETE /users/:id` | Same effect as `PATCH /users/:id/deactivate`, same guard rails apply (alias, not a true hard delete) |
| USR-E-03 | Error | `DELETE /users/:id` on self | `409 CANNOT_DEACTIVATE_SELF` (alias must inherit the same guard) |
| USR-E-04 | Error | `DELETE /users/:id` on last admin | `409 LAST_ADMIN_PROTECTED` (alias must inherit the same guard) |
| USR-AUTH-01 | Security | Non-admin attempts `PATCH /users/:id/permissions` even with `users:edit` granted | Succeeds if explicitly granted — confirm this is intentional (permission-based, not role-hardcoded, per the PRD's core design principle) even though it's "realistically admin-only" |
| USR-LOG-01 | Integration | Permission update and profile update each produce distinct `ActivityLog` entries | `user.updated` vs `user.permissions_updated` — verifiable by querying `/activity-log?module=users` |

---

## 16. Settings

| ID | Type | Case | Expected |
|---|---|---|---|
| SET-H-01 | Happy | `GET /settings` | Returns the singleton document |
| SET-H-02 | Happy | `PUT /settings` with only `{ vatInfo: {...} }` | Merges into existing document — other fields (`logo`, `businessHours`, etc.) remain untouched |
| SET-S-01 | Security | `PUT /settings` with a stale/empty `logo` field sent alongside an unrelated VAT-tab save | Existing `logo` is **not** nulled out — confirms merge semantics, not full replace (`API.md` §20) |
| SET-V-01 | Validation | `vatInfo` with extra fields | Stripped by Zod `.strict()` — only `bin` and `mushak` are accepted |
| SET-E-01 | Edge | Multiple concurrent `PUT /settings` calls from different admins editing different sections simultaneously | Confirm last-write-wins per field via merge, not a full-document overwrite race — verify no section's edit is lost if two saves overlap |
| SET-AUTH-01 | Security | Non-admin without `settings:edit` | `403 FORBIDDEN` |
| SET-H-03 | Happy | Settings document always resolves to the same fixed `_id` | Repeated `GET`/`PUT` always target one document — never accidentally creates a second Settings document |

---

## 17. Activity Log

| ID | Type | Case | Expected |
|---|---|---|---|
| LOG-H-01 | Happy | `GET /activity-log` | Reverse-chronological feed |
| LOG-H-02 | Happy | `GET /activity-log?actor=&module=&action=&from=&to=` | Correctly filtered |
| LOG-INT-01 | Integration | Any mutating request (e.g. `POST /products`) | Produces exactly one corresponding `ActivityLog` entry, written by global middleware |
| LOG-S-01 | Security | No `PUT`/`PATCH`/`DELETE` route exists for `/activity-log` at all | Confirm at the route-table level, not just permission-denied — attempting any of these methods should return a routing-level `404`/`405`, not `403` |
| LOG-S-02 | Security | `description` field is never influenced by raw user-supplied free text from the originating request | Verify by submitting a request with an attempted injection/script string in a free-text field elsewhere (e.g. Task title) and confirming the resulting log description is server-templated, not a pass-through |
| LOG-AUTH-01 | Security | User has `activity-log:view`, attempts a `POST` anyway | No such route exists — confirm method-not-allowed rather than relying on permission check alone |
| LOG-CLR-01 | Happy | Admin calls `DELETE /activity-log` | `200`, all activity log entries removed, `{ data: { success: true } }` |
| LOG-CLR-02 | Security | Non-admin user with `activity-log:view` only calls `DELETE /activity-log` | `403 FORBIDDEN` — `delete` action required |
| LOG-CLR-03 | Security | Unauthenticated request to `DELETE /activity-log` | `401 UNAUTHORIZED` |
| LOG-CLR-04 | Edge | `DELETE /activity-log` when logs are already empty | `200`, no error — `deleteMany` with empty filter succeeds |

---

## 18. Reports

| ID | Type | Case | Expected |
|---|---|---|---|---|
| REP-H-01 | Happy | `GET /reports/sales?range=month` | Correct on-screen JSON data |
| REP-H-02 | Happy | `GET /reports/profit?range=month` | Returns income, expenses, salaries, and calculated profit |
| REP-H-03 | Happy | `GET /reports/sales/export?range=&format=pdf` | Streams a valid PDF, correct `Content-Type: application/pdf` |
| REP-V-01 | Validation | `type` outside `sales|profit` | `400 INVALID_REPORT_TYPE` |
| REP-E-01 | Edge | Export requested for a range with zero data | PDF still generates (e.g. "No data for this period."), doesn't error |
| REP-AUTH-01 | Security | User has `reports:view` but not `reports:create` | On-screen `GET /reports/:type` succeeds; `GET /reports/:type/export` returns `403 FORBIDDEN` |
| REP-CALC-01 | Integration | Profit report calculation | `profit = totalRevenue - totalExpenses - totalSalary` for the same range |
| REP-PERF-01 | Performance | Export for a full year of data (`range=custom`, 12-month span) | PDF generation completes within an acceptable time bound (define SLA in feature spec); no timeout on the Puppeteer render |

---

## 19. Salaries

| ID | Type | Case | Expected |
|---|---|---|---|
| SAL-H-01 | Happy | `POST /salaries` valid with `paidAmount` | `201`, salary record created with `baseSalary` from Employee record, first advance created from `paidAmount` |
| SAL-V-01 | Validation | Missing `employeeId` | `400 VALIDATION_ERROR` |
| SAL-V-02 | Validation | Negative `paidAmount` | `400 VALIDATION_ERROR` |
| SAL-V-03 | Validation | `month` outside 1–12 | `400 VALIDATION_ERROR` |
| SAL-E-01 | Error | Duplicate `{employeeId, month, year}` | `409 SALARY_ALREADY_EXISTS` |
| SAL-E-02 | Error | `employeeId` references nonexistent user | `404 USER_NOT_FOUND` |
| SAL-H-01b | Happy | `POST /salaries` with `paidAmount` equal to Employee's baseSalary | `201`, status auto-set to `paid`, one advance created |
| SAL-H-02 | Happy | `PATCH /salaries/:id/advance` within remaining balance | `200`, advance added, `totalPaid` and `remainingBalance` updated |
| SAL-H-03 | Happy | `PATCH /salaries/:id/advance` that equals remaining balance | `200`, advance added, status auto-set to `paid` |
| SAL-V-04 | Validation | `PATCH /salaries/:id/advance` with negative amount | `400 VALIDATION_ERROR` |
| SAL-E-03 | Error | Advance exceeds remaining balance | `400 EXCEEDS_SALARY` |
| SAL-E-04 | Error | Advance on a `paid`/`cancelled` salary record | `400 INVALID_SALARY_STATUS` |
| SAL-H-04 | Happy | `PATCH /salaries/:id/status` → `paid` | `200`, status updated |
| SAL-H-05 | Happy | `PATCH /salaries/:id/status` → `cancelled` (only when no advances) | `200`, status updated |
| SAL-E-05 | Error | Cancel salary record with advances | `400 HAS_ADVANCES` |
| SAL-H-06 | Happy | `DELETE /salaries/:id` with no advances | `200`, record deleted |
| SAL-E-06 | Error | `DELETE /salaries/:id` with advances | `409 SALARY_HAS_ADVANCES` |
| SAL-H-07 | Happy | `GET /salaries?month=&year=` | Correctly filtered list |
| SAL-H-08 | Happy | `GET /salaries/:id` | Detail with advance history |

## 20. Salary Adjustments (Bonus / Cut)

| ID | Type | Case | Expected |
|---|---|---|---|
| ADJ-H-01 | Happy | `POST /salary-adjustments` valid bonus | `201`, adjustment created with type `bonus` |
| ADJ-H-02 | Happy | `POST /salary-adjustments` valid cut | `201`, adjustment created with type `cut` |
| ADJ-V-01 | Validation | Missing `employeeId` | `400 VALIDATION_ERROR` |
| ADJ-V-02 | Validation | Negative `amount` | `400 VALIDATION_ERROR` |
| ADJ-V-03 | Validation | Empty `reason` | `400 VALIDATION_ERROR` |
| ADJ-V-04 | Validation | Invalid `type` (not `bonus` or `cut`) | `400 VALIDATION_ERROR` |
| ADJ-E-01 | Error | `employeeId` references nonexistent employee | `404 EMPLOYEE_NOT_FOUND` |
| ADJ-H-03 | Happy | `GET /salary-adjustments?employeeId=&month=&year=` | Correctly filtered list |
| ADJ-H-04 | Happy | `GET /salary-adjustments/:id` | Single adjustment detail |
| ADJ-H-05 | Happy | `DELETE /salary-adjustments/:id` | Hard delete succeeds |
| ADJ-E-02 | Error | `DELETE /salary-adjustments/:id` nonexistent | `404 NOT_FOUND` |

## 21. Salary Summary

| ID | Type | Case | Expected |
|---|---|---|---|
| SUM-H-01 | Happy | `GET /salary-summary?employeeId=&month=&year=` for employee with salary + adjustments | Returns computed summary with `totalSalary`, `totalBonus`, `totalCut`, `totalPaid`, `netSalary` |
| SUM-H-02 | Happy | `GET /salary-summary` for employee with no salary record | Returns summary with zero values (no salary, no bonus, no cut) |
| SUM-V-01 | Validation | Missing `employeeId` | `400 VALIDATION_ERROR` |
| SUM-V-02 | Validation | Missing `month` | `400 VALIDATION_ERROR` |
| SUM-E-01 | Error | `employeeId` references nonexistent employee | `404 EMPLOYEE_NOT_FOUND` |
| SUM-H-03 | Happy | Auto-creation on first query | Summary document created in DB, subsequent queries return cached version |

## 22. Employees

| ID | Type | Case | Expected |
|---|---|---|---|
| EMP-H-01 | Happy | `POST /employees` with all fields (name, phone, email, address, baseSalary, password) | `201`, employee created as User with role `employee` |
| EMP-H-02 | Happy | `POST /employees` with only required fields (name, phone, password) | `201`, auto-generated placeholder email |
| EMP-V-01 | Validation | Missing `name` | `400 VALIDATION_ERROR` |
| EMP-V-02 | Validation | Missing `phone` | `400 VALIDATION_ERROR` |
| EMP-V-03 | Validation | Missing `password` | `400 VALIDATION_ERROR` |
| EMP-V-04 | Validation | Duplicate `email` | `409 EMAIL_EXISTS` |
| EMP-H-03 | Happy | `GET /employees` default | Returns only active employees with role `employee`/`manager`, paginated |
| EMP-H-04 | Happy | `GET /employees?search=` | Matches by name or email |
| EMP-H-05 | Happy | `GET /employees/:id` | Returns full employee detail with phone, address, baseSalary |
| EMP-E-01 | Error | `GET /employees/:id` with nonexistent ID | `404 NOT_FOUND` |
| EMP-H-06 | Happy | `PUT /employees/:id` updating name, phone, address | `200`, fields updated |
| EMP-H-07 | Happy | `PUT /employees/:id` updating baseSalary | `200`, new salary saved |
| EMP-H-08 | Happy | `DELETE /employees/:id` | `200`, User document removed |
| EMP-E-02 | Error | `DELETE /employees/:id` on nonexistent employee | `404 NOT_FOUND` |
| EMP-AUTH-01 | Security | User lacks `employees:view` | `403 FORBIDDEN` |
| EMP-INT-01 | Integration | Employee created via `/employees` appears in Salaries employee dropdown | List includes the new employee |
| EMP-INT-02 | Integration | Employee's `baseSalary` is pre-filled in SalaryForm create dialog | The `baseSalary` from the employee record is available as a default when creating monthly salary records |

---

## 23. Shared Uploads

### `POST /uploads/image`

| ID | Type | Case | Expected |
|---|---|---|---|
| UPL-H-01 | Happy | Valid JPEG/PNG under size limit | `201`, `{ url, publicId }` returned |
| UPL-V-01 | Validation | Unsupported file type (e.g. `.exe`, `.svg` if excluded, `.pdf`) | `400 UNSUPPORTED_FILE_TYPE` |
| UPL-V-02 | Validation | File exceeds size limit | `400 FILE_TOO_LARGE` |
| UPL-S-01 | Security | File with image extension but non-image binary content (MIME spoofing) | Rejected — validated by actual MIME sniffing, not just filename extension |
| UPL-S-02 | Security | Extremely large file (e.g. 1GB) sent to test memory handling | Rejected early ( before fully buffering into memory) — confirm streaming/size check happens pre-upload, not post-Cloudinary-roundtrip |
| UPL-E-01 | Edge | Upload succeeds but the subsequent `POST /products` call is never made | Orphaned Cloudinary asset — confirm if this is an accepted v1 gap or needs cleanup tooling (flag for feature spec, not a blocking bug) |

---

## 24. Cross-Module Data Integrity Tests

These verify rules that span multiple collections/modules and are easy to silently break during iterative feature development.

| ID | Type | Case | Expected |
|---|---|---|---|
| XMOD-01 | Integrity | Edit a Product's `price` after orders referencing it exist | Past orders' `priceSnapshot`/`lineTotal`/`grandTotal` remain unchanged; only future orders use the new price |
| XMOD-02 | Integrity | Edit a Product's `name` after orders exist | Past orders' `nameSnapshot` remains the old name on receipts/reports |
| XMOD-03 | Integrity | Delete (soft) a Customer, then view an old Order that references them | Order detail still resolves customer name/info via the stored reference, doesn't break or 404 |
| XMOD-04 | Integrity | Coupon hard-deleted (only possible if `usageCount: 0`) — confirm no Order ever ends up with a dangling `couponId` | Verify by attempting hard delete on a coupon, then never being able to orphan a referencing Order, since zero-usage coupons by definition have no Order referencing them |
| XMOD-05 | Integrity | Full financial trace: create an Order with a coupon → check Dashboard, Income, and Reports all reflect it identically for the same range | All three modules' numbers must agree — they share the same aggregation helper and cancelled-exclusion rule |
| XMOD-06 | Integrity | Cancel a `completed` order after it was already counted in a previously-viewed Dashboard snapshot | New Dashboard fetch (post-cancel) excludes it; verify `dashboard:metricsInvalidate` actually triggers a refetch on the open Dashboard tab |
| XMOD-07 | Integrity | Multi-document transaction failure simulation during order creation (e.g. forced DB disconnect mid-transaction) | No partial state: no Order without ActivityLog, no Coupon usageCount increment without an Order, no orderNumber consumed without an Order existing |
| XMOD-08 | Integrity | Vendor hard-deleted, then a Report (Expense report) for a period including expenses from that vendor is generated | Report still shows the expense data correctly via `paidTo` snapshot — expense `vendorId` populates as `null` but the payee name is preserved independently |

---

## 25. Open Items Requiring Sign-Off Before Full Coverage

These test areas can't be fully specified yet because the underlying behavior is itself an open item in `API.md`/`DATABASE.md`. Listed here so they aren't silently skipped — each should convert into real test cases once the linked decision is made.

1. **Order hard-delete future state** (`API.md` §25.1) — if `Order.isActive`/`deletedAt` is added later, ORD-DEL-01–05 need to be rewritten for the new soft-delete behavior instead of the current narrow restriction.
2. **Income as its own permission module** (`API.md` §25.2) — if changed, INC-AUTH-01/02 need rewriting to test a dedicated `income` permission key instead of `dashboard`.
3. **`completed → cancelled` approval gating** (`API.md` §25.3) — if a stricter action/role check is added, ORD-H-08 needs a new negative case for "edit-only, non-approving" users.
4. **Admin-set-password alternative to reset-token reuse** (`API.md` §25.4) — if added, USR-H-01 needs a parallel happy path for direct password setting without an email round-trip.
5. **`Settings.taxConfig.mode: itemized`** (`DATABASE.md` §8.2) — once implemented, POS order-creation tests (POS-H-05 onward) need new cases for per-category tax rates, not just the current flat-rate assumption.