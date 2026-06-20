# Architecture — Restaurant Management Dashboard

> Derived from `PRD.md`. This document defines the **foundational/skeleton architecture** of the full web app: stack, folder structure, data model overview, API conventions, auth flow, state management, and deployment. It is the structural backbone everything else attaches to.
>
> **This is not the final word on any individual feature.** Each of the 18 modules will get its own descriptive feature spec later (per the Golden Rule: one feature at a time, not all at once) — covering exact field-level behavior, UI states, and edge cases. Detailed schemas and endpoints are likewise deferred to `DATABASE.md` and `API.md`. Treat this document as the contract those later, more granular documents must fit inside — not a substitute for them.
>
> A **Future Scope** section (§14) captures enhancements intentionally excluded from v1 so the current architecture stays simple without closing the door on them.

---

## 1. Architecture Decisions & Assumptions

The PRD leaves several questions open. To unblock architecture, the following defaults are assumed. **Flag any of these you want changed before Phase 2 (DATABASE.md / API.md) — they ripple into schema and API design.**

| Open Question | Assumption Made | Why |
|---|---|---|
| Single restaurant vs multi-location/multi-tenant | **Single restaurant per deployment** (no tenant_id) | PRD says "a restaurant," not "restaurants." Multi-tenant can be added later by namespacing on `restaurantId` if needed — schema notes this as an extension point. |
| Forgot password / reset flow | **Included in v1** | Standard expectation for any login system; cheap to build now, expensive to retrofit. |
| Payment method tracking (cash/card/UPI/split) | **Included** as an `Order.payment` object supporting split payments | POS without payment-method reporting is a common gap requested later; cheap to add at schema time. |
| Order type (dine-in/takeaway/delivery) + table number | **Included** as `Order.orderType` + optional `tableNumber` | Needed for any real restaurant POS; low cost now. |
| Order status | **Included**: `pending → completed / cancelled` | Required for the Orders module's filter requirement and for accurate Dashboard/Income metrics (cancelled orders must not count as revenue). |
| Coupon type | **Both flat and percentage**, stored as `discountType: 'flat' | 'percentage'` | PRD explicitly lists both as options. |
| Task status | **`pending / in_progress / completed`** | Matches PRD's own suggested values. |
| Attendance model | **Check-in / check-out timestamps**, not just present/absent | Produces richer data (hours worked) at near-zero extra cost, and present/absent is derivable from it. |
| Vendor ↔ Product/Expense linkage | **Vendors optionally linked to Expenses** via `Expense.vendorId`; not linked to Products in v1 | PRD frames vendors primarily as expense sources ("items supplied"); product-vendor linkage adds inventory-like complexity not otherwise in scope. |
| Product inventory/stock tracking | **Not included in v1** — Products are a sellable catalog only (name, price, category, image, availability toggle) | PRD explicitly calls this open, and no other feature (e.g., low-stock alerts) references it. Schema leaves room to add a `stock` field later without breaking changes. |
| Customer ↔ Order history | **Linked** via `Order.customerId` (optional — walk-in orders can omit it) | Needed for any meaningful Customers module; trivial to add at schema time. |
| Report types in v1 | **Sales, Income, Expense, Attendance** (all four) | All four are listed as "likely" in the PRD and share the same reporting infrastructure, so excluding one saves little. |

