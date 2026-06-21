# Implementation Plan — Auth & Access Control

> Task 1 per `tasks/backlog.md`
> PRD Feature 2 | `API.md` §5 | `DATABASE.md` §3.1, §3.2 | `ARCHITECTURE.md` §6 | `theme.md` (wired in Task 0)
>
> **Depends on:** Task 0 (Project Setup) — ✅ done
> **Blocks:** Task 2 (Users & Permissions) and every other module
> **Status of `current_task.md` when this plan was written:** holds Auth & Access Control content, status "Not started" — correctly reflects the next work item, NOT a stale prior task. This plan supersedes the informal planning in that file with a structured executable document.

---

## Feature Overview

| Attribute | Value |
|---|---|
| **Feature name** | Auth & Access Control |
| **Business goal** | Enable restaurant staff to log in to the dashboard with a verified identity, establish a session via JWT, and re-authenticate transparently when tokens expire. |
| **User value** | Without this feature, no dashboard page is reachable, no order can be created, and no report can be viewed. It is the gate to every other module. |
| **Key constraint** | There is no public self-registration anywhere in this app. The very first user (an Admin) is created by a one-time **seed script** that writes directly to MongoDB — not through any HTTP endpoint. All subsequent users are created by an authenticated Admin through Task 2's `POST /users`. |

---

## Approved Scope

### In Scope

1. **Seed script** (`backend/src/seed/seed-admin.ts`) — one-time CLI script that creates the first Admin account by writing directly to MongoDB. Idempotent — does not overwrite an existing admin.
2. **User Mongoose model** — fields exactly per `DATABASE.md` §3.1 (name, email, passwordHash, role, permissions, isActive, lastLoginAt).
3. **PasswordResetToken Mongoose model** — per §3.2 (userId, tokenHash, expiresAt with TTL index, used).
4. **JWT library** (`lib/jwt.ts`) — sign/verify access tokens (15 min) and refresh tokens (7 days).
5. **authenticate middleware** — real implementation verifying Bearer token, attaching `req.user`.
6. **Auth API endpoints** (per `API.md` §5):
   - `POST /auth/login` — email+password → access token + user (refresh token in httpOnly cookie)
   - `POST /auth/refresh` — refresh cookie → new access token
   - `POST /auth/logout` — clears refresh cookie
   - `POST /auth/forgot-password` — issues `PasswordResetToken`, emails reset link
   - `POST /auth/reset-password` — consumes token, sets new password
   - `GET /auth/me` — returns current user + permissions
7. **Rate limiting** on `/auth/login` and `/auth/forgot-password`.
8. **ActivityLogger middleware** — global middleware that writes to `ActivityLog` on every mutating route. Wired now so all future tasks' routes are automatically logged.
9. **Frontend auth pages:**
   - Login page (`app/(auth)/login/page.tsx`) — React Hook Form + Zod, no "Register" link
   - Forgot-password page (`app/(auth)/forgot-password/page.tsx`)
   - Reset-password page (`app/(auth)/reset-password/page.tsx?token=`)
10. **Frontend auth infrastructure:**
    - `features/auth/api.ts` — React Query hooks (useLogin, useLogout, useForgotPassword, useResetPassword, useMe)
    - `features/auth/schema.ts` — Zod schemas shared with backend
    - `stores/auth-store.ts` — real implementation (Zustand)
    - `lib/api-client.ts` — real implementation (auto-attach JWT, transparent refresh on 401, retry once)
    - `(dashboard)/layout.tsx` — session check, redirect unauthenticated users to `/login`

### Out of Scope

| Item | Reason |
|---|---|
| `authorize(module, action)` real permission enforcement | Belongs to Task 2 (Users & Permissions) — this task only needs `authenticate` |
| `POST /users` endpoint | Task 2 builds it (requires an already-authenticated Admin to call) |
| Permission editor UI | Task 2 |
| Deciding whether `POST /users` reuses the password-reset token mechanism | `API.md` §25.4 — narrowed but not resolved; belongs to Task 2 |
| OAuth / SSO / social login | Not in PRD |
| Multi-factor authentication | Not in PRD |
| Session revocation (Redis denylist) | Explicitly Phase 2+ per `ARCHITECTURE.md` §6.6 |

---

## Technical Decisions

