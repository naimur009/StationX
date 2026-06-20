# Current Task — Project Setup (Frontend + Backend Scaffolding + Home Page)

> Status: **Not started**
> Source: `backlog.md` → Task 0, plus PRD Feature 1 (Home Page) pulled forward from Task 19, plus `theme.md` (now established — wired in here rather than at Task 1)
> Depends on: `PRD.md`, `architecture.md` §2/§3/§4/§10, `AI_rules.md` §1/§2
> Blocks: every feature task in `backlog.md` — nothing else can start until this is done.

---

## Goal

Stand up empty, correctly-configured `frontend/` and `backend/` projects matching the stack and folder structure already locked in `architecture.md`. No features, no business logic, no database models with real fields yet — just a skeleton that runs, lints, and is ready for the first real feature (Auth & Access Control) to be built into it.

`docs/`, `prompt/`, and `tasks/` already exist and are populated (Phase 1–2 of `guideline.md` is done) — this task only adds `frontend/` and `backend/` alongside them.

**Definition of done:** a fresh clone can run `frontend` and `backend` locally, they can talk to each other over a placeholder route, the public Home Page renders with a working "Admin Login" link to `/login`, and the folder structure matches `architecture.md` §3/§4 exactly so no future module has to "fix" the scaffolding around it.

---

## Scope

### In scope
- `frontend/`, `backend/` folders at repo root (alongside the existing `docs/`, `prompt/`, `tasks/`)
- Frontend: Next.js 14 App Router + TypeScript init, Tailwind + shadcn/ui wired in, route groups created empty (`(public)`, `(auth)`, `(dashboard)`)
- **Real public Home Page** (`app/(public)/page.tsx`) — PRD Feature 1, pulled forward from backlog Task 19 since it's simple, low-risk, and gives the placeholder `/health` round trip a real page to live on
- Backend: Node.js + Express + TypeScript init, layered folder skeleton (`modules/`, `models/`, `middleware/`, `lib/`, `config/`)
- Shared tooling: ESLint, Prettier, TypeScript strict mode, `.env.example` for both apps
- MongoDB connection wiring (`config/db.ts`) — connects, no models yet
- One placeholder end-to-end round trip: `GET /api/v1/health` on backend, called from one frontend page, to prove the two layers are wired correctly
- Socket.io server initialized (no events yet)
- Base `app.ts`/`server.ts`, Helmet, CORS restricted to the frontend origin per `architecture.md` §12
- Git repo init, `.gitignore`, root `README.md` stub

### Explicitly out of scope (belongs to later tasks in `backlog.md`)
- Any Mongoose model with real fields (Task 1 — Auth — defines `User` first)
- Any auth logic, JWT, login form
- Any of the 15 permission-gated modules' actual routes/pages
- **Wiring the Home Page to real `Settings` data** (restaurant name/logo) — `Settings` doesn't exist until Task 3, so the Home Page uses hardcoded placeholder branding for now; swapping it for live data is what's left of backlog Task 19
- CI/CD pipeline (Task 20 — Pre-Launch Hardening)
- Docker/deployment config beyond a local dev setup

---

## Checklist