These are proposals, not final decisions — confirm or override before DATABASE.md is generated.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | **Next.js 14 (App Router) + TypeScript** | SSR for fast first paint on Dashboard/Reports, file-based routing fits role-based route groups, single deploy target with backend optionally separate. |
| Styling | **Tailwind CSS + shadcn/ui** | Fast, consistent, accessible primitives; easy to theme for dark mode (NFR). |
| Data fetching/cache | **TanStack Query (React Query)** | Server-state caching, refetch-on-focus for live dashboard numbers, optimistic updates for POS. |
| Client/UI state | **Zustand** | Lightweight store for POS cart state, active filters, UI toggles — avoids prop drilling without Redux overhead. |
| Forms & validation | **React Hook Form + Zod** | Shared Zod schemas between frontend and backend validation (single source of truth for input rules). |
| Backend runtime | **Node.js + Express + TypeScript** | Separate API service decouples POS/real-time concerns from the frontend's deploy lifecycle; easier to scale independently. |
| Database | **MongoDB (Mongoose ODM)** | Flexible schema suits modules with varying/evolving fields (Settings, Vendors); Mongo transactions (replica set) handle the order-creation write (order + coupon usage + activity log) atomically. |
| Auth | **JWT (access + refresh tokens)**, bcrypt password hashing | Stateless access tokens scale horizontally; refresh tokens stored httpOnly+secure for renewal without re-login. |
| Real-time updates | **Socket.io** | Multiple POS terminals / dashboard views need live order and metric updates without polling. |
| PDF generation | **Puppeteer** (server-side HTML→PDF) | Used for bill printing and Reports export — one templating approach for both. |
| File storage | **Cloudinary (or S3-compatible)** | Product images, restaurant logo — avoids storing binaries in Mongo. |
| Caching (optional, Phase 2+) | **Redis** | Dashboard aggregate metrics, rate limiting, refresh-token denylist. |
| Hosting | **Vercel** (frontend), **Render/Railway/AWS ECS** (backend), **MongoDB Atlas** (DB) | Managed services, minimal ops overhead for a single-restaurant deployment. |

---

## 3. Frontend Structure

Feature-based organization (per future `AI_RULES.md` convention), App Router route groups split by access level.

```text
frontend/
├── app/
│   ├── (public)/
│   │   └── page.tsx                 # Home page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/                 # Authenticated shell, layout enforces session
│   │   ├── layout.tsx               # Sidebar, role/permission gate
│   │   ├── overview/page.tsx        # Dashboard module
│   │   ├── pos/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [orderId]/page.tsx
│   │   ├── coupons/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── expenses/page.tsx
│   │   ├── vendors/page.tsx
│   │   ├── products/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── users/page.tsx           # User management
│   │   ├── activity-log/page.tsx
│   │   └── settings/page.tsx
│   └── layout.tsx                   # Root layout, providers
│
├── features/                        # Feature-based modules (mirrors routes above)
│   ├── auth/
│   │   ├── api.ts                   # React Query hooks calling backend
│   │   ├── schema.ts                # Zod schemas
│   │   └── components/
│   ├── pos/
│   │   ├── api.ts
│   │   ├── store.ts                 # Zustand cart store
│   │   └── components/              # ProductGrid, Cart, CouponInput, BillPreview
│   ├── orders/
│   ├── coupons/
│   ├── tasks/
│   ├── attendance/
│   ├── expenses/
│   ├── vendors/
│   ├── products/
│   ├── categories/
│   ├── customers/
│   ├── reports/
│   ├── users/
│   ├── activity-log/
│   └── settings/
│
├── components/
│   ├── ui/                          # shadcn primitives
│   └── shared/                      # DateRangeFilter, DataTable, PermissionGate, MetricCard
│
├── lib/
│   ├── api-client.ts                # Axios/fetch wrapper, attaches JWT, handles refresh
│   ├── socket.ts                    # Socket.io client setup
│   ├── permissions.ts               # hasPermission(user, module, action) helper
│   └── utils.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts
│   └── useDateRangeFilter.ts
│
├── stores/
│   └── auth-store.ts                # Current user, permissions, token state
│
└── types/
    └── index.ts                     # Shared TS types (mirrors backend DTOs)
```

**Routing/access pattern:** the `(dashboard)` route group's `layout.tsx` checks session validity and redirects unauthenticated users to `/login`. Each page additionally wraps its content in a `<PermissionGate module="pos" action="view">` component that reads permissions from the auth store — so unauthorized modules are hidden from navigation *and* blocked at the route level (defense in depth, not just UI hiding).

---

## 4. Backend Structure