### Decision 1: First Admin via Seed Script (not API)
- **Why:** `API.md` defines `POST /users` as a route that requires an *already-authenticated* Admin to call it. Without a bootstrap mechanism, no one can log in to call it. A seed script fills this gap without adding a public registration endpoint.
- **Mechanism:** `backend/src/seed/seed-admin.ts`, run via `npm run seed:admin`. Reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from env vars. Hashes with bcrypt (cost 12). Upserts by email — idempotent. Writes through the real `User` Mongoose model.
- **Constraint:** Never runs inside an HTTP request/response lifecycle. No logging via `activityLogger` (that middleware requires an Express `req`/`res` cycle).
- **Storage:** Seed credentials are stored in `.env` (not `.env.example` with real values). `.env.example` gets placeholder entries.

### Decision 2: No Public Self-Registration
- The PRD lists "Login" only, never "Register." Every dashboard account is created by an Admin through `POST /users` (Task 2). The login page must have no "Register" link anywhere.

### Decision 3: Refresh Token in httpOnly Cookie (not in JSON body)
- Per `ARCHITECTURE.md` §6 / `API.md` §5: refresh tokens are set as httpOnly+secure cookies. Never returned in JSON body. Access tokens are returned in JSON and stored in memory (Zustand)/localStorage on the client.

### Decision 4: Email Provider Stub for v1
- `POST /auth/forgot-password` needs to send an email. Rather than blocking on Resend/SendGrid integration, the initial implementation logs the reset link to console and/or writes it to a dev-only endpoint. A real provider integration is a follow-up item (not a blocker for this task).

### Decision 5: Forgot-Password Anti-Enumeration
- `POST /auth/forgot-password` returns a generic `200` response regardless of whether the email exists. No explicit error ("email not registered") is ever returned. This prevents email enumeration attacks.

### Decision 6: Rate Limiting
- `POST /auth/login` and `POST /auth/forgot-password` are rate-limited using `express-rate-limit`. Configuration: max 5 attempts per IP per 15 minutes. Returns `429 RATE_LIMITED`.

### Decision 7: Token Storage on Frontend
- Access token stored in Zustand state (memory) and optionally in `localStorage` for page-refresh survival. Refresh token is browser-managed via httpOnly cookie — the frontend never reads it directly. The `api-client.ts` layer intercepts 401 responses, transparently calls `/auth/refresh`, and retries the original request once.

---

## Frontend Impact

### Pages to Build
1. **Login page** (`app/(auth)/login/page.tsx`)
   - Centered card on slate-50 background (already partially scaffolded)
   - Email + password fields (React Hook Form + Zod)
   - Submit button (primary variant, `md` size per `theme.md` §13)
   - Error states: inline field error for `VALIDATION_ERROR`, toast/banner for `INVALID_CREDENTIALS`/`ACCOUNT_DEACTIVATED`
   - Loading state: spinner on button, disabled during submit
   - "Forgot password?" link below form
   - NO "Register" link
   - Redirect to dashboard on success

2. **Forgot-password page** (`app/(auth)/forgot-password/page.tsx`)
   - Email field only
   - On success: generic "If that email exists, a reset link was sent" message
   - Link back to login

3. **Reset-password page** (`app/(app)/reset-password/page.tsx?token=`)
   - New password + confirm password fields
   - Consumes `token` from query param
   - On success: redirect to login with success message
   - On error: "Invalid or expired link" with link to forgot-password

### Components to Build/Create
4. **`features/auth/api.ts`** — React Query hooks:
   - `useLogin` → `POST /auth/login`
   - `useLogout` → `POST /auth/logout`
   - `useForgotPassword` → `POST /auth/forgot-password`
   - `useResetPassword` → `POST /auth/reset-password`
   - `useMe` → `GET /auth/me`

5. **`features/auth/schema.ts`** — Zod schemas:
   - `loginSchema` (email: z.string().email(), password: z.string().min(1))
   - `forgotPasswordSchema` (email: z.string().email())
   - `resetPasswordSchema` (token: z.string(), newPassword: z.string().min(8))

### State Changes
6. **`stores/auth-store.ts`** — Real implementation:
   - Holds `user`, `accessToken`, `isAuthenticated`
   - `setAuth(user, accessToken)` — stores in Zustand + localStorage
   - `clearAuth()` — clears all + removes localStorage
   - Hydrates from `GET /auth/me` on app load (if accessToken exists in localStorage)

