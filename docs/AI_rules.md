# AI Rules — Restaurant Management Dashboard

> Derived from `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, and `theme.md`. This document does not make new product or architectural decisions — it translates decisions already made in those five documents into enforceable coding rules for every prompt that generates code. Where a rule below states a constraint, the source document is named so a contributor can trace *why* without re-deriving it.
>
> Every feature-generation prompt should read this file alongside `PRD.md`, `ARCHITECTURE.md`, and `theme.md`, per `guideline.md` Phase 2.

---

## 1. Stack — No Substitutions

These are locked by `ARCHITECTURE.md` §2. Do not introduce an alternative library "because it's simpler" for a one-off feature — consistency across 18 modules matters more than local convenience.

| Concern | Required | Do not use |
|---|---|---|
| Language | TypeScript, strict mode, no `any` | Plain JS, `any`, `unknown` left unnarrowed |
| Frontend framework | Next.js 14 App Router | Pages Router, CRA, Vite SPA |
| Styling | Tailwind CSS + shadcn/ui | CSS Modules, styled-components, inline `style={}` except for truly dynamic values (e.g. computed chart colors) |
| Server-state | TanStack Query | `useEffect` + manual `fetch`, SWR |
| Client/UI state | Zustand | Redux, Context for anything beyond theme/locale |
| Forms | React Hook Form + Zod | Uncontrolled forms without RHF, custom validation logic that bypasses Zod |
| Backend | Node.js + Express + TypeScript | Fastify, Nest, serverless functions for core modules |
| ORM | Mongoose | Native MongoDB driver calls outside `lib`/migration scripts |
| Auth | JWT (access + refresh), bcrypt (cost 12) | Sessions stored server-side, Auth0/Clerk/third-party auth providers |
| Real-time | Socket.io | Polling for anything listed in API.md §22 |
| PDF | Puppeteer | jsPDF, pdfkit, client-side PDF generation |
| File storage | Cloudinary | Storing binary/base64 in MongoDB |

---

## 2. Project Structure

Follow `ARCHITECTURE.md` §3 (frontend) and §4 (backend) exactly. Every new module's files land in the same shape as existing modules — no exceptions, no "just this once" flat files.

**Frontend, per module:**
```
features/<module>/
├── api.ts          # React Query hooks only — no fetch calls outside this file
├── schema.ts        # Zod schemas, shared shape with backend validation
├── store.ts          # only if the module needs Zustand (e.g. POS cart) — omit otherwise
└── components/
```

**Backend, per module:**
```
modules/<module>/
├── <module>.routes.ts
├── <module>.controller.ts
├── <module>.service.ts      # business logic lives HERE, not in controllers
└── <module>.validation.ts   # Zod schemas
```

**Rules:**
- Controllers parse `req`/build `res`. They never contain business logic, Mongo queries, or calculation logic — that's the service's job (`ARCHITECTURE.md` §4: "Business logic lives in services so it's testable independent of HTTP").
- Routes only wire `middleware → controller`. No inline logic in route files.
- One Mongoose model file per collection in `models/`, matching `DATABASE.md` §3 exactly — field names, types, and enums must match the schema document verbatim. If a model needs a field DATABASE.md doesn't list, update DATABASE.md first; don't let schema drift silently into code.
- New modules always follow the three sub-endpoint patterns in `API.md` §3 (Resource CRUD / State-transition action / Module-level tool). Don't invent a fourth shape for a new sub-feature — pick whichever of the three fits.

---

## 3. API Contract Discipline

`API.md` is the binding contract. Generated code must match it exactly, not "close enough."

- **Base path** `/api/v1` on every route.
- **Envelopes are non-negotiable:** success responses are `{ data: ... }` (+ `meta` for lists); errors are `{ error: { code, message, details? } }`. Never return a bare array, a bare object, or a different error shape "for this one endpoint."
- **Error codes** come from `API.md` §23. If a new failure mode needs a new code, add it to that table in the same PR — don't invent an ad hoc string inline in a controller.
- **Permission module keys** are the fixed list in `API.md` §24 (`dashboard`, `pos`, `orders`, `coupons`, `tasks`, `attendance`, `expenses`, `vendors`, `products`, `categories`, `customers`, `users`, `settings`, `reports`, `activity-log`). Every protected route's `authorize(module, action)` call must use one of these strings — no typos, no new module keys invented without updating API.md §24 first.
- **Pagination** defaults (`page=1`, `limit=20`, capped `100`) and the date-range filter shape (`?range=today|week|month|custom&from=&to=`) are shared utilities, not reimplemented per module. Put them in one shared middleware/hook and reuse.
- **Never trust client-submitted totals.** Per `API.md` §9.3, `subtotal`, `discountAmount`, `taxAmount`, and `grandTotal` are always recalculated server-side from `items` + `couponCode` + `Settings.taxConfig`. Any new money-calculating endpoint follows the same rule: server is the source of truth, client input is advisory.
- **Snapshot, don't re-derive.** Anything stored as a snapshot (`OrderItem.nameSnapshot`, `priceSnapshot`) is never recomputed from the live `Product` document on read. This is the single rule most likely to be silently violated by a "helpful" refactor — don't add a populate/join that pulls live price data into a historical Order view.

---

## 4. Validation

- Every mutating endpoint (`POST`/`PUT`/`PATCH`/`DELETE`) validates `req.body` against a Zod schema via the `validate` middleware **before** the controller runs. No controller does manual `if (!req.body.x) throw ...` checks — that logic belongs in the schema.
- Zod schemas are written once and shared in shape between `features/<module>/schema.ts` (frontend) and `modules/<module>/<module>.validation.ts` (backend). Don't let frontend and backend validation diverge — if a field is required server-side, it's required in the RHF form too.
- Money fields use `.multipleOf(0.01)` per `DATABASE.md` §1 ("no rounding/discount errors" NFR). Enum fields in Zod must match the Mongoose `enum` exactly, both sourced from the same canonical list (ideally one shared `constants.ts`, not copy-pasted into two files that can drift).
- Frontend validation is UX only, never trusted (`ARCHITECTURE.md` §12). Never skip backend validation because "the form already checks it."

---

## 5. Auth & Permissions

- Every route except those explicitly marked **Auth: none** in `API.md` §5 requires `Authorization: Bearer <accessToken>`, enforced by the `authenticate` middleware.
- Every protected route also passes through `authorize(module, action)`. `Admin` bypasses this; `manager`/`employee` are evaluated against their `permissions` array with **default-deny** — a module absent from a user's `permissions` array means no access, not partial access.
- Never hardcode a role check (`if (user.role === 'manager')`) as a substitute for a permission check. The PRD's entire premise is per-user configurable access (`PRD.md` §"Note" under Users) — role is informational, permissions are the actual gate.
- Guard rails from `API.md` §6 (`CANNOT_DEACTIVATE_SELF`, `LAST_ADMIN_PROTECTED`) live in the service layer and must be checked in every code path that can deactivate a user, not just the primary `PATCH /users/:id/deactivate` route.
- Password hashes are never returned in any API response, ever — not even to an Admin viewing their own user list. Exclude `passwordHash` at the query projection level, not just by deleting the field before `res.json()`.

---

## 6. Database Rules

- Soft-delete collections (`User`, `Customer`, `Category`, `Product`) use `isActive: false`. Never write a hard `deleteOne`/`findOneAndDelete` against these four collections from application code — **exception:** `DELETE /products/:id/permanent` (documented in `API.md` §16) is an intentional exception for Products, guarded at the service layer by `isActive: false` and a future OrderItem reference check. Vendor uses hard delete (not soft delete).
- Hard-delete collections (`Coupon`, `Task`) may be physically removed, but `Coupon` hard-delete is blocked at the service layer if `usageCount > 0` (`DATABASE.md` §3.5) — check this before every coupon delete path, including any future bulk-delete admin tool.
- `Order` and `Expense` are **never** hard-deleted by generated code. `Order` deletion follows the narrow restriction in `API.md` §10 (same-day, `pending`, no coupon usage) until the open item there is resolved — do not "simplify" this into a generic delete.
- Any new write to `Order` financial fields (`subtotal`, `discountAmount`, `taxAmount`, `grandTotal`, `items[].priceSnapshot`) outside of order creation is a bug. These fields are write-once.
- Order creation (Counter increment, Order insert, Coupon `usageCount` `$inc`, ActivityLog write) is one Mongo transaction. Any new step added to this flow (e.g. a future stock decrement) joins the same transaction — never a separate, sequential write that could leave a partial state on failure.
- All revenue-aggregating queries (Dashboard, Income, Reports) must exclude `status: 'cancelled'`. Use the shared aggregation helper described in `API.md` §7/§19 — do not write a second inline `$match` that could drift from it.

---

## 7. Real-Time Events

- Every event name, payload shape, and trigger condition must match `API.md` §22 exactly. If a new mutation needs to notify clients, check §22 first for an existing event before adding a new one.
- Socket emits happen from the service layer, after a successful DB write/transaction commit — never optimistically before the write is confirmed.
- `dashboard:metricsInvalidate` is a signal-only event (no payload). Don't attach data to it "to save a round trip" — the contract is that consumers re-fetch via React Query, not that they read pushed data off the socket.

---

## 8. Frontend Conventions

- Every color, font, spacing, radius, and breakpoint value comes from `theme.md`'s token set — shipped as shadcn/ui CSS variables (`--background`, `--primary`, `--destructive`, etc.) per `theme.md` §2. Never a hardcoded hex, an arbitrary Tailwind color class outside that set, or a one-off `px` breakpoint. If a component needs a value `theme.md` doesn't define, that's a `theme.md` gap to flag and fill there — not a local decision.
- Status/priority badges (Order status, Coupon status, Task priority/status, soft-delete `isActive` states) use the exact color mapping in `theme.md` §6. Don't invent a badge color per module.
- Server data (anything from the API) lives in React Query. UI/global state lives in Zustand. Form state lives in React Hook Form. Don't mix — e.g., don't cache a products list in Zustand "for convenience" when it should be a `useQuery` hook.
- The POS cart is the canonical example of why this split exists (`ARCHITECTURE.md` §8): it must survive background refetches, so it stays in Zustand, never in React Query's cache.
- Every dashboard page wraps its content in `<PermissionGate module="..." action="...">` using the exact module key from `API.md` §24. This is UX convenience, not the real security boundary (the API enforces that) — but it must still be present on every page, not just the obviously sensitive ones.
- Real-time updates land via Socket.io listeners calling `queryClient.invalidateQueries([...])` — never by manually mutating React Query cache state from a socket payload, to avoid cache shape drift from the REST responses.
- Date-range filters across Dashboard/Income/Reports/Attendance/Orders/Expenses use the one shared `useDateRangeFilter` hook and the one shared `?range=&from=&to=` query shape. Don't build a module-specific date picker that emits a different param shape.

---

## 9. Error Handling

- Every async route handler's errors flow to the central `errorHandler` middleware — no ad hoc `try/catch` that sends a custom-shaped error response from inside a controller.
- Client-facing error messages never leak stack traces, raw Mongo error text, or internal file paths. Unhandled errors collapse to `500 INTERNAL_ERROR` with a generic message.
- Every new error condition gets a `code` added to `API.md` §23 in the same change — "magic string" error codes that exist only in one controller are not allowed.

---

## 10. Security

- All inputs are validated server-side regardless of frontend validation (`ARCHITECTURE.md` §12).
- No raw/string-interpolated Mongo queries — use Mongoose query builders/parameterized filters exclusively.
- Secrets (JWT signing keys, Cloudinary keys, DB connection string, email provider keys) live in environment variables only, validated at boot via the Zod-checked `env.ts`. Never hardcode a secret, even temporarily, even in a comment.
- Rate limiting applies to `/auth/login` and `/auth/forgot-password` per `ARCHITECTURE.md` §12 — any new public, unauthenticated endpoint should be evaluated for the same protection before shipping.
- File uploads are validated by MIME type and size **before** reaching Cloudinary (`API.md` §4) — never trust a client-provided `Content-Type` header alone.

---

## 11. Activity Logging

- The `activityLogger` middleware is global, attached to all mutating routes by default (`ARCHITECTURE.md` §4). A new module's routes inherit this automatically — don't write a module-specific logging call as a substitute, and don't opt a route out of it without a documented reason.
- `ActivityLog.description` is always generated server-side. Never pass user-supplied free text directly into this field — it exists to be a tamper-resistant audit trail (`DATABASE.md` §3.13).
- `ActivityLog` has no `PUT`/`PATCH`/`POST` route for individual entries. A single `DELETE /activity-log` endpoint exists to clear all entries, gated by the `activity-log:delete` permission (admin-only in practice). No per-entry delete, no bulk-delete-by-filter, no edit.

---

## 12. When a Prompt Conflicts With These Rules

If a feature prompt seems to require breaking a rule above (e.g., "let's just hard-delete old orders to save space"), stop and flag the conflict explicitly rather than silently complying or silently ignoring the instruction. State which rule it conflicts with and which upstream document (`PRD.md` / `ARCHITECTURE.md` / `DATABASE.md` / `API.md`) would need to change first. This mirrors how `API.md` and `DATABASE.md` themselves flag open items rather than guessing — the same discipline applies going into code.

---

## 13. Open Items Inherited From Upstream Docs

These remain unresolved in `API.md`/`DATABASE.md` and constrain what generated code can safely assume. Do not "decide" these inside a feature implementation — surface them back to the docs first:

1. Order hard-delete scope (`API.md` §25.1) — **RESOLVED:** narrow same-day/pending/no-coupon restriction accepted for v1. No `isActive` field added to `Order`. See `tasks/implementation_plan.md` Decision 1.
2. ~~Income's permission key folded into `dashboard` (`API.md` §25.2) — do not give Income its own permission checks until this is confirmed.~~ **RESOLVED:** Income section removed; profit report uses `reports` permission key.
3. `completed → cancelled` gated by plain `orders:edit` (`API.md` §25.3) — **RESOLVED:** kept at `orders:edit` for v1. See `tasks/implementation_plan.md` Decision 2.
4. ~~User invite via reset-password token reuse (`API.md` §25.4) — do not add an admin-set-password field as an alternative path without resolving this.~~ **RESOLVED:** Admin sets password directly during account creation. `API.md` §25.4 closed, §6 updated.
5. ~~`Settings.taxConfig.mode: itemized` (`DATABASE.md` §8.2) — POS tax calculation assumes a single flat rate until resolved; don't build itemized per-category tax logic prematurely.~~ **RESOLVED:** v1 uses `mode: 'none'` — no tax calculation. POS `taxAmount` is always 0 for v1. Subsequently **replaced** with `Settings.vatInfo` (bin + mushak) — the old `taxConfig` field has been removed from the Settings model entirely.