Layered architecture: routes → controllers → services → models. Business logic lives in services so it's testable independent of HTTP.

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.ts                    # Mongo connection
│   │   ├── env.ts                   # Validated env vars (Zod)
│   │   └── socket.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validation.ts   # Zod schemas
│   │   ├── users/                   # User management + permissions
│   │   ├── pos/
│   │   │   ├── pos.routes.ts
│   │   │   ├── pos.controller.ts
│   │   │   └── pos.service.ts       # Order total calc, coupon application
│   │   ├── orders/
│   │   ├── coupons/
│   │   ├── tasks/
│   │   ├── attendance/
│   │   ├── expenses/
│   │   ├── vendors/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── customers/
│   │   ├── dashboard/                # Aggregation endpoints (metrics, top-10 items)
│   │   ├── reports/                  # Report generation + PDF export
│   │   ├── activity-log/
│   │   └── settings/
│   │
│   ├── models/                      # Mongoose schemas (one file per collection)
│   ├── middleware/
│   │   ├── authenticate.ts          # Verifies JWT
│   │   ├── authorize.ts             # Checks permission for module+action
│   │   ├── validate.ts              # Generic Zod-body validator
│   │   ├── errorHandler.ts
│   │   └── activityLogger.ts        # Writes to ActivityLog on mutating requests
│   │
│   ├── lib/
│   │   ├── jwt.ts
│   │   ├── pdf.ts                   # Puppeteer wrapper for bills/reports
│   │   └── upload.ts                # Cloudinary client
│   │
│   └── app.ts / server.ts
│
└── tests/
    └── modules/                     # Mirrors src/modules
```

**Cross-cutting note:** `activityLogger` middleware is attached globally to all mutating routes (POST/PUT/PATCH/DELETE) rather than added module-by-module, so the User Activity Log (Feature 15) can't be forgotten when new modules are added later.

---

## 5. Database Design (Overview)

Full field-level schema belongs in `DATABASE.md`. At the architecture level, these are the core collections and their relationships:

```text
User ──┬─< Permission (embedded array: module + actions[])
       └─< ActivityLog (actor)

Customer ──< Order

Category ──< Product ──< OrderItem (embedded in Order)

Coupon ──< Order (applied coupon, by reference)

Order ──< OrderItem (embedded)
Order ── createdBy → User
Order ── customerId → Customer (optional)

Task ── assignedTo → User
Task ── assignedBy → User

Attendance ── userId → User

Expense ── vendorId → Vendor (optional)

Vendor (standalone, optionally referenced by Expense)

Settings (singleton document — one row for the whole restaurant)
```

**Key design choice:** `Order` embeds its line items (`OrderItem[]`) rather than referencing a separate collection. Orders are read far more often as a whole document (Order detail view, bill printing, reports) than line items are queried independently — embedding avoids joins on the hottest read path and keeps bill generation a single document fetch.

**Atomicity:** order creation (decrement coupon usage count, write the order, write the activity log entry) is wrapped in a MongoDB multi-document transaction to prevent partial writes if any step fails mid-request.

---

## 6. Authentication & Authorization Flow

1. **Login:** `POST /api/auth/login` → credentials validated → bcrypt compare → on success, issue a short-lived **access token** (15 min) and a long-lived **refresh token** (7 days, httpOnly secure cookie).
2. **Session use:** every API request carries the access token in `Authorization: Bearer`. The `authenticate` middleware verifies signature + expiry and attaches `req.user` (id, role, permissions snapshot).
3. **Token refresh:** when the access token expires, the frontend's API client transparently calls `POST /api/auth/refresh` using the refresh cookie to obtain a new access token, retrying the original request once.
4. **Authorization (permission-based, not just role-based):** each request to a protected route passes through `authorize(module, action)`. This checks the user's `permissions` array (e.g., `{ module: 'expenses', actions: ['view','create'] }`) rather than a hardcoded role check — satisfying the PRD's requirement that Admin can configure custom per-user access.
   - **Admin** bypasses granular checks (implicit full access).
   - **Manager/Employee** permissions are evaluated explicitly; default-deny if a module isn't in their permission set.
5. **Forgot password:** `POST /api/auth/forgot-password` issues a time-limited reset token emailed to the user; `POST /api/auth/reset-password` consumes it.
6. **Logout:** clears the refresh cookie; access tokens simply expire (stateless) — optionally denylisted in Redis if immediate revocation is required (Phase 2+).

```text
[Login Form] → POST /auth/login → [accessToken in memory, refreshToken in httpOnly cookie]
        │
        ▼