7. **`lib/api-client.ts`** — Real implementation:
   - On mount: attach `Authorization: Bearer <token>` from Zustand/localStorage
   - On 401: call `POST /auth/refresh`, get new accessToken, retry original request once
   - On refresh failure: clear auth, redirect to `/login`

8. **`(dashboard)/layout.tsx`** — Session gate:
   - Check `isAuthenticated` from auth store
   - If not authenticated and no token in localStorage, redirect to `/login`
   - If token in localStorage but store is empty, call `useMe` to hydrate
   - Show loading skeleton while hydrating

### Design Decisions Required (to be made during implementation)
- Login page layout: centered card (current scaffold) — confirm or change to split-screen
- Error-state presentation: toast vs inline for `INVALID_CREDENTIALS`
- Loading state: spinner on button vs skeleton
- Forgot-password confirmation text copy

---

## Backend Impact

### New Dependencies
- `bcrypt` (password hashing, cost 12)
- `jsonwebtoken` (JWT sign/verify)
- `cookie-parser` (parse refresh token cookie)
- `express-rate-limit` (rate limiting on auth routes)

### New Files

#### Models
- `backend/src/models/User.ts` — Mongoose schema per `DATABASE.md` §3.1
- `backend/src/models/PasswordResetToken.ts` — Mongoose schema per `DATABASE.md` §3.2
- `backend/src/models/ActivityLog.ts` — Mongoose schema per `DATABASE.md` §3.13

#### Config Updates
- `backend/src/config/env.ts` — Add env vars:
  - `JWT_ACCESS_SECRET` (required)
  - `JWT_REFRESH_SECRET` (required)
  - `SEED_ADMIN_EMAIL` (required)
  - `SEED_ADMIN_PASSWORD` (required)
  - `EMAIL_FROM` (optional, placeholder)

#### Module
- `backend/src/modules/auth/auth.routes.ts` — All auth routes
- `backend/src/modules/auth/auth.controller.ts` — Request parsing, response shaping
- `backend/src/modules/auth/auth.service.ts` — Business logic (credential verification, token creation, password reset flow)
- `backend/src/modules/auth/auth.validation.ts` — Zod schemas for request bodies

#### Library Updates
- `backend/src/lib/jwt.ts` — Real implementation:
  - `signAccessToken(userId, role, permissions)` → returns JWT string
  - `signRefreshToken(userId)` → returns JWT string
  - `verifyAccessToken(token)` → decoded payload or throws
  - `verifyRefreshToken(token)` → decoded payload or throws

#### Middleware Updates
- `backend/src/middleware/authenticate.ts` — Real implementation:
  - Extract Bearer token from `Authorization` header
  - Verify with `verifyAccessToken`
  - Attach `req.user = { id, role, permissions }`
  - On failure: `401 UNAUTHORIZED`

#### Seed Script
- `backend/src/seed/seed-admin.ts`
- Reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from env
- Connects to MongoDB via `config/db.ts`
- Hashes password with bcrypt (cost 12)
- Upserts User with `role: 'admin'`, `isActive: true`
- If user already exists with that email, logs message and exits (no overwrite)
- Disconnects cleanly

### Modified Files

#### `backend/src/app.ts`
- Add `cookieParser()` middleware
- Add rate limiter middleware for auth routes
- Add `POST /api/v1/auth/*` routes
- Add `GET /api/v1/auth/me` route
- Wire `activityLogger` middleware globally for all mutating routes

---

## Database Impact

### New Collections

#### User (`DATABASE.md` §3.1)
| Field | Type | Constraints |
|---|---|---|
| `name` | String | required |
| `email` | String | unique, lowercase, trimmed, required |
| `passwordHash` | String | required, never returned in API |
| `role` | String enum `admin\|manager\|employee` | required |
| `permissions` | Array of `{ module: String, actions: [String] }` | default [] |
| `isActive` | Boolean | default true |
| `lastLoginAt` | Date | nullable |

Indexes: `email` (unique), `role`, `isActive`

