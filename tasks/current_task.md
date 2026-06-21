# Current Task — Auth & Access Control

> Status: **Not started**
> Depends on: `PRD.md` Feature 2 | `API.md` §5 | `DATABASE.md` §3.1, §3.2 | `ARCHITECTURE.md` §6 | `theme.md` (tokens already established) | Project Setup (✅ done)
> Blocks: everything — no other module is reachable without login.

---

## Goal

Implement real login/session/token infrastructure so every other module has something to authenticate against. Along the way, resolve a gap that's genuinely unspecified upstream: **nothing in `PRD.md`/`architecture.md`/`database.md`/`API.md` says how the very first user account comes to exist.** The decision made here: the first Admin is created by a one-time **seed script** that writes directly to MongoDB — not through any HTTP endpoint. That Admin then logs in normally through the real `/auth/login` flow and creates every subsequent user from the dashboard (Task 2: Users & Permissions). There is no public self-registration anywhere in this app — `PRD.md` Feature 2 lists "Login" only, never "Register."

---

## Scope

### In scope (this task)
- Real `User` + `PasswordResetToken` Mongoose models
- JWT issuing/verification, bcrypt hashing
- `authenticate` middleware (real implementation)
- `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me`
- Rate limiting on login + forgot-password
- Global `activityLogger` middleware wiring
- Frontend: login / forgot-password / reset-password pages, auth store, API client with transparent refresh, dashboard layout's session gate
- **New addition:** a one-time **seed script** that inserts exactly one Admin user directly into the database (bcrypt-hashed password, read from env vars) — this is how the very first login becomes possible at all, since `POST /users` (Task 2) requires an *already-authenticated* Admin to call it, and nothing can call it before one exists.

### Explicitly out of scope (belongs to Task 2: Users & Permissions)
- `POST /users` — Admin creating additional users from the dashboard
- The permission editor UI
- `authorize(module, action)` real enforcement — this task's routes only need `authenticate`; there's nothing to permission-gate until other modules exist
- Deciding whether account creation reuses the password-reset token mechanism (`API.md` §25.4) — that decision belongs to Task 2's `POST /users`, not to the seeded bootstrap Admin, which never goes through that mechanism at all

---

## Checklist

### Backend

