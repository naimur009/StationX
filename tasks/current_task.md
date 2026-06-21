# Current Task — Dashboard Shell & Layout Design

> Status: **Completed** ✅
> Depends on: Auth & Access Control (Task 1) — **completed** ✅
> Blocks: every dashboard-area module from Task 3 (Users & Permissions) onward — every page from here forward renders inside this shell.

---

## Goal

Build the persistent UI chrome — sidebar, top bar, and responsive layout shell — that every authenticated page in the app renders inside. This is **not** the PRD Feature 3 "Dashboard Overview" page (metrics, top-10 items — that's a separate task, now numbered Task 12, "Dashboard (Overview)"). This task is the shell those pages (and all other modules) live inside: it must be responsive across desktop/tablet/mobile, theme-correct (light mode only, using `theme.md`'s tokens), and optimized so it doesn't become the heaviest bundle in the app despite being loaded on every authenticated route.

---

## Scope

### In scope (this task)
- `components/shared/Sidebar.tsx` — full nav-link list, all modules, active-route highlighting
- `components/shared/TopBar.tsx` — branding, user menu, logout
- `components/shared/MobileNav.tsx` — hamburger-triggered drawer for narrow viewports
- Extending `app/(dashboard)/layout.tsx` (session-gate-only version from Task 1) to render the full shell
- Light-mode theming only — Tailwind config and component styles pull tokens directly from `theme.md`; no dark-mode toggle, no `next-themes`, no `darkMode: 'class'` setup
- Responsive breakpoint behavior: persistent sidebar (desktop) → collapsible icon rail (tablet) → drawer (mobile)
- Performance: route-level code splitting per module page, individual `lucide-react` icon imports, skeleton loading state on route transitions
- Sidebar collapse/expand state persisted in a Zustand UI store (never browser storage, per this stack's conventions)

### Explicitly out of scope (belongs to later tasks)
- Permission-based nav-link visibility — `lib/permissions.ts`, `usePermission`, and `<PermissionGate>` already exist (built as part of Task 1's infrastructure). This task **can and should** use `usePermission()` to filter sidebar nav items by the user's actual permissions. The original "defer to Task 3" constraint no longer applies.
- The Dashboard *Overview* page itself (metrics cards, top-10 items, date-range filter) — Task 12.
- `Settings.restaurantName` / `Settings.logo` data wiring into `TopBar` — `Settings` doesn't exist until Task 4; `TopBar` uses placeholder branding until then.

---

## Checklist

### Backend
- [ ] None — this is a frontend-only task.

### Frontend
- [x] `components/shared/Sidebar.tsx` — nav-link list for all 15 permission-gated modules plus Dashboard Overview and Activity Log; icon + label; active-route highlighting; nav items filtered via `hasPermission(module, 'view')`
- [x] `components/shared/TopBar.tsx` — placeholder restaurant name/logo, current user name (from `stores/auth-store.ts`), no logout button
- [x] `components/shared/MobileNav.tsx` — hamburger-triggered full-height drawer/sheet, reuses `NAV_ITEMS` from Sidebar (single source of truth)
- [x] `app/(dashboard)/layout.tsx` — render `Sidebar` + `TopBar` + `MobileNav` + content area; breakpoint at `md` (768px) per `theme.md` §20
- [x] Apply `theme.md`'s CSS variables/tokens via Tailwind config — light mode only; no theme toggle, no `darkMode: 'class'` setup
- [x] Route-level code splitting — each `(dashboard)/<module>/page.tsx` lazy-loads its own bundle via Next.js App Router
- [x] `lucide-react` icons imported individually (named imports only) to keep the shared shell bundle lean
- [x] Skeleton/loading state via `loading.tsx` at `(dashboard)/` route group
- [x] Sidebar collapsed/expanded state in a Zustand UI store (`stores/ui-store.ts`)

### Design
- [x] Sidebar pattern per breakpoint:
- [x] **Desktop (≥1024px):** persistent full sidebar, icon + label
- [x] **Tablet (768–1023px):** collapsible icon-only rail, expandable via collapse toggle in TopBar
- [x] **Mobile (<768px):** hidden by default; hamburger in `TopBar` opens a full-height drawer/sheet over content
- [x] `TopBar` content priority at the smallest supported width (~320px) — hamburger + brand name + user avatar survive truncation
- [x] All interactive nav/touch targets ≥44px, per `TEST_CASES.md` CC-MOB-01
- [x] Confirm `theme.md` breakpoint values match what's used here — `md` (768px) used for sidebar/drawer switch

---

## Open Items

1. **Branding data** (`Settings.restaurantName`/`logo`) isn't available until Task 4 — confirm the placeholder `TopBar` branding looks intentional, not broken, in the interim.

---

## Notes / Decisions Made During This Task

- Sidebar breakpoint adjusted from `lg` (1024px) to `md` (768px) per `theme.md` §20 — tablet gets icon rail, not drawer.
- Extracted `NavItemLink` shared component from `Sidebar.tsx` and `MobileNav.tsx` to eliminate duplicate nav markup (`AI_rules.md` §2).
- `visibleItems` filter wrapped in `useMemo` for render-performance consistency.
- Added `error.tsx` at `(dashboard)/` route group for error boundary coverage.
- Nav items filtered via `hasPermission()` directly (not `usePermission` hook) since components already have `user` from `useAuthStore`.
- Sidebar state stored in Zustand in-memory only (no localStorage) — per-tab state.

---