#### PasswordResetToken (`DATABASE.md` §3.2)
| Field | Type | Constraints |
|---|---|---|
| `userId` | ObjectId → User | required |
| `tokenHash` | String | required, unique |
| `expiresAt` | Date | required, TTL index |
| `used` | Boolean | default false |

Indexes: `tokenHash` (unique), TTL on `expiresAt` (auto-cleanup)

#### ActivityLog (`DATABASE.md` §3.13)
| Field | Type | Constraints |
|---|---|---|
| `actor` | ObjectId → User | required |
| `module` | String | required |
| `action` | String | required |
| `targetId` | ObjectId | nullable |
| `targetType` | String | nullable |
| `description` | String | required, server-generated |
| `metadata` | Mixed | nullable |
| `createdAt` | Date | auto (no `updatedAt`) |

Indexes: `{ actor, createdAt }`, `{ module, createdAt }`, `createdAt`

### No Schema Changes to Existing Collections
No existing collections are modified by this task.

---

## API Impact

### New Endpoints

| Method | Path | Auth | Rate Limited | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | None | Yes | Email+password → access token + user. Sets refresh cookie. |
| POST | `/api/v1/auth/refresh` | Cookie | No | Refresh cookie → new access token |
| POST | `/api/v1/auth/logout` | Bearer | No | Clears refresh cookie |
| POST | `/api/v1/auth/forgot-password` | None | Yes | Issues PasswordResetToken, emails reset link |
| POST | `/api/v1/auth/reset-password` | None | No | Consumes token, sets new password |
| GET | `/api/v1/auth/me` | Bearer | No | Returns current user + permissions |

### Request/Response Contracts

#### `POST /api/v1/auth/login`
```json
// Request
{ "email": "admin@restaurant.com", "password": "secret123" }

// Response 200
{
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@restaurant.com",
      "role": "admin",
      "permissions": []
    }
  }
}
// Refresh token set as httpOnly+secure cookie

// Response 401
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }

// Response 423 (only after login succeeds but account is deactivated)
{ "error": { "code": "ACCOUNT_DEACTIVATED", "message": "This account has been deactivated" } }

// Response 429
{ "error": { "code": "RATE_LIMITED", "message": "Too many attempts. Please try again later." } }
```

> **Important:** `423 ACCOUNT_DEACTIVATED` is only returned AFTER valid credentials are confirmed — the login succeeds at the credential level but is blocked by account status. This prevents leaking whether an email is registered vs deactivated.

#### `POST /api/v1/auth/refresh`
- Cookie-based only. No request body.
- Response 200: `{ "data": { "accessToken": "eyJ..." } }`
- Response 401: `{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or expired refresh token" } }`

#### `POST /api/v1/auth/logout`
- Response 200: `{ "data": { "success": true } }`
- Clears refresh cookie in response

#### `POST /api/v1/auth/forgot-password`
```json
// Request
{ "email": "admin@restaurant.com" }

// Response 200 (always — anti-enumeration)
{ "data": { "success": true } }
```
Note: returns `200` even if email doesn't exist. Response is identical in all cases to prevent email enumeration.

#### `POST /api/v1/auth/reset-password`
```json
// Request
{ "token": "raw-token-from-email", "newPassword": "new-secret-456" }

// Response 200
{ "data": { "success": true } }

// Response 400
{ "error": { "code": "INVALID_OR_EXPIRED_TOKEN", "message": "Invalid or expired reset link" } }
```