### Backend (`architecture.md` §4)
- [ ] `npm init` + TypeScript + Express setup
- [ ] Create `src/config/db.ts` (Mongo connection via Mongoose, validated env vars)
- [ ] Create `src/config/env.ts` (Zod-validated env vars)
- [ ] Create `src/config/socket.ts` (Socket.io server init, attached to the HTTP server, no events yet)
- [ ] Create empty `src/modules/` folder with **one placeholder module** (e.g. `health/health.routes.ts`, `health.controller.ts`) to confirm the routes → controller → service convention before Auth is built
- [ ] Create empty `src/models/` folder (no models yet — first real one lands in the Auth task)
- [ ] Create `src/middleware/errorHandler.ts` (generic error → `{ error: { code, message } }` envelope per `API.md` §2, even before any module needs it)
- [ ] Create `src/middleware/validate.ts` skeleton (generic Zod-body validator, no schemas yet)
- [ ] Stub `src/middleware/authenticate.ts` and `src/middleware/authorize.ts` as empty pass-through files — **not implemented yet**, just present so the Auth task isn't also responsible for inventing the file layout
- [ ] Create `src/lib/` with empty `jwt.ts`, `pdf.ts`, `upload.ts` placeholders (no implementation — just confirms the folder per `architecture.md` §4)
- [ ] Wire Helmet + CORS (restricted to frontend's local dev origin)
- [ ] `GET /api/v1/health` route returning `{ data: { success: true } }` per the success envelope in `API.md` §2 — this is the **only** real endpoint in this task
- [ ] `src/app.ts` / `src/server.ts` entry point, starts HTTP + Socket.io server together

### Frontend (`architecture.md` §3)
- [ ] `npx create-next-app` with App Router + TypeScript + Tailwind
- [ ] Install + configure shadcn/ui
- [ ] Implement `theme.md` §2's CSS variables (light + dark) in `app/globals.css`, load the §3 fonts (Space Grotesk / IBM Plex Sans / IBM Plex Mono, plus Fraunces for the Home Page hero) self-hosted via `next/font/google` per `theme.md` §3's decision, and set `darkMode: 'class'` in `tailwind.config`
- [ ] Create route group folders: `app/(auth)/login/`, `app/(auth)/forgot-password/`, `app/(dashboard)/` with placeholder `page.tsx`/`layout.tsx` files (just enough to render, no real content — these stay placeholders until their own backlog tasks)
- [ ] Create empty `features/` folder with one placeholder module folder to confirm the convention (no real feature yet)
- [ ] Create `components/ui/` (shadcn output) and `components/shared/` (empty, ready for `DataTable`, `PermissionGate`, etc.)
- [ ] Create `lib/api-client.ts` skeleton (fetch wrapper, JWT attach stub — no real refresh logic yet)
- [ ] Create `lib/socket.ts` skeleton (Socket.io client init, not connected to real events yet)
- [ ] Create `stores/auth-store.ts` skeleton (Zustand store shape, no real auth wiring yet)
- [ ] Install TanStack Query, Zustand, React Hook Form, Zod — confirm versions resolve cleanly together

### Home Page (`app/(public)/page.tsx` — PRD Feature 1, pulled forward from backlog Task 19)
- [ ] Build the real public landing page — not a bare placeholder
- [ ] Navbar with an "Admin Login" button that routes to `/login`
- [ ] Minimal placeholder branding (restaurant name/tagline) — hardcoded for now, clearly marked as temporary; swapped for real `Settings` data once Task 3 exists
- [ ] Confirm the route is genuinely public — no auth check applied anywhere in the `(public)` route group
- [ ] Mobile responsive per the PRD's NFR
- [ ] This page also hosts the `GET /api/v1/health` round-trip call from the Backend checklist above, so it doubles as the scaffolding's proof-of-life screen

### Shared Tooling
- [ ] ESLint config (shared rule set, TypeScript strict, no `any` per `AI_rules.md` §1) for both `frontend/` and `backend/`
- [ ] Prettier config, consistent between both apps
- [ ] `.env.example` for both apps (no real secrets committed)
- [ ] Confirm `npm run dev` works for both apps independently and concurrently (e.g. via a root-level script or two terminals — document whichever is chosen)

### Design
- [ ] Decide actual content/copy for the public Home Page hero (PRD only specifies "public landing page" + login button — content is still open); revisit branding once Settings (Task 3) provides real restaurant name/logo. Visual treatment (type, color, the Fraunces hero face) is already decided in `theme.md` §1/§3 — this checklist item is copy only.
- [ ] Confirm the global token wiring above actually renders correctly in both light and dark mode before moving on — this is the one place a token mistake would silently propagate into every later task
- [ ] Beyond the Home Page, no other UI decisions needed yet — the first full Design checklist (forms, error states, etc.) starts at the Auth & Access Control task

### Verification
- [ ] Fresh clone → install deps → run both apps → frontend's placeholder page successfully displays the backend's `/health` response
- [ ] Public Home Page loads at `/` with no auth required, "Admin Login" button navigates to `/login`
- [ ] `tsc --noEmit` passes clean on both apps (no type errors in the empty skeleton)
- [ ] Lint passes clean on both apps
- [ ] Confirm folder structure visually matches `architecture.md` §3 and §4 — no extra ad hoc folders invented mid-setup

---

## Notes / Decisions Made During This Task

*(Fill in as setup proceeds — record any deviation from `architecture.md` here so docs can be reconciled afterward, per `AI_rules.md` §12. Before clearing this file once done, copy anything here into `docs/decisions.md` per `backlog.md`'s "How to Use This File" step 5.)*

- **Pulled forward:** Home Page (PRD Feature 1 / backlog Task 19) was originally scheduled last, since it "benefits from Settings existing first." Built here instead with hardcoded placeholder branding, since the `/health` proof-of-life needed a real page to render on anyway. `backlog.md` Task 19 has been trimmed to just the remaining work: swapping the placeholder branding for live `Settings` data once Task 3 exists.
-

---