[API request] → Authorization: Bearer <accessToken>
        │
        ▼
authenticate middleware → verify JWT → req.user = { id, role, permissions }
        │
        ▼
authorize('orders','delete') middleware → check req.user.permissions → 403 or next()
        │
        ▼
Controller → Service → Model
```

---

## 7. API Design (Conventions)

Full endpoint list belongs in `API.md`. Conventions established here so that document stays consistent:

- **Base path:** `/api/v1/...` (versioned from day one).
- **REST resource style:** `GET /orders`, `GET /orders/:id`, `POST /orders`, `PUT /orders/:id`, `DELETE /orders/:id` — consistent across all 18 modules.
- **Pagination:** all list endpoints accept `?page=&limit=` and return `{ data, meta: { total, page, limit } }`.
- **Filtering/sorting:** query params per resource, e.g. `GET /orders?status=completed&from=2026-06-01&to=2026-06-20&sort=-createdAt`.
- **Date-range filters** (Dashboard, Income, Reports, Attendance) share one query-param shape: `?range=today|week|month|custom&from=&to=` so the frontend's `useDateRangeFilter` hook works identically across modules.
- **Validation:** every mutating endpoint validates `req.body` against a Zod schema via the `validate` middleware before reaching the controller — invalid requests never reach business logic.
- **Errors:** uniform shape `{ error: { code, message, details? } }`, mapped to correct HTTP status by `errorHandler`.
- **Soft vs hard delete:** entities referenced elsewhere (Product, Customer, Vendor, Category, User) are **soft-deleted** (`isActive: false`) to preserve historical Order/Expense/Activity-Log integrity; entities with no downstream references (Coupon, Task) may hard-delete.

---

## 8. State Management

| State type | Tool | Examples |
|---|---|---|
| Server state (anything from the API) | **React Query** | Orders list, products, dashboard metrics, reports |
| Global client/UI state | **Zustand** | Auth/session state, current POS cart, active sidebar/filters |
| Local component state | **React `useState`** | Form field focus, modal open/close |
| Form state | **React Hook Form** | All create/edit forms, validated against shared Zod schemas |
| Real-time pushed state | **Socket.io → React Query cache invalidation** | New order placed on another terminal triggers `queryClient.invalidateQueries(['orders'])` and a live Dashboard metric refresh |

**Why this split:** POS in particular needs cart state to survive across product browsing without being tied to the server-state cache (you don't want a background refetch to wipe an in-progress cart), so it's deliberately kept in Zustand rather than React Query.

---

## 9. Module-to-Architecture Mapping

This table places each of the 18 PRD features into the skeleton — it is a **structural map only** (where code for each feature lives and what it touches). It deliberately does not describe UI states, field-level behavior, or edge cases; that level of detail is intentionally deferred to each module's own future feature spec (e.g. `FEATURE-pos.md`, `FEATURE-orders.md`), written one at a time per the Golden Rule rather than all at once here.

| PRD Module | Frontend feature folder | Backend module | Notes |
|---|---|---|---|
| Home Page | `app/(public)` | — | Static/SSR, no auth |
| Auth & Access Control | `features/auth` | `modules/auth`, `modules/users` (permissions) | JWT + permission middleware |
| Dashboard | `features/dashboard` | `modules/dashboard` | Read-only aggregation endpoints, cached short-TTL |
| POS | `features/pos` | `modules/pos` | Writes to `orders`, reads `products`/`coupons` |
| Orders | `features/orders` | `modules/orders` | CRUD + status transitions |
| Coupons | `features/coupons` | `modules/coupons` | Validity-window logic shared with POS service |
| Task Management | `features/tasks` | `modules/tasks` | Assignment requires `users` lookup |
| Attendance | `features/attendance` | `modules/attendance` | Check-in/out timestamps |
| Expenses | `features/expenses` | `modules/expenses` | Feeds Reports |
| Vendors | `features/vendors` | `modules/vendors` | Linked from Expenses |
| Products | `features/products` | `modules/products` | Linked to Categories, image via Cloudinary |
| Categories | `features/categories` | `modules/categories` | Referenced by Products |
| User Management | `features/users` | `modules/users` | Permission editor UI |
| Settings | `features/settings` | `modules/settings` | Singleton document |
| Activity Log | `features/activity-log` | `modules/activity-log` | Written by global middleware, read-only API |
| Income | `features/dashboard` (sub-view) | `modules/dashboard` or `modules/reports` | Derived from completed Orders |
| Customers | `features/customers` | `modules/customers` | Linked to Order history |
| Reports | `features/reports` | `modules/reports` | Aggregation + Puppeteer PDF export |

---

## 10. Deployment Architecture

```text
                ┌─────────────────────┐
                │   Vercel (Frontend) │
                │   Next.js app       │
                └──────────┬───────────┘
                           │ HTTPS / WSS
                           ▼
                ┌─────────────────────┐
                │  Backend API        │
                │  (Render/Railway/   │
                │   AWS ECS)          │
                │  Express + Socket.io│
                └──────┬───────┬──────┘
                       │       │
           ┌───────────┘       └───────────┐
           ▼                               ▼
 ┌───────────────────┐           ┌───────────────────┐
 │  MongoDB Atlas     │           │  Cloudinary (S3)  │
 │  (replica set)     │           │  Images/logo      │
 └───────────────────┘           └───────────────────┘
           │
           ▼
 ┌───────────────────┐
 │  Redis (optional)  │
 │  Cache / sessions  │
 └───────────────────┘
```

- **Environments:** `local → staging → production`, separate Mongo Atlas clusters and env files per environment.
- **CI/CD:** GitHub Actions — lint + typecheck + test on PR; deploy on merge to `main` (frontend auto-deploys via Vercel Git integration; backend deploys via Docker image push).
- **Backend containerization:** Dockerfile for the Express API so it runs identically in any of Render/Railway/ECS.
- **Migrations:** schema changes to Mongoose models are additive by default (no hard migrations needed for adding optional fields); breaking changes get a small migration script under `backend/src/migrations/`.
- **Backups:** Atlas automated daily backups; Cloudinary retains uploaded assets independently.
- **Monitoring/logging:** structured logs (pino or winston) shipped to the hosting platform's log viewer; error tracking via Sentry (frontend + backend).

---

## 11. Third-Party Integrations

| Integration | Purpose |
|---|---|
| MongoDB Atlas | Primary database |
| Cloudinary | Product images, restaurant logo |
| Puppeteer (self-hosted, not third-party API) | Bill & report PDF generation |
| Email provider (e.g., Resend/SendGrid) | Password reset emails |
| Sentry | Error tracking (frontend + backend) |
| Socket.io | Real-time order/dashboard sync across terminals |

No payment gateway integration is implied by the PRD — POS payment-method field is for **record-keeping** (cash/card/UPI/split), not online payment processing.

---

## 12. Security Architecture

- All inputs validated server-side via Zod, regardless of frontend validation (frontend validation is UX only, never trusted).
- Mongoose schema-level typing + parameterized queries prevent injection (no raw string-built queries).
- Passwords hashed with bcrypt (cost factor 12), never logged or returned in API responses.
- JWT secrets and all credentials in environment variables, never committed; `.env.example` checked in, `.env` gitignored.
- Rate limiting on `/auth/login` and `/auth/forgot-password` to mitigate brute force.
- CORS restricted to known frontend origin(s) per environment.
- Helmet middleware for standard HTTP security headers.
- File uploads (product images, logo) validated by MIME type and size limit before reaching Cloudinary.
- Permission checks enforced server-side on every protected route — frontend `PermissionGate` is UX convenience only, never the actual security boundary.

---

## 13. Future Scope (Post-v1)

These are deliberately **excluded from v1** to keep the initial build simple, but the architecture above is designed not to block them. Each row notes what would need to change to support it later.

| Future Enhancement | What it would touch | Why excluded from v1 |
|---|---|---|
| Multi-location / multi-tenant restaurants | Add `restaurantId` to nearly every collection; scope all queries and the auth/permission model by it | PRD describes a single restaurant; adding tenancy now would add a cross-cutting concern with no current requirement driving it |
| Product inventory/stock tracking | `Product.stock`, stock-deduction logic in POS order creation, low-stock alerts/notifications | PRD explicitly left this open with no downstream feature (e.g. reorder alerts) requesting it yet |
| Vendor ↔ Product linkage | `Product.vendorId` or many-to-many supplier mapping | Only Expense↔Vendor linkage is in scope for v1; sourcing traceability is a natural v2 add |
| Online payment gateway (Stripe/Razorpay/UPI APIs) | New `modules/payments`, webhook handling, reconciliation against `Order.payment` | v1 payment fields are record-keeping only, not processing — PRD doesn't request online payment collection |
| Customer loyalty / rewards program | `Customer.loyaltyPoints`, rules engine, coupon-system integration | No mention in PRD; would extend the Coupons module rather than replace it |
| SMS/email notifications (order confirmation, task reminders, shift reminders) | Notification service + queue (e.g. BullMQ), provider integration (Twilio/SendGrid) | Adds an async job infrastructure not otherwise needed yet |
| Scheduled/automated report generation & delivery | Cron-based job in `modules/reports`, email delivery of generated PDFs | v1 Reports are on-demand only (see §14, open item 3) |
| Offline-capable POS (local order queue + auto-sync) | Service worker, local IndexedDB queue on the POS terminal. If the network drops mid-shift, new orders are written locally first (not lost) and queued; once connectivity returns, the queue auto-syncs to the backend in order, with conflict/duplicate-order resolution (e.g. idempotency key per order created offline) | Real-world need depends on venue's connectivity reliability — assess after v1 launch |
| Kitchen Display System (KDS) | New real-time consumer of the existing Socket.io order events, possibly a dedicated `kds` route/device view | Natural extension of the existing Socket.io order-broadcast — no new data model needed, just a new client |
| Table & reservation management | New `Table`/`Reservation` collections, linkage from `Order.tableNumber` (already reserved as a field) | Out of scope per PRD; the `tableNumber` field on Order is intentionally kept generic so this slots in later without a breaking change |
| QR-code customer self-ordering | New public (no-login) menu route, e.g. `app/(public)/menu/[tableId]`, reading from existing `products`/`categories`; a customer-facing order-submission endpoint that creates an `Order` with `orderType: 'dine-in'` and `source: 'qr'` instead of going through POS; routes into the same Orders/Kitchen flow as staff-created orders | Out of scope per PRD, which scopes ordering to staff via POS; would extend the public Home Page area and the Orders module rather than replace either |
| Mobile native apps (React Native) | Reuses the existing REST/Socket.io API as-is | Backend is already client-agnostic; this is a frontend-only addition |
| Multi-language / i18n | `next-intl` or similar on frontend, localized Settings | No requirement in PRD; Tailwind/shadcn setup doesn't preclude adding it |
| Accounting software integrations (QuickBooks, Tally, Zoho Books) | Outbound sync service in `modules/reports` or a dedicated `modules/integrations` | Not requested; would sit alongside, not inside, existing Expense/Income logic |
| Advanced analytics / forecasting | Extends `modules/dashboard` and `modules/reports` with trend/predictive endpoints | v1 scope is current-period metrics + top-10 items only |

If any of these move into scope, revisit this document first — most affect §5 (collections) or §7 (API conventions) before touching a single feature spec.

---

## 14. Open Items Carried Forward

These don't block ARCHITECTURE.md but should be resolved before `DATABASE.md`:

1. Confirm the assumption table in §1 — especially **multi-location** (it's the one assumption with real schema consequences if wrong).
2. Confirm required Settings fields (tax/GST format varies by country — affects tax calculation logic in POS).
3. Confirm whether Reports need scheduled/automated generation (e.g., emailed daily) or are strictly on-demand for v1.

---