#### `GET /api/v1/auth/me`
```json
// Response 200
{
  "data": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@restaurant.com",
    "role": "admin",
    "permissions": []
  }
}

// Response 401
{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

---

## Authentication & Authorization

### Token Design

| Token | Lifespan | Storage | Purpose |
|---|---|---|---|
| Access Token (JWT) | 15 minutes | Client memory + localStorage | Bearer token in `Authorization` header |
| Refresh Token (JWT) | 7 days | httpOnly+secure cookie | Obtain new access token without re-login |

### JWT Payload

Access Token:
```json
{
  "sub": "userId",
  "role": "admin",
  "permissions": [...],
  "iat": 1234567890,
  "exp": 1234568790
}
```

Refresh Token:
```json
{
  "sub": "userId",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Auth Flow
1. Login → validate credentials → bcrypt compare → issue access token + refresh cookie
2. Every API request → `authenticate` middleware verifies access token → `req.user` set
3. On 401 → frontend API client calls `POST /auth/refresh` transparently → retries original request
4. On refresh failure → clear auth → redirect to `/login`
5. Logout → clear refresh cookie (client also clears localStorage token)
6. No server-side session storage (stateless JWTs)

### Security Constraints
- `passwordHash` is excluded from **all** query projections — never returned in any API response.
- Login returns `401 INVALID_CREDENTIALS` for both "email not found" and "wrong password" — identical error, no side-channel leak.
- `423 ACCOUNT_DEACTIVATED` is only returned **after** valid credentials (deactivated account detected post-password-verify) — requires one extra check in the service layer.
- Rate limiting: 5 attempts per IP per 15 minutes on `/auth/login` and `/auth/forgot-password`.
- Forgot-password: generic `200` regardless of whether email exists (anti-enumeration).
- Refresh token cookies: `httpOnly`, `secure` (in production), `sameSite: 'strict'`, `path: '/api/v1/auth'`.

---

## Security Requirements

| Requirement | Implementation |
|---|---|
| Password hashing | bcrypt, cost factor 12 |
| No password in responses | `passwordHash` excluded at Mongoose query projection |
| Rate limiting | `express-rate-limit` on login + forgot-password |
| CORS | Already configured in Task 0, restricted to frontend origin |
| Helmet | Already configured in Task 0 |
| No enumeration on login | Same error for wrong email vs wrong password |
| No enumeration on forgot-password | Generic `200` response always |
| Cookie security | httpOnly+secure+sameSite on refresh cookie |
| JWT secret management | In environment variables, never hardcoded |
| Activity Logging | All mutating routes log via global middleware |

---

## Edge Cases

| # | Edge Case | Expected Behavior |
|---|---|---|
| 1 | Seed script run twice with same email | Idempotent — logs message and exits without overwriting |
| 2 | Seed script run when DB is unreachable | Connects via `config/db.ts`, which exits on failure — seed aborts with clear error |
| 3 | Login with deactivated account (`isActive: false`) | `423 ACCOUNT_DEACTIVATED` — only after valid credentials verified |
| 4 | Login with correct email, wrong password | `401 INVALID_CREDENTIALS` — same error as unknown email |
| 5 | Login with unknown email | `401 INVALID_CREDENTIALS` — same error as wrong password |
| 6 | Access token expired mid-session | Frontend API client transparently calls `/auth/refresh` and retries once |
| 7 | Refresh token expired | `/auth/refresh` returns `401` — frontend clears auth, redirects to login |
| 8 | Refresh cookie missing on `/auth/refresh` | `401 UNAUTHORIZED` |
| 9 | Reset token already used (replay) | `400 INVALID_OR_EXPIRED_TOKEN` — `used: true` flag prevents reuse |
| 10 | Reset token expired (TTL) | `400 INVALID_OR_EXPIRED_TOKEN` — TTL index auto-removes from DB |
| 11 | User deactivated mid-session (existing access token still valid) | Token remains valid until natural expiry — no server-side revocation in v1 (`ARCHITECTURE.md` §6.6) |
| 12 | Forgot-password for unregistered email | Generic `200` — no explicit error |
| 13 | Concurrent forgot-password requests for same email | Each creates a new `PasswordResetToken` (all previous ones remain valid until used/expired) |
| 14 | Reset password with weak password (< 8 chars) | `400 VALIDATION_ERROR` — Zod schema enforces min length |
| 15 | Network retry on login (duplicate requests) | Each request is independent — no idempotency guarantee for login |
| 16 | User loads dashboard page with expired access token but valid refresh cookie | Dashboard layout hydrates via `GET /auth/me` → 401 → api-client refreshes → retries `GET /auth/me` → succeeds |
| 17 | First-time server start with no seeded admin | No user can log in. This is intentional — the seed script must be run manually before any login is possible |
| 18 | Reset password link opened on a different device/browser than where forgot-password was requested | Works correctly (token is in the link, not in a device-bound cookie) |

---

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | JWT secret committed to git | Low | Critical | `.env.example` has placeholders only; `.env` is gitignored; `env.ts` validates at boot |
| 2 | bcrypt cost 12 causes slow login under load | Medium | Medium | Cost 12 is standard; if latency is an issue, reduce to 10 (still secure) |
| 3 | Refresh cookie not sent by browser due to CORS/domain mismatch | Medium | High | `cookie-parser` + proper `cors` config with `credentials: true`; test cross-origin in dev |
| 4 | Email provider not configured, forgot-password flow appears broken | High | Medium | Stub implementation logs reset link to console; documented as placeholder |
| 5 | Client-side token in localStorage exposes to XSS | Medium | Medium | Refresh token is httpOnly (XSS-safe); access token is short-lived (15 min); `ARCHITECTURE.md` §12 covers XSS prevention |
| 6 | Rate limiting too aggressive for legitimate users | Low | Medium | Configurable via env var; start with 5/15min, adjust based on feedback |
| 7 | Seed script executed before database connection ready | Low | Low | Script calls `connectDatabase()` which exits on failure — clear error message |
| 8 | Two different JWT_ACCESS_SECRET and JWT_REFRESH_SECRET not set consistently | Low | High | `env.ts` validates both are present at boot; documented requirement |

---

## Doc Updates Required

### No upstream open items are resolved by this task

This task does **not** resolve any open items from `AI_rules.md` §13, `database.md` §8, or `API.md` §25. The relevant open item (`API.md` §25.4 — user invite flow) is narrowed in scope but explicitly deferred to Task 2:

> **Status of `API.md` §25.4:** narrowed by this task's decision that the bootstrap Admin is created via seed script, not through `POST /auth/reset-password`. The remaining question (whether Task 2's `POST /users` reuses the reset-password token mechanism or an admin-sets-password field) is **not resolved here** — it belongs to Task 2's analysis.

