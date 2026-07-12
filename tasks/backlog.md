# Backlog — Restaurant Management Dashboard

> Every module from `PRD.md`, expanded against `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `AI_RULES.md`, and `theme.md`, in dependency order. Per `guideline.md`'s Golden Rule — **one feature at a time, not all at once** — only one item is ever "in progress." When you start an item, copy its entire block into `tasks/current_task.md` (it's already detailed enough to work from directly — add design specifics there as you go, per `AI_RULES.md` §12 if anything needs to deviate from the docs).
>
> Each item lists: PRD feature #, source doc sections, dependencies, a **Backend**, **Frontend**, and **Design** checklist, the real-time events it owns (if any), and any open item from `API.md` §25 / `DATABASE.md` §8 that must be resolved *during* that task, not before or after.
>
> **Design checklists prescribe layout decisions, not tokens.** Color, type, spacing, radius, status-badge mapping, and responsive breakpoints are fixed once in `theme.md` and inherited by every module below — a Design checklist item is never "pick a badge color" anymore. What's left for each module's own checklist is genuinely page-specific: layout concept, interaction pattern, copy, and anything `theme.md` doesn't cover.

---

## Progress Tracker

- [ok] 0. Project Setup
- [ok] 1. Auth & Access Control
- [ok] 2. Dashboard Shell & Layout Design
- [ok] 3. Users & Permissions
- [ok] 4. Settings
- [ok] 5. Categories
- [ok] 6. Shared Uploads
- [ok] 7. Products
- [ok] 8. Coupons
- [ok] 9. Customers
- [ok] 10. POS
- [ok] 11. Orders
- [ ] 12. Dashboard (Overview)
- [ ] 13. Income
- [ok] 14. Vendors
- [ok] 15. Expenses
- [ok] 16. Task Management
- [ok] 17. Attendance
- [ok] 18. Reports
- [ok] 19. Activity Log (read endpoint — middleware ships with #1)
- [ ] 20. Home Page (Public) — page built in Task 0; this is just the Settings-data wiring follow-up
- [ ] 21. Pre-Launch hardening

---

## 0. Project Setup

**Infrastructure task — not a PRD feature** | `architecture.md` §2, §3, §4, §10 | `AI_rules.md` §1, §2
**Depends on:** nothing — this is the first task in the backlog.
**Blocks:** every other item below — nothing else can start until this is done.

Stand up empty, correctly-configured `frontend/` and `backend/` projects matching the stack and folder structure already locked in `architecture.md`. No features, no business logic, no database models with real fields yet — just a skeleton that runs, lints, and is ready for Task 1 (Auth & Access Control) to be built into it. `docs/`, `prompt/`, and `tasks/` already exist and are populated (Phase 1–2 of `guideline.md` is done) — this task only adds `frontend/` and `backend/`.

**Definition of done:** a fresh clone can run `frontend` and `backend` locally, they can talk to each other over a placeholder route, and the folder structure matches `architecture.md` §3/§4 exactly so no future module has to "fix" the scaffolding around it.

**In scope:** repo/folder structure for `frontend/` + `backend/`; Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui init with empty route groups; Node.js + Express + TypeScript init with the layered folder skeleton (`modules/`, `models/`, `middleware/`, `lib/`, `config/`); ESLint/Prettier/strict TS for both; `.env.example` for both; `config/db.ts` Mongo connection (no models yet); one placeholder `GET /api/v1/health` round trip frontend → backend; Socket.io server initialized (no events yet); Helmet + CORS; git init, root `.gitignore`, root `README.md`.

**Explicitly out of scope (later tasks):** any Mongoose model with real fields (Task 1 defines `User` first); any auth logic, JWT, login form; any of the 15 permission-gated modules' actual routes/pages; CI/CD pipeline (Task 20); Docker/deployment config beyond local dev.

### Backend (`architecture.md` §4)
- [ ] `npm init` + TypeScript + Express setup
- [ ] `src/config/db.ts` — Mongo connection via Mongoose, validated env vars
- [ ] `src/config/env.ts` — Zod-validated env vars
- [ ] `src/config/socket.ts` — Socket.io server init, attached to the HTTP server, no events yet
- [ ] Empty `src/modules/` folder with **one placeholder module** (`health/health.routes.ts`, `health.controller.ts`) to confirm the routes → controller → service convention before Auth is built
- [ ] Empty `src/models/` folder (no models yet — first real one lands in Task 1)
- [ ] `src/middleware/errorHandler.ts` — generic error → `{ error: { code, message } }` envelope per `API.md` §2
- [ ] `src/middleware/validate.ts` skeleton — generic Zod-body validator, no schemas yet
- [ ] Stub `src/middleware/authenticate.ts` and `src/middleware/authorize.ts` as empty pass-through files — not implemented yet, just present so Task 1 isn't also responsible for inventing the file layout
- [ ] `src/lib/` with empty `jwt.ts`, `pdf.ts`, `upload.ts` placeholders
- [ ] Wire Helmet + CORS (restricted to frontend's local dev origin)
- [ ] `GET /api/v1/health` route returning `{ data: { success: true } }` per the success envelope in `API.md` §2 — the only real endpoint in this task
- [ ] `src/app.ts` / `src/server.ts` entry point, starts HTTP + Socket.io server together

### Frontend (`architecture.md` §3)
- [ ] `npx create-next-app` with App Router + TypeScript + Tailwind
- [ ] Install + configure shadcn/ui
- [ ] Implement `theme.md` §2's CSS variables (light + dark) into `app/globals.css`, load the §3 fonts self-hosted via `next/font/google` per `theme.md` §3's decision, and set `darkMode: 'class'` in `tailwind.config` — `theme.md` already exists, so the tokens are wired in here rather than left for Task 1 to invent
- [x] Empty route group folders: `app/(public)/`, `app/(auth)/login/`, `app/(dashboard)/` with placeholder `page.tsx`/`layout.tsx` files (just enough to render, no real content)
- [ ] Empty `features/` folder with one placeholder module folder to confirm the convention (no real feature yet)
- [ ] `components/ui/` (shadcn output) and `components/shared/` (empty, ready for `DataTable`, `PermissionGate`, etc.)
- [ ] `lib/api-client.ts` skeleton (fetch wrapper, JWT-attach stub — no real refresh logic yet)
- [ ] `lib/socket.ts` skeleton (Socket.io client init, not connected to real events yet)
- [ ] `stores/auth-store.ts` skeleton (Zustand store shape, no real auth wiring yet)
- [ ] Install TanStack Query, Zustand, React Hook Form, Zod — confirm versions resolve cleanly together
- [ ] One placeholder page that calls the backend's `/health` endpoint and renders the result, proving the API client + CORS + env vars work end to end

### Shared Tooling
- [ ] ESLint config (shared rule set, TypeScript strict, no `any` per `AI_rules.md` §1) for both `frontend/` and `backend/`
- [ ] Prettier config, consistent between both apps
- [ ] `.env.example` for both apps (no real secrets committed)
- [ ] Confirm `npm run dev` works for both apps independently and concurrently (document whichever approach is chosen — root script vs. two terminals)

### Verification
- [ ] Fresh clone → install deps → run both apps → frontend's placeholder page successfully displays the backend's `/health` response
- [ ] `tsc --noEmit` passes clean on both apps (no type errors in the empty skeleton)
- [ ] Lint passes clean on both apps
- [ ] Folder structure visually matches `architecture.md` §3 and §4 — no extra ad hoc folders invented mid-setup

### Design
- [ ] `theme.md` tokens (color, type, spacing, radius, breakpoints) are implemented per the Frontend checklist above — no new color/type/spacing decisions get made in this task, only the wiring-in of decisions already made in `theme.md`

---

## 1. Auth & Access Control

**PRD Feature 2** | `API.md` §5 | `DATABASE.md` §3.1, §3.2 | `ARCHITECTURE.md` §6
**Depends on:** Project Setup
**Blocks:** everything — no other module is reachable without login.

### Backend
- [ ] `User` Mongoose model (`name`, `email` unique/lowercase, `passwordHash`, `role` enum, `permissions[]`, `isActive`, `lastLoginAt`) — fields exactly per `DATABASE.md` §3.1, no extras
- [x] `PasswordResetToken` model (`userId`, `tokenHash`, `expiresAt` with TTL index, `used`) per §3.2 — **REMOVED** in forgot-password removal
- [ ] `lib/jwt.ts` — sign/verify access token (15 min) and refresh token (7 days)
- [ ] `middleware/authenticate.ts` — real implementation: verify Bearer token, attach `req.user = { id, role, permissions }`
- [ ] bcrypt hashing (cost 12) on password set/reset — never log or return `passwordHash`, exclude it at query projection level
- [ ] `POST /auth/login` — credential check, `423 ACCOUNT_DEACTIVATED` if `isActive: false`, `401 INVALID_CREDENTIALS` for both wrong password and unknown email (no enumeration leak), set refresh cookie httpOnly+secure, return access token + user + permissions in body
- [ ] `POST /auth/refresh` — verify refresh cookie, issue new access token
- [ ] `POST /auth/logout` — clear refresh cookie
- [x] `POST /auth/forgot-password` — **REMOVED**
- [x] `POST /auth/reset-password` — **REMOVED**
- [ ] `GET /auth/me` — return current user + permissions for store hydration
- [x] Rate limiting on `/auth/login` and `/auth/forgot-password` (`ARCHITECTURE.md` §12) → `429 RATE_LIMITED` — forgot-password limiter removed
- [ ] Wire the global `activityLogger` middleware now (it's infrastructure, not feature-specific) so every mutating route from this point on is automatically logged

### Frontend
- [x] `features/auth/api.ts` — React Query hooks: `useLogin`, `useLogout`, `useMe` (forgotPassword/resetPassword removed)
- [x] `features/auth/schema.ts` — Zod schemas shared in shape with backend validation (login only; forgot/reset schemas removed)
- [ ] `app/(auth)/login/page.tsx` — login form (React Hook Form + Zod)
- [x] `app/(auth)/forgot-password/page.tsx` — **REMOVED**
- [x] `app/(auth)/reset-password/page.tsx` — **REMOVED**
- [ ] `stores/auth-store.ts` — real implementation: holds user, permissions, access token in memory; hydrates from `GET /auth/me` on app load
- [ ] `lib/api-client.ts` — real implementation: attaches `Authorization: Bearer`, transparently calls `/auth/refresh` and retries once on `401`
- [ ] `(dashboard)/layout.tsx` — session check, redirect unauthenticated users to `/login`
- [ ] Logout action (clears store, calls `POST /auth/logout`, redirects to `/login`)

### Design
- [ ] Decide login page layout (centered card vs split-screen vs full illustration) — consult `frontend-design` skill before building
- [ ] Decide error-state presentation for `INVALID_CREDENTIALS` (inline field error vs toast vs banner) — keep consistent with how validation errors will look everywhere else in the app, since this is the first form built
- [ ] Decide loading/pending state for the login button (disabled + spinner vs skeleton)
- [x] Decide forgot/reset-password flow's confirmation messaging — **REMOVED**
- [x] Tokens are already established in `theme.md` and wired in during Project Setup — confirm the login form uses them; no new color/type/spacing decisions get made here

### Open item to resolve during this task
- `API.md` §25.4 — confirm account creation reuses the reset-password token mechanism (vs. an admin-sets-password-directly flow) before Users & Permissions builds `POST /users` against it. **RESOLVED:** Admin sets password directly; forgot-password flow removed entirely.

---

## 2. Dashboard Shell & Layout Design

**Infrastructure/UI task — not a standalone PRD feature** | `architecture.md` §3 (`(dashboard)` route group, `components/shared/`) | `theme.md` (tokens — **referenced throughout this backlog but not found among the current project docs; see Open Items below**)
**Depends on:** Auth & Access Control (needs the session-gated `(dashboard)/layout.tsx` skeleton and `stores/auth-store.ts` built there)
**Blocks:** every dashboard-area module from Task 3 onward — every page from here forward renders inside this shell, so its layout, responsive behavior, and theming need to be locked in before module pages multiply and each has to be retrofitted individually.

This task designs and builds the **persistent chrome** every authenticated page lives inside: sidebar navigation, top bar, responsive collapse behavior, and dark/light theme wiring. It is deliberately separate from PRD Feature 3 (the Dashboard *Overview* page with metrics/top-items — see Task 12, "Dashboard (Overview)"), which is the first thing a user sees **inside** this shell, not the shell itself.

**Known dependency gap — flagged, not silently worked around:** the sidebar's nav-link visibility is supposed to be permission-gated (`<PermissionGate module action>`), but that component and `lib/permissions.ts`'s `hasPermission` helper aren't built until Task 3 (Users & Permissions), which comes *after* this task. Resolution: this task ships the shell with **all nav links visible unconditionally**; Task 3 wires real permission-based visibility into the same `Sidebar` component as one of its own checklist items (added below). Don't invent a temporary permission stub here that could diverge from Task 3's real implementation.

### Backend
- [ ] None — this is a frontend-only task.

### Frontend
- [ ] `components/shared/Sidebar.tsx` — nav-link list for all 15 permission-gated modules plus Dashboard Overview and Activity Log; icon + label, active-route highlighting; all links visible unconditionally for now (see dependency gap above)
- [ ] `components/shared/TopBar.tsx` — restaurant name/logo (reads from `Settings` once Task 4 exists; placeholder text/logo until then), current user name, logout action, theme toggle
- [ ] `components/shared/MobileNav.tsx` — hamburger-triggered drawer/sheet for narrow viewports, reusing the same nav-link data as `Sidebar` (single source of truth, not a duplicated list)
- [ ] `app/(dashboard)/layout.tsx` — extend the session-gate-only version from Task 1 to render `Sidebar` + `TopBar` + page content, swapping to `MobileNav` below the chosen breakpoint
- [ ] Dark/light mode toggle wired to `theme.md`'s CSS variables and Tailwind's `darkMode: 'class'` (already configured in Project Setup) — toggle lives in `TopBar`, persisted via the auth/UI Zustand store (never `localStorage`/`sessionStorage`)
- [ ] Route-level code splitting: each `(dashboard)/<module>/page.tsx` lazy-loads its own feature bundle rather than the shell pulling in every module's JS upfront
- [ ] `lucide-react` icons imported individually (named imports only) so unused module icons don't bloat the shared shell bundle
- [ ] Skeleton/loading state for the content area during route transitions, to avoid a blank-screen flash on navigation
- [ ] Sidebar collapsed/expanded state persisted in a Zustand UI store, not browser storage

### Design
- [ ] Decide the sidebar pattern per breakpoint — consult the `frontend-design` skill before building:
  - **Desktop (≥1024px):** persistent full sidebar (icon + label)
  - **Tablet (768–1023px):** collapsible icon-only rail, expandable on hover/tap
  - **Mobile (<768px):** hidden by default; hamburger in `TopBar` opens a full-height drawer/sheet over the content — not a bottom tab bar, since 15+ modules won't fit legibly in one
- [ ] Decide `TopBar` content priority on the smallest supported width (restaurant name/logo vs. user menu vs. theme toggle — what survives at ~320px without crowding or truncation)
- [ ] Confirm all interactive nav/touch targets meet ≥44px per `TEST_CASES.md` CC-MOB-01
- [ ] Confirm dark-mode token application has no flash-of-wrong-theme on initial load, per `TEST_CASES.md` CC-MOB-05
- [ ] Re-confirm `theme.md`'s breakpoint values match the ones used here — every later module's "Mobile" design checklist item inherits these breakpoints, so a mismatch here propagates everywhere

### Open items to resolve during this task
- **`theme.md` is referenced as the authoritative source for tokens/breakpoints throughout this backlog (Project Setup and every later module's Design checklist) but was not found among the project docs provided for this task.** Locate/attach the actual file before finalizing colors, type, spacing, radius, and breakpoints here — if it genuinely doesn't exist yet, this task should produce those tokens as a byproduct rather than each later module inventing its own. Flag explicitly; don't silently guess values.
- Sidebar permission-gating is intentionally deferred to Task 3 (see "Known dependency gap" above) — confirmed picked up there; don't let it get silently dropped when Task 3 is scoped.

---

## 3. Users & Permissions

**PRD Feature 13** | `API.md` §6 | `DATABASE.md` §3.1 | `ARCHITECTURE.md` §6
**Depends on:** Auth & Access Control, Dashboard Shell & Layout Design (Task 2) — wires real permission checks into the `Sidebar` component built there
**Blocks:** every other module's real permission enforcement (everything currently relies on the Auth task's `authenticate` only — `authorize` becomes real here).

### Backend
- [ ] `middleware/authorize.ts` — real implementation: `authorize(module, action)` checks `req.user.permissions`, default-deny if module absent, `admin` bypasses entirely
- [ ] `GET /users` (`?includeInactive=`), `GET /users/:id`
- [ ] `POST /users` — create without usable password, issue `PasswordResetToken`, send "set your password" email (reusing Auth's mechanism per the resolved open item)
- [ ] `PUT /users/:id` — name/email/role only, explicitly reject/strip `permissions`/`password` if sent
- [ ] `PATCH /users/:id/permissions` — replace array, log as `user.permissions_updated` (distinct action string from `user.updated`)
- [ ] `PATCH /users/:id/deactivate` — `409 CANNOT_DEACTIVATE_SELF`, `409 LAST_ADMIN_PROTECTED` guard rails in the service layer
- [ ] `PATCH /users/:id/activate`
- [ ] `DELETE /users/:id` — alias for deactivate, inherits the same guard rails
- [ ] Validate `permissions[].module` against the fixed module-key list in `API.md` §24, reject unknown keys

### Frontend
- [ ] `features/users/api.ts`, `schema.ts`
- [ ] Users list page with active/inactive toggle
- [ ] User create form
- [ ] User edit form (name/email/role — separate from permissions)
- [ ] Permission editor UI — per-module checkboxes/toggles for `view/create/edit/delete`, scoped to the 15 keys in `API.md` §24
- [ ] Deactivate/activate actions with confirmation prompts (especially since self-deactivation and last-admin attempts will 409)
- [ ] `lib/permissions.ts` — `hasPermission(user, module, action)` helper
- [ ] `<PermissionGate module action>` shared component (`components/shared/`) — build it here, every later module's pages wrap content in it
- [ ] `hooks/usePermission.ts`
- [ ] Wire real permission-based visibility into `components/shared/Sidebar.tsx` (built in Task 2) — replace its unconditional nav-link list with `hasPermission` checks per module, closing the gap flagged in Task 2

### Design
- [ ] Decide the permission editor's interaction pattern — matrix/grid (modules × actions) vs per-module accordion — this is the most complex UI decision in the whole admin area, worth deliberate thought
- [ ] Decide how a 403-from-API surfaces in the UI for a page the user technically navigated to (shouldn't normally happen since `PermissionGate` hides nav, but defense-in-depth still needs a fallback state)
- [ ] Decide deactivated-user visual treatment in the list (greyed row, badge, separate tab)

### Open item to resolve during this task
- `API.md` §25.4 (finish resolving, since this task implements it directly).

---

## 4. Settings

**PRD Feature 14** | `API.md` §20 | `DATABASE.md` §3.14
**Depends on:** Users & Permissions
**Why early:** POS's tax calculation reads `Settings.taxConfig` — needs to exist (even with defaults) before POS is finished.

### Backend
- [ ] `Settings` model, singleton via fixed `_id`
- [ ] `GET /settings`
- [ ] `PUT /settings` — **merge**, not replace; only submitted top-level fields overwrite, untouched sections (e.g. `logo`) survive a Tax-only save
- [ ] Seed/upsert the singleton document on first boot if it doesn't exist yet, so `GET /settings` never 404s

### Frontend
- [ ] `features/settings/api.ts`, `schema.ts`
- [ ] Settings page split into sections: Business Info, Tax, Business Hours, Logo — each section saves independently (calls `PUT /settings` with only its own fields)
- [ ] Logo upload (uses Shared Uploads endpoint — build that task first or stub it temporarily)

### Design
- [ ] Decide section layout: tabs vs single scrollable page with anchored sections
- [ ] Decide save-feedback pattern per section (since each section saves independently, each needs its own success/error state, not one global save button)

### Open item to resolve during this task
- `DATABASE.md` §8.2 — confirm `taxConfig.mode` for v1 is `flat` only, or whether `itemized` is needed now. This gates POS's tax logic, so decide before POS starts.

---

## 5. Categories

**PRD Feature 12** | `API.md` §17 | `DATABASE.md` §3.3
**Depends on:** Users & Permissions

### Backend
- [ ] `Category` model (`name` unique, `isActive`)
- [ ] Full CRUD: `GET /categories?isActive=`, `GET /:id`, `POST`, `PUT`, `DELETE` (soft delete)
- [ ] Confirm soft-deleted category's referencing Products keep their (now-inactive) reference, hidden only from active dropdowns

### Frontend
- [ ] `features/categories/api.ts`, `schema.ts`
- [ ] Categories list (with inactive toggle)
- [ ] Create/edit form
- [ ] Delete confirmation (mention it's a soft delete / what happens to linked products)

### Design
- [ ] Decide if this is a full page or a modal-driven simple list — Categories is low-complexity, doesn't need its own dense page necessarily

---

## 6. Shared Uploads

**Utility, not its own PRD feature** | `API.md` §4
**Depends on:** Users & Permissions (permission check happens at the calling route, not here)
**Used by:** Products (image), Settings (logo)

### Backend
- [ ] `lib/upload.ts` — Cloudinary client wrapper
- [ ] `POST /uploads/image` — `multipart/form-data`, MIME + size validation **before** reaching Cloudinary, `400 UNSUPPORTED_FILE_TYPE` / `400 FILE_TOO_LARGE`
- [ ] Confirm this endpoint never itself writes to Mongo — it only returns `{ url, publicId }` for the caller to embed

### Frontend
- [ ] A reusable image-upload component (`components/shared/`) — drag/drop or click-to-browse, used by both Products and Settings forms
- [ ] Preview + replace/remove UI

### Design
- [ ] Decide upload component's visual states: empty/drag-hover/uploading/uploaded/error
- [ ] Decide image aspect ratio/crop expectations for product photos vs the logo (likely different)

---

## 7. Products

**PRD Feature 11** | `API.md` §16 | `DATABASE.md` §3.4
**Depends on:** Categories, Shared Uploads

### Backend
- [ ] `Product` model (`name`, `price`, `categoryId`, `image`, `description`, `isActive`)
- [ ] Full CRUD: `GET /products?categoryId=&isActive=&search=`, `GET /:id`, `POST`, `PUT` (including `isActive` toggle for restore), `DELETE` (soft delete)
- [ ] Text index on `name` for search

### Frontend
- [ ] `features/products/api.ts`, `schema.ts`
- [ ] Products list (filter by category, active/inactive, search)
- [ ] Create/edit form with image upload
- [ ] Delete (soft) with confirmation

### Design
- [ ] Decide product list layout: table vs card grid (card grid may make more sense given images are involved)
- [ ] Decide image placeholder for products with no photo set

---

## 8. Coupons

**PRD Feature 6** | `API.md` §11 | `DATABASE.md` §3.5
**Depends on:** Users & Permissions
**Why before POS:** POS's validate/apply flow depends on Coupons existing first.

### Backend
- [ ] `Coupon` model (`code` unique/uppercase, `discountType`, `value`, `maxDiscountAmount`, `minOrderAmount`, `validFrom`, `validUntil`, `isEnabled`, `usageLimit`, `usageCount`)
- [ ] `GET /coupons?isEnabled=&search=` — includes computed `status` field (`active|expired|scheduled|disabled`)
- [ ] `GET /:id`, `POST`, `PUT` (full edit)
- [ ] `PATCH /coupons/:id/toggle`
- [ ] `DELETE /coupons/:id` — `409 COUPON_IN_USE` if `usageCount > 0`, message points to `toggle` instead
- [ ] Validate `percentage` type caps at 100, `flat` type is non-negative

### Frontend
- [ ] `features/coupons/api.ts`, `schema.ts`
- [ ] Coupons list with computed status badge
- [ ] Create/edit form (conditional fields based on `discountType`)
- [ ] Toggle action (quick enable/disable)
- [ ] Delete with the in-use-blocked messaging surfaced clearly

### Design
- [ ] Decide status badge colors/labels for `active|expired|scheduled|disabled`
- [ ] Decide form UX for `maxDiscountAmount` — only show when `discountType: percentage` is selected

---

## 9. Customers

**PRD Feature 17** | `API.md` §18 | `DATABASE.md` §3.6
**Depends on:** Users & Permissions
**Why before POS:** POS checkout can optionally attach a customer.

### Backend
- [ ] `Customer` model (`name`, `phone` non-unique, `email`, `address`, `isActive`)
- [ ] `GET /customers?search=` (name or phone, text index), `GET /:id?includeOrders=true` (populate recent Order history)
- [ ] `POST`, `PUT`, `DELETE` (soft delete)

### Frontend
- [ ] `features/customers/api.ts`, `schema.ts`
- [ ] Customers list + search
- [ ] Create/edit form
- [ ] Customer detail view with order history (used later once Orders exists)

### Design
- [ ] Decide how duplicate-phone customers are surfaced as a UX nudge at creation time (not a hard block, per `DATABASE.md` §3.6) — e.g. "a customer with this phone already exists, link instead?"

---

## 10. POS

**PRD Feature 4** | `API.md` §9 | `DATABASE.md` §3.8, §3.9 | `ARCHITECTURE.md` §5
**Depends on:** Products, Categories, Coupons, Customers, Settings (tax config)
**⚠️ Highest-risk task in the backlog — budget real time for the transaction/concurrency cases in `TEST_CASES.md` §5 and §20.**

### Backend
- [ ] `Order` model + embedded `OrderItem` schema, exactly per `DATABASE.md` §3.8 (snapshot fields, no shortcuts)
- [ ] `Counter` model + atomic `findOneAndUpdate $inc` helper for `orderNumber` generation
- [ ] `GET /pos/products?categoryId=&search=` — lean payload (`id, name, price, image.url, categoryId`), `isActive: true` only
- [ ] `POST /pos/coupons/validate` — read-only preview, all `reason` codes (`NOT_FOUND|DISABLED|NOT_YET_VALID|EXPIRED|BELOW_MIN_ORDER|USAGE_LIMIT_REACHED`), confirm `usageCount` is **not** touched
- [ ] `POST /pos/orders` — the core transaction: server recalculates `subtotal`/`discountAmount`/`taxAmount` from `items`+`couponCode`+`Settings.taxConfig`, never trusts client totals; wraps `Counter` increment + `Order` insert + `Coupon.usageCount $inc` + `ActivityLog` write in one Mongo transaction
- [ ] `status` defaults to `completed` if omitted, `pending` if explicitly passed
- [ ] `409 COUPON_USAGE_LIMIT_REACHED` (race re-check inside transaction), `409 PRODUCT_UNAVAILABLE` (deactivated mid-checkout)
- [ ] Emit `order:created` and `dashboard:metricsInvalidate` on success

### Frontend
- [ ] `features/pos/api.ts`, `schema.ts`
- [ ] `features/pos/store.ts` — Zustand cart store (survives background refetches, isolated from React Query cache per `ARCHITECTURE.md` §8)
- [ ] `ProductGrid` component (browse/select, quantity adjust)
- [ ] `Cart` component
- [ ] `CouponInput` component (calls validate endpoint live as cart changes, shows discount preview)
- [ ] `BillPreview` component
- [ ] Order type / table number selector (dine-in/takeaway/delivery)
- [ ] Payment method selector, including split-payment UI
- [ ] Checkout action → `POST /pos/orders`, clear cart on success, show confirmation/bill

### Design
- [ ] Decide POS screen layout: product grid + persistent side cart vs full-screen cart on mobile (tablet vs phone behavior likely differs — POS is the one screen with an explicit "fast loading" NFR and heavy mobile/tablet use)
- [ ] Decide touch-target sizing for the counter-use tablet scenario specifically (this is the one screen where mobile usability isn't optional polish)
- [ ] Decide bill preview's print-friendly styling (separate from on-screen styling, since `GET /orders/:id/bill?format=pdf|html` reuses this template)

---

## 11. Orders

**PRD Feature 5** | `API.md` §10 | `DATABASE.md` §3.8
**Depends on:** POS

### Backend
- [ ] `GET /orders?status=&from=&to=&createdBy=&customerId=&search=&sort=-createdAt`
- [ ] `GET /orders/:id` (populated `customerId`/`createdBy`)
- [ ] `PUT /orders/:id` — **only** `tableNumber`, `orderType`, `customerId` editable; reject/strip financial fields
- [ ] `PATCH /orders/:id/status` — valid transitions only (`pending→completed`, `pending→cancelled`, `completed→cancelled` requires `cancelReason`), `cancelled` terminal
- [ ] `GET /orders/:id/bill?format=pdf|html` — Puppeteer render, reusing POS's bill template
- [ ] `DELETE /orders/:id` — narrow restriction (same-day, `pending`, no coupon usage), `409 ORDER_NOT_DELETABLE` otherwise
- [ ] Emit `order:statusChanged` on transition

### Frontend
- [ ] `features/orders/api.ts`, `schema.ts`
- [ ] Orders list (filters, search, status badges)
- [ ] Order detail page (`[orderId]/page.tsx`)
- [ ] Status transition action (cancel with reason prompt, complete)
- [ ] Bill view/print/download action
- [ ] Restricted edit form (table/type/customer only)

### Design
- [ ] Decide order status badge visual language (shared with Dashboard/POS where status also appears)
- [ ] Decide cancel-reason input — modal prompt vs inline field
- [ ] Decide Orders list mobile degradation pattern (per `TEST_CASES.md` ORD-MOB-01)

### Open items to resolve during this task
- `API.md` §25.1 — Order hard-delete vs schema (decide permanently, or add `isActive`/`deletedAt` to `DATABASE.md` §3.8).
- `API.md` §25.3 — whether `completed → cancelled` needs a stricter permission/approval than plain `orders:edit`.

---

## 12. Dashboard (Overview)

**PRD Feature 3** | `API.md` §7 | `DATABASE.md` §5.4
**Depends on:** Orders (needs real completed orders to aggregate)

### Backend
- [ ] Shared cancelled-exclusion aggregation helper — build it here, Income and Reports both reuse it
- [ ] `GET /dashboard/metrics?range=` (`totalEarned`, `totalProductsSold`, `totalOrdersCompleted`)
- [ ] `GET /dashboard/top-items?range=&limit=10` (multikey index aggregation on `Order.items`)
- [ ] `Cache-Control: private, max-age=15` placeholder header

### Frontend
- [ ] `features/dashboard/api.ts`
- [ ] `hooks/useDateRangeFilter.ts` — shared across Dashboard/Income/Reports/Attendance/Orders/Expenses, build it here first
- [ ] Metric cards (`MetricCard` shared component)
- [ ] Top-10 items list/chart
- [ ] Quick-access shortcuts to other modules
- [ ] Wire `dashboard:metricsInvalidate` socket listener → `queryClient.invalidateQueries(['dashboard'])`

### Design
- [ ] Decide metric card visual treatment (numbers-forward, trend indicators if any)
- [ ] Decide top-items presentation: ranked list vs bar chart
- [ ] Decide date-range filter control's shared UI (built once here, reused everywhere else `useDateRangeFilter` is used)

---

## 13. Income

**PRD Feature 16** | `API.md` §8
**Depends on:** Dashboard (Overview) (reuses its aggregation helper and permission key)

### Backend
- [ ] `GET /income?range=&groupBy=product` — per-product breakdown reusing the Dashboard aggregation helper

### Frontend
- [ ] `features/dashboard/api.ts` (Income lives in the Dashboard feature folder per `ARCHITECTURE.md` §9 — sub-view, not its own feature folder)
- [ ] Income breakdown table/view, same `useDateRangeFilter` control

### Design
- [ ] Decide whether Income is a tab within the Dashboard page or a separate route under the same permission gate

### Open item to resolve during this task
- `API.md` §25.2 — confirm Income stays folded into `dashboard:view` rather than getting its own permission key, **before** any real user accounts have `permissions` data that would need migrating later.

---

## 14. Vendors

**PRD Feature 10** | `API.md` §15 | `DATABASE.md` §3.7
**Depends on:** Users & Permissions

### Backend
- [ ] `Vendor` model (`name`, `contactPerson`, `phone`, `email`, `address`, `itemsSupplied[]`, `isActive`)
- [ ] Full CRUD, soft delete

### Frontend
- [ ] `features/vendors/api.ts`, `schema.ts`
- [ ] Vendors list + search
- [ ] Create/edit form (`itemsSupplied` as free-text tag input)

### Design
- [ ] Decide tag-input UX for `itemsSupplied`

---

## 15. Expenses

**PRD Feature 9** | `API.md` §14 | `DATABASE.md` §3.12
**Depends on:** Vendors (optional `vendorId` link)

### Backend
- [ ] `Expense` model (`amount`, `date`, `description`, `category`, `vendorId` optional, `paidBy`, `paidTo`, `paymentMethod`, `createdBy`)
- [ ] `GET /expenses?range=&category=&vendorId=`, `GET /:id`, `POST`, `PUT`, `DELETE` (hard delete — no `isActive` field)

### Frontend
- [ ] `features/expenses/api.ts`, `schema.ts`
- [ ] Expenses list with date-range + category filters
- [ ] Create/edit form (vendor picker optional, free-text `paidTo` fallback)

### Design
- [ ] Decide category selector UX pending the open item below (dropdown if enum, free-text/combobox if not)

### Open item to resolve during this task
- `DATABASE.md` §8.3 — `category` as fixed enum vs free text. Leaning enum per that doc; confirm before building the validation schema and the frontend selector.

---

## 16. Task Management

**PRD Feature 7** | `API.md` §12 | `DATABASE.md` §3.10
**Depends on:** Users & Permissions

### Backend
- [ ] `Task` model (`title`, `description`, `assignedTo`, `assignedBy`, `priority`, `deadline`, `status`, `completedAt`)
- [ ] `GET /tasks?assignedTo=&status=&priority=&sort=deadline`, `GET /:id`, `POST`, `PUT`, `PATCH /:id/status` (sets `completedAt`), `DELETE` (hard delete)
- [ ] Emit `task:assigned` on create/reassign

### Frontend
- [ ] `features/tasks/api.ts`, `schema.ts`
- [ ] Task list (filterable by assignee/status/priority)
- [ ] Create/edit form (assignee picker from Users)
- [ ] Status transition action
- [ ] Live task badge for assignee (socket-driven)

### Design
- [ ] Decide priority visual treatment (color-coded tags)
- [ ] Decide whether employees see only their own tasks by default vs. a toggle to see all (flagged ambiguity in `TEST_CASES.md` TASK-AUTH-01 — resolve here)

---

## 17. Attendance

**PRD Feature 8** | `API.md` §13 | `DATABASE.md` §3.11
**Depends on:** Users & Permissions

### Backend
- [ ] `Attendance` model (`userId`, `date`, `checkInAt`, `checkOutAt`, `notes`), unique compound index `{userId, date}`
- [ ] `POST /attendance/check-in` (self or `{userId}` for manager-on-behalf), `409 ALREADY_CHECKED_IN`
- [ ] `PATCH /:id/check-out`
- [ ] `PUT /:id` — manual correction with `notes`, no delete route at all
- [ ] `GET /attendance?userId=&range=`, `GET /:id`
- [ ] `hoursWorked` computed at read time only, never stored
- [ ] Emit `attendance:checkedIn` / `attendance:checkedOut`

### Frontend
- [ ] `features/attendance/api.ts`, `schema.ts`
- [ ] Check-in/check-out action (self-service)
- [ ] Attendance history table per staff member
- [ ] Manual correction form (admin/manager only)

### Design
- [ ] Decide the check-in/out action's prominence (e.g. persistent header button vs dedicated page) given it's likely used daily by every staff member

---

## 18. Reports

**PRD Feature 18** | `API.md` §19
**Depends on:** Dashboard (Overview), Income, Expenses, Attendance (reports on all four data sources)

### Backend
- [ ] `GET /reports/:type?range=&from=&to=` for `sales|income|expense|attendance`, reusing the Dashboard aggregation helper
- [ ] `GET /reports/:type/export?range=&from=&to=&format=pdf` — Puppeteer render, `create` permission action (not `view`)

### Frontend
- [ ] `features/reports/api.ts`
- [ ] Report type selector + date-range filter (reuse `useDateRangeFilter`)
- [ ] On-screen report view per type
- [ ] Export/download button

### Design
- [ ] Decide on-screen report layout (likely close to the PDF template, to minimize divergence between what's viewed and what's exported)
- [ ] Decide PDF template branding (uses `Settings.logo`/`restaurantName`)

---

## 19. Activity Log

**PRD Feature 15** | `API.md` §21 | `DATABASE.md` §3.13
**Note:** the writing middleware (`activityLogger`) ships in Task 1 (Auth), since it's global infrastructure. This task is the **read-only endpoint + viewer UI** only.

### Backend
- [ ] `ActivityLog` model (append-only, no `updatedAt`)
- [ ] `GET /activity-log?actor=&module=&action=&from=&to=` — reverse-chronological
- [ ] Confirm no `PUT`/`PATCH`/`DELETE` route is ever registered (read-only by omission)

### Frontend
- [ ] `features/activity-log/api.ts`
- [ ] Feed view with filters (actor, module, action, date range)

### Design
- [ ] Decide feed item visual format (icon-per-module, timestamp prominence)

---

## 20. Home Page (Public)

**PRD Feature 1** | `architecture.md` §3 (`app/(public)`)
**Status note:** the page itself (`app/(public)/page.tsx`, navbar, "Admin Login" button, mobile responsiveness) was pulled forward and built in **Task 0 (Project Setup)** — see `current_task.md`'s Notes for that task. What's left here is narrower than originally scoped.
**Depends on:** Settings (Task 3) — for the live branding data this task wires in

### Backend
- [ ] None — static/SSR, no auth; may read public `Settings` fields (name/logo) if desired

### Frontend
- [ ] Replace the hardcoded placeholder branding (restaurant name/tagline) on the existing `app/(public)/page.tsx` with live `Settings.restaurantName` / `Settings.logo` data
- [ ] Confirm the page still renders sensibly if `Settings` fields are unset (no broken layout on a missing logo)

### Design
- [ ] None remaining — content/branding decisions were already made in Task 0; this task is just the data-wiring follow-up

---

## 21. Pre-Launch Hardening

Not a feature — run once all modules above are checked off.

- [ ] **AI Code Review pass** (`guideline.md` Phase 5) — "Act as a principal software architect, find design flaws" across the full codebase
- [ ] **AI QA Testing pass** (Phase 6) — work through `TEST_CASES.md` module by module; log failures as bugfix items appended to this backlog
- [ ] **Security review** (Phase 8) — auth, authorization, rate limiting, XSS/CSRF, Mongo injection, secrets management
- [ ] **Deployment checklist** (Phase 8) — stand up `ARCHITECTURE.md` §10 topology (Vercel + Render/Railway/ECS + Atlas + Cloudinary)
- [ ] **CI/CD pipeline** — GitHub Actions: lint + typecheck + test on PR, deploy on merge to `main`

---

## Explicitly Deferred (Post-v1 — do not pull into this backlog without revisiting `ARCHITECTURE.md` §13 first)

Multi-tenant support · Product inventory/stock · Vendor↔Product linkage · Online payment gateway · Customer loyalty/rewards · SMS/email notifications · Scheduled/automated report delivery · Offline-capable POS · Kitchen Display System · Table/reservation management · QR self-ordering · Mobile native apps · i18n · Accounting integrations · Advanced analytics/forecasting.

---

## How to Use This File

1. Pick the next unchecked item — dependencies are already ordered top-to-bottom, so working straight down the list is safe.
2. Copy its entire block (Backend/Frontend/Design checklists) into `tasks/current_task.md`.
3. Resolve any "Open item to resolve during this task" note **first** — update `API.md`/`DATABASE.md`, then build against the corrected doc, not the open question.
4. Add design specifics to `current_task.md` as you make them (don't pre-decide them here) — note any deviation from the architecture docs per `AI_RULES.md` §12.
5. When done: run the matching `TEST_CASES.md` section, do a quick AI code-review pass on just that module, copy any entries from `current_task.md`'s "Notes / Decisions Made During This Task" section into `docs/decisions.md` (confirming the resolved open item has actually been edited into the relevant upstream doc — PRD/architecture/database/API/AI_rules — not just logged here), then check it off both here and in the Progress Tracker, and clear `current_task.md` for the next pick.