- [ ] `User` Mongoose model (`name`, `email` unique/lowercase, `passwordHash`, `role` enum, `permissions[]`, `isActive`, `lastLoginAt`) — fields exactly per `DATABASE.md` §3.1, no extras
- [ ] `PasswordResetToken` model (`userId`, `tokenHash`, `expiresAt` with TTL index, `used`) per §3.2
- [ ] **Seed script** — `backend/src/seed/seed-admin.ts`, run via `npm run seed:admin`:
  - [ ] Reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from env vars (validated by `env.ts`'s Zod schema per `AI_rules.md` §10 — never hardcoded in source, never committed)
  - [ ] Hashes the password with bcrypt (cost 12) — same code path as every other password write, no shortcut
  - [ ] Upserts (by `email`) a single `User` with `role: 'admin'`, `isActive: true`, `permissions: []` (irrelevant for admin per `DATABASE.md` §3.1 — admin bypasses granular checks regardless of what's in this array)
  - [ ] **Idempotent:** re-running the script doesn't reset an admin who already changed their password — if a user with that email already exists, log a message and exit without overwriting
  - [ ] Writes through the real `User` Mongoose model (same schema validation the API uses), connects via `config/db.ts`, then disconnects cleanly — not a raw driver script
  - [ ] Bypasses HTTP entirely: no API endpoint exists for this. It's an ops-only, one-time step — document it in the README under first-time environment setup
- [ ] `lib/jwt.ts` — sign/verify access token (15 min) and refresh token (7 days)
- [ ] `middleware/authenticate.ts` — real implementation: verify Bearer token, attach `req.user = { id, role, permissions }`
- [ ] bcrypt hashing (cost 12) on password set/reset — never log or return `passwordHash`, exclude it at query projection level
- [ ] `POST /auth/login` — credential check, `423 ACCOUNT_DEACTIVATED` if `isActive: false`, `401 INVALID_CREDENTIALS` for both wrong password and unknown email (no enumeration leak), set refresh cookie httpOnly+secure, return access token + user + permissions in body
- [ ] `POST /auth/refresh` — verify refresh cookie, issue new access token
- [ ] `POST /auth/logout` — clear refresh cookie
- [ ] `POST /auth/forgot-password` — issue `PasswordResetToken`, send email via provider (Resend/SendGrid placeholder OK for now)
- [ ] `POST /auth/reset-password` — consume token by `tokenHash` lookup, `400 INVALID_OR_EXPIRED_TOKEN` if expired/used/not found, set new password, mark token `used: true`
- [ ] `GET /auth/me` — return current user + permissions for store hydration
- [ ] Rate limiting on `/auth/login` and `/auth/forgot-password` (`ARCHITECTURE.md` §12) → `429 RATE_LIMITED`
- [ ] Wire the global `activityLogger` middleware now (it's infrastructure, not feature-specific) so every mutating route from this point on is automatically logged — note the seed script itself is **not** logged here; it runs before any `req`/`res` cycle exists, outside the middleware chain entirely

### Frontend

- [ ] `features/auth/api.ts` — React Query hooks: `useLogin`, `useLogout`, `useForgotPassword`, `useResetPassword`, `useMe`
- [ ] `features/auth/schema.ts` — Zod schemas shared in shape with backend validation (login, forgot-password, reset-password forms)
- [ ] `app/(auth)/login/page.tsx` — login form (React Hook Form + Zod). No "Register" link or route anywhere — confirms the no-self-registration decision above
- [ ] `app/(auth)/forgot-password/page.tsx` — forgot-password form
- [ ] A reset-password page/route that consumes the emailed token (confirm route path, e.g. `app/(auth)/reset-password/page.tsx?token=`)
- [ ] `stores/auth-store.ts` — real implementation: holds user, permissions, access token in memory; hydrates from `GET /auth/me` on app load
- [ ] `lib/api-client.ts` — real implementation: attaches `Authorization: Bearer`, transparently calls `/auth/refresh` and retries once on `401`
- [ ] `(dashboard)/layout.tsx` — session check, redirect unauthenticated users to `/login`
- [ ] Logout action (clears store, calls `POST /auth/logout`, redirects to `/login`)

### Design

- [ ] Decide login page layout (centered card vs split-screen vs full illustration) — consult the `frontend-design` skill before building
- [ ] Decide error-state presentation for `INVALID_CREDENTIALS` (inline field error vs toast vs banner) — keep consistent with how validation errors will look everywhere else in the app, since this is the first form built
- [ ] Decide loading/pending state for the login button (disabled + spinner vs skeleton)
- [ ] Decide forgot/reset-password flow's confirmation messaging (e.g. "if that email exists, a reset link was sent" — ties to Open Item 2 below)
- [ ] Tokens are already established in `theme.md` and wired in during Project Setup — confirm the login/forgot-password/reset-password forms actually use them; no new color/type/spacing decisions get made here

---

## Open Items

1. **`API.md` §25.4 — narrowed, not resolved:** whether `POST /users` (Task 2) reuses the password-reset token mechanism vs. an admin-sets-password-directly flow is now *only* about Task 2's account creation. It has no bearing on the seeded bootstrap Admin, which never goes through either mechanism. Resolve when Task 2 starts.
2. **Forgot-password anti-enumeration:** still open — generic `200` regardless of whether the email exists, or an explicit error. Pick one, note it in `API.md` §5.
3. **Seed script scope:** this task assumes exactly **one** bootstrap Admin, created once, with every other account going through `POST /users` afterward (Task 2) — not a general-purpose fixtures/seeding tool for dev data. If multi-admin local-dev seeding is wanted later, treat that as separate dev tooling, not a change to this script's contract.
4. **Seed credentials in `.env.example`:** `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` need a placeholder entry in `.env.example` per Project Setup's existing convention — confirm this gets added, not just documented in a README.

---

## Notes / Decisions Made During This Task

*(Fill in as work proceeds, per `AI_rules.md` §12 — record any deviation from upstream docs here so they can be reconciled afterward.)*

- **Decided:** the first Admin account is bootstrapped by a one-time seed script writing directly to MongoDB (bcrypt-hashed password from env vars) — not through `POST /auth/...` or any HTTP endpoint. This fills a gap left genuinely unspecified in `PRD.md`/`architecture.md`/`database.md`/`API.md`.
- **Decided:** every account after that first Admin is created exclusively through Task 2's `POST /users`, called by an already-authenticated Admin from the dashboard. There is no second account-creation path, public or otherwise.

-

---