The following docs should be noted but not changed:

| Doc/Section | Note |
|---|---|
| `API.md` §5 | `forgot-password` anti-enumeration decision (generic 200) — this plan makes the decision explicit but `API.md` doesn't currently specify behavior for unregistered emails. Recommend adding a note to `API.md` §5 in the forgot-password description block. |
| `API.md` §5 | Seed script for first Admin is not documented in `API.md` — not a change to the API contract itself, but the setup flow should be mentioned somewhere (README or dev docs, not `API.md`). |

### Recommendation: Add forgot-password anti-enumeration note to `API.md`

Consider adding to `API.md` §5, in the `POST /auth/forgot-password` row description:
> Returns generic `200` regardless of whether the email exists (anti-enumeration). If the email corresponds to an active user, a `PasswordResetToken` is created and emailed.

This is a recommendation, not a requirement, since the API contract already works without it.

---

## Implementation Order

The build sequence is ordered by dependency — each step produces something the next step can immediately use.

### Phase 1: Infrastructure (no routes yet)
1. Install new backend dependencies (bcrypt, jsonwebtoken, cookie-parser, express-rate-limit)
2. Update `env.ts` with new env vars (JWT secrets, seed admin credentials)
3. Update `.env.example` with placeholder entries for all new env vars
4. Real implementation of `lib/jwt.ts` (sign/verify functions)
5. Real implementation of `middleware/authenticate.ts` (Bearer token verification)

### Phase 2: Models
6. Create `models/User.ts` (Mongoose schema)
7. Create `models/PasswordResetToken.ts` (Mongoose schema with TTL index)
8. Create `models/ActivityLog.ts` (Mongoose schema)

### Phase 3: Seed Script
9. Create `src/seed/seed-admin.ts` (one-time bootstrap)
10. Add `"seed:admin": "tsx src/seed/seed-admin.ts"` to `package.json` scripts

### Phase 4: Auth Module (Backend)
11. Create `modules/auth/auth.validation.ts` (Zod schemas)
12. Create `modules/auth/auth.service.ts` (business logic)
13. Create `modules/auth/auth.controller.ts` (request/response handling)
14. Create `modules/auth/auth.routes.ts` (route definitions)
15. Update `app.ts` to wire auth routes, cookieParser, rate limiter, and activityLogger

### Phase 5: Frontend Auth Infrastructure
16. Create `features/auth/schema.ts` (shared Zod schemas)
17. Create `features/auth/api.ts` (React Query hooks)
18. Real implementation of `stores/auth-store.ts` (Zustand with localStorage persistence)
19. Real implementation of `lib/api-client.ts` (auto-attach JWT, transparent refresh)
20. Real implementation of `(dashboard)/layout.tsx` (session gate + hydration)

### Phase 6: Frontend Auth Pages
21. Build login page (`app/(auth)/login/page.tsx`)
22. Build forgot-password page (`app/(auth)/forgot-password/page.tsx`)
23. Build reset-password page (`app/(auth)/reset-password/page.tsx?token=`)

### Phase 7: Verification
24. Run seed script to create first admin
25. Test full login flow end-to-end
26. Test token refresh (wait for expiry or manually test with short TTL)
27. Test forgot-password → reset-password flow
28. Test rate limiting
29. Test deactivated account login (manually set `isActive: false` in DB)
30. Run `npm run typecheck` and `npm run lint` on both apps

---

## Task Breakdown

### Task 1.1: Install Backend Dependencies & Update Config

**Description:** Install bcrypt, jsonwebtoken, cookie-parser, express-rate-limit. Update env.ts with JWT secrets and seed admin credential vars. Update .env.example.

**Acceptance Criteria:**
- `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit` in `package.json`
- `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cookie-parser` in devDependencies
- `env.ts` validates: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `.env.example` has placeholder entries for all new vars
- `tsc --noEmit` passes

### Task 1.2: Implement JWT Library & Authenticate Middleware

**Description:** Write JWT sign/verify functions in `lib/jwt.ts`. Write real `authenticate` middleware that verifies Bearer tokens.

**Acceptance Criteria:**
- `signAccessToken(userId, role, permissions)` returns a signed JWT with 15 min expiry
- `signRefreshToken(userId)` returns a signed JWT with 7 day expiry
- `verifyAccessToken(token)` returns decoded payload or throws
- `verifyRefreshToken(token)` returns decoded payload or throws
- `authenticate` middleware extracts Bearer token, verifies it, sets `req.user`
- Missing/invalid/expired token → `401 UNAUTHORIZED`
- Malformed Authorization header → `401 UNAUTHORIZED`

### Task 1.3: Create Mongoose Models

**Description:** Create User, PasswordResetToken, and ActivityLog Mongoose models.

**Acceptance Criteria:**
- `User` model matches `DATABASE.md` §3.1 exactly (all fields, types, enums)
- `email` is unique, lowercase, trimmed
- `passwordHash` excluded from all `toJSON()` output (or use `.select('-passwordHash')` in queries)
- `PasswordResetToken` model matches `DATABASE.md` §3.2 exactly
- TTL index on `expiresAt` (seconds: 900 for 15 min, or configurable)
- `tokenHash` is unique (SHA-256 hash of raw token)
- `ActivityLog` model matches `DATABASE.md` §3.13 exactly
- No `updatedAt` field on ActivityLog

### Task 1.4: Create Seed Admin Script

**Description:** Create `src/seed/seed-admin.ts` that boots the first Admin user.

**Acceptance Criteria:**
- Reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from validated env
- Connects to MongoDB via `config/db.ts`
- Hashes password with bcrypt (cost 12)
- Upserts User by email with `role: 'admin'`, `isActive: true`, `permissions: []`
- If user with that email already exists: logs "Admin user already exists, skipping" → exits with code 0
- Does NOT run `activityLogger` (no req/res cycle)
- Disconnects cleanly from MongoDB on completion
- `npm run seed:admin` script added to `package.json`

### Task 1.5: Build Auth Backend Module

**Description:** Create auth routes, controller, service, and validation. Wire into app.ts.

**Acceptance Criteria:**
- `POST /auth/login` validates body, checks credentials (bcrypt compare), returns access token + user, sets refresh cookie
- `POST /auth/refresh` reads cookie, verifies refresh token, issues new access token
- `POST /auth/logout` clears refresh cookie
- `POST /auth/forgot-password` creates PasswordResetToken, logs/sends reset link
- `POST /auth/reset-password` verifies token hash, marks used, updates password
- `GET /auth/me` returns current user from `req.user`
- Rate limiting on login + forgot-password (5/15min)
- `423 ACCOUNT_DEACTIVATED` returned AFTER valid credentials for deactivated users
- `401 INVALID_CREDENTIALS` for both wrong email and wrong password
- `activityLogger` middleware wired globally in `app.ts`
- ActivityLog entries are written for login and password reset
- ActivityLog is NOT written for forgot-password (read-only side-effect-free operation)

### Task 1.6: Build Frontend Auth Infrastructure

**Description:** Create React Query hooks, real auth store, real API client, and dashboard layout session gate.

**Acceptance Criteria:**
- `features/auth/api.ts` has all 5 React Query hooks
- `features/auth/schema.ts` has login/forgot-password/reset-password Zod schemas
- `stores/auth-store.ts` hydrates from localStorage on mount, persists access token
- `lib/api-client.ts` auto-attaches Bearer token, intercepts 401, calls `/auth/refresh`, retries once
- Dashboard layout checks `isAuthenticated`, redirects to `/login` if unauthenticated
- Dashboard layout calls `useMe` to hydrate store if token exists but store is empty
- Loading state during hydration (skeleton or spinner)
- Logout action clears store, calls `POST /auth/logout`, redirects to `/login`

### Task 1.7: Build Frontend Auth Pages

**Description:** Build login, forgot-password, and reset-password pages with proper forms and validation.

**Acceptance Criteria:**
- Login page: email + password fields, validates with Zod, shows loading state, shows error states (inline for validation, toast for auth errors), redirects to dashboard on success, "Forgot password?" link, NO "Register" link
- Forgot-password page: email field, generic success message ("If that email exists, a reset link was sent"), link back to login
- Reset-password page: reads `token` from URL query param, new password + confirm fields, validates min length (8), success redirects to login with message, error shows "Invalid or expired link" with link to forgot-password
- All pages use `theme.md` tokens (colors, spacing, radius) already configured in CSS/Tailwind
- Design decisions (layout, error state presentation, button loading state) finalized during implementation

### Task 1.8: Verification & Testing

**Description:** Run through edge cases and verify all auth flows work end-to-end.

**Acceptance Criteria:**
- `tsc --noEmit` passes on both backend and frontend
- Lint passes on both
- Seed script creates admin user
- Login succeeds with seeded admin credentials
- Login fails with wrong password (401 INVALID_CREDENTIALS)
- Login fails with unknown email (401 INVALID_CREDENTIALS)
- Login blocked for deactivated account (423 ACCOUNT_DEACTIVATED)
- Rate limiting triggers after 5 failed attempts (429 RATE_LIMITED)
- Token refresh works (confirm via network inspection)
- Logout clears cookie
- Forgot-password creates token, returns 200
- Reset-password with valid token succeeds
- Reset-password with expired/used token fails (400 INVALID_OR_EXPIRED_TOKEN)
- `GET /auth/me` returns current user
- Dashboard redirects unauthenticated users to /login
- Full flow: login → dashboard → refresh → logout → redirect

---

## Final Approved Decisions

| # | Decision | Context |
|---|---|---|
| 1 | First Admin is bootstrapped via seed script (`src/seed/seed-admin.ts`), not through any HTTP endpoint | Fills a gap in upstream docs: no mechanism existed for creating the very first user |
| 2 | No public self-registration — all accounts after the first are created by an Admin through Task 2's `POST /users` | PRD lists "Login" only, never "Register" |
| 3 | Refresh token in httpOnly+secure cookie (never in JSON body); access token in Zustand + localStorage | Per `ARCHITECTURE.md` §6 |
| 4 | Forgot-password returns generic `200` regardless of whether email exists (anti-enumeration) | Decided here, not specified in upstream docs |
| 5 | Email provider integration is stubbed (logs to console) for v1; real provider (Resend/SendGrid) is a follow-up | Not a blocker for this task |
| 6 | Rate limiting: 5 attempts per IP per 15 minutes on `/auth/login` and `/auth/forgot-password` | Configurable via env var |
| 7 | `423 ACCOUNT_DEACTIVATED` is returned only AFTER valid credentials are verified (not a separate code path that leaks account existence) | Matches `API.md` §23 |
| 8 | `activityLogger` middleware is wired globally in `app.ts` — all future modules' mutating routes are automatically logged | Per `ARCHITECTURE.md` §4 |
| 9 | Seed script is idempotent — re-running it does not overwrite an existing admin | Prevents accidental credential reset |
| 10 | `passwordHash` excluded at Mongoose query projection level (`.select('-passwordHash')`) | Per `AI_rules.md` §5 |
