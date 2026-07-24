Critical Issues
C-1: .env File Committed with Live Production Secrets
Files: backend/.env (lines 6, 9-10, 14, 26-28)
Details: MongoDB URI with plaintext credentials naimurrahaman955:naimur123456, JWT secrets, Cloudinary API key+secret, and admin seed password are all hardcoded in the committed .env file. Any repo exposure = total system compromise.
C-2: CSS Theme Completely Wrong — Primary is Red Instead of Blue
File: frontend/src/app/globals.css:15-16
Details: --primary: 356 78% 48% (hue 356 = red) and --primary-hover: 356 78% 38%. Per theme.md §2, primary should be blue-600 (hue 221). The entire brand color is wrong — all primary buttons, nav highlights, and badges render red instead of blue. This is a systematic color-theme mismatch affecting every UI component.
C-3: Focus Ring Color is Amber Instead of Blue
File: frontend/src/app/globals.css:46
Details: --ring: 47 99% 49% (amber). Per theme.md §2, ring should be 217 91% 60% (blue-500). Every focus ring across the app is amber instead of blue, violating accessibility/consistency.
C-4: .gradient-bg Uses Red/Amber Instead of Blue Gradient
File: frontend/src/app/globals.css:86
Details: linear-gradient(135deg, #D81B26 0%, #F8C301 50%, #D81B26 100%). Per theme.md §15, the .gradient-bg utility class should be: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%).
C-5: Spinner Uses Warning (Amber) Instead of Blue-600
File: frontend/src/app/globals.css:163-166
Details: .spinner-smooth { border-top-color: hsl(var(--warning)); } renders amber spinner. Per theme.md §18: "border-4 border-blue-600 border-t-transparent". Used in 14+ loading states across the app.
C-6: Unescaped $regex in Attendance Service (ReDoS)
File: backend/src/modules/attendance/attendance.service.ts:295
Details: name: { $regex: query.search, $options: 'i' } — query.search is used directly in a MongoDB $regex without escaping. All other modules use the escapeRegex() utility. This is a Regular Expression Denial of Service (ReDoS) vulnerability and could expose unexpected results via regex special characters.
C-7: Weak/Guessable JWT Secrets
Files: backend/.env lines 9-10, backend/.env.example lines 9-10
Details: JWT_ACCESS_SECRET=dev-access-secret-do-not-use-in-production, JWT_REFRESH_SECRET=dev-refresh-secret-do-not-use-in-production. Trivially guessable — anyone can forge JWTs if they know the repo conventions.
C-8: POS Order Cache Invalidation Missing Critical Keys
File: frontend/src/features/pos/api.ts:86-88
Details: useCreateOrder only invalidates ['customers'] but NOT ['orders'], ['dashboard'], ['tables'], or ['products']. After creating a POS order, dashboard metrics, table status, and order list become stale across all connected terminals.
C-9: Extra CSS Variables Not Defined in Theme Spec
File: frontend/src/app/globals.css:41-53
Details: --accent, --accent-foreground, --chart-1 through --chart-5 are not defined in theme.md §2. These were likely added by shadcn/ui init but not reconciled with the design system. The --accent variable duplicates --warning (amber).
High Priority Issues
H-1: Missing .lean() on 14+ Read-Only Queries
Files: Multiple service files (employees, coupons, categories, users, products, customers, vendors, pos)
Details: Read-only queries that return plain data (no further document manipulation) don't use .lean(). Mongoose hydrates full document objects unnecessarily, consuming 3-5x more memory per result. Affects: listEmployees, listCoupons, listCategories, listUsers, listProducts, listCustomers, getCatalog, getEmployees.
H-2: N+1 Query in Batch Attendance Marking
File: backend/src/modules/attendance/attendance.service.ts:210-247
Details: The for (const record of dto.records) loop calls Employee.findById() and Attendance.create() individually per record instead of using insertMany with batched validation. For 100 employees, this makes 200 DB round-trips instead of 2.
H-3: Tables Endpoint Returns Unlimited Results
File: backend/src/modules/tables/tables.service.ts:32
Details: limit: query.limit ?? 0 — when limit is omitted, MongoDB .limit(0) returns ALL documents. Validation schema makes limit optional, so a request to GET /tables returns every table with no bound.
H-4: POS Catalog/Employees Endpoints Have No Pagination
File: backend/src/modules/pos/pos.service.ts:32-60
Details: getEmployees and getCatalog return ALL employees/products with no limit. For a restaurant with 500+ products, this endpoint loads everything — violating the NFR "fast loading for POS."
H-5: Missing staleTime on Many React Query Hooks
Files: vendors/api.ts, employees/api.ts, customers/api.ts, categories/api.ts, users/api.ts, tasks/api.ts
Details: These hooks have no staleTime, so they refetch on every component mount. This creates unnecessary API calls and degrades perceived performance.
H-6: No React Error Boundary in Frontend
File: Global
Details: No custom ErrorBoundary component exists. The only error handling is Next.js's route-level error.tsx which shows a generic "Something went wrong" message. A crash in one feature component can render the entire dashboard unusable.
H-7: Admin Seed Password Fails Own Validation Rules
Files: backend/.env:14 vs backend/src/shared/validation.ts:8-14
Details: SEED_ADMIN_PASSWORD=naimur009 — this has no uppercase letter, so it fails the application's own passwordSchema regex: /[A-Z]/. The first admin will have a weaker password than what the system requires of ordinary users.
H-8: POS /customers/lookup Lacks Zod Validation
File: backend/src/modules/pos/pos.routes.ts:20, pos.controller.ts:52-56
Details: The phone query parameter on GET /pos/customers/lookup has no Zod validation schema attached via the validate middleware. The controller has an inline if (!phone) check, but phone format, length, and type are never validated — inline validation in a controller contradicts AI_rules.md §4.
H-9: POS Coupon Validation Not in Transaction
File: backend/src/modules/pos/pos.service.ts
Details: Per database.md §5, coupon usageCount increment should happen atomically inside the order-creation transaction. However, looking at the POS service — this needs verification. The architecture explicitly says coupon validation is read-only, but if there's any path where usageCount is updated outside the transaction, race conditions are possible.
H-10: Inline Business Logic in Route File
File: backend/src/modules/uploads/uploads.routes.ts:9-46
Details: Contains multer configuration, inline fileFilter function with MIME type validation, and an inline middleware with if/else chains, instanceof checks, and Math.round() calculations. Per AI_rules.md §2, routes should only wire middleware → controller with no inline logic.
H-11: Missing schema.ts in Attendance and Dashboard Features
Files: frontend/src/features/attendance/, frontend/src/features/dashboard/
Details: Per architecture.md §3, every feature must have schema.ts. Both attendance and dashboard are missing this file. Shared Zod schemas between frontend and backend validation can't be enforced.
H-12: Many useMutation Hooks Lack onError — Errors Silently Ignored
Files: Multiple frontend/src/features/*/api.ts files, frontend/src/app/(dashboard)/orders/page.tsx:69-71
Details: Mutations like deleteMutation.mutate() on the Orders page only have onSuccess with no onError. Failed deletes are silently swallowed — the user sees no error, no toast, no feedback.
Medium Priority Issues
M-1: Widespread Use of Raw text-slate-*/bg-slate-* Instead of CSS Variables
Files: ~50+ components across the entire frontend
Details: While the values are correct, per theme.md §2 these should use CSS variable tokens (--foreground, --secondary-foreground, --muted-foreground, --background, --secondary). This blocks future dark mode support because the hardcoded Tailwind classes don't respond to theme changes.
M-2: Custom Hex Brand Colors #D81B26 and #F8C301 Used Throughout
Files: Sidebar.tsx:83, TopBar.tsx:54, NavItemLink.tsx:32, layout.tsx:191-192, button.tsx:19, redirect/page.tsx (multiple lines)
Details: These red (#D81B26) and gold (#F8C301) colors are not in the theme.md palette at all. They appear in the sidebar brand name, user avatar gradient, active nav indicator, loading bar gradient, warning button shadow, and the redirect page. These should use theme colors — likely blue-600/blue-700 per theme.md §14.
M-3: AttendanceCalendar.tsx Uses Purple Shadow Not in Theme
File: frontend/src/features/attendance/components/AttendanceCalendar.tsx:110
Details: shadow-md shadow-purple-500/20 — purple is not in the tinted shadows list (§5) or any color token in the theme.
M-4: POS Page Monolith (481 lines)
File: frontend/src/app/(dashboard)/pos/page.tsx
Details: A single component at 481 lines containing inline UI, customer lookup with useRef+debounce+AbortController, coupon state, discount state, payment state, dialog management, and order submission. Should be split into CustomerLookup, CouponSection, PaymentSection, OrderConfirmation components.
M-5: Redirect/Default Page Completely Outside Theme
File: frontend/src/app/(public)/redirect/page.tsx
Details: Uses #111, #f4f6f8, #F8C301, #D81B26 — none in theme.md palette. Inline style={{}} with clipPath, WebkitTextStroke. This public page was apparently themed for a different brand (McDonald's-like colors) and is not part of the StationX design system.
M-6: Frontend Missing .env Configuration
File: frontend/ — no .env.example or documented environment variables
Details: The frontend needs NEXT_PUBLIC_API_URL and possibly NEXT_PUBLIC_SOCKET_URL to function. These are not documented in any .env.example file.
M-7: Report Controller Has Inline Validation Logic
File: backend/src/modules/reports/reports.controller.ts:16-18, 36-38
Details: Validates report type against a literal array instead of using a Zod schema. Per AI_rules.md §2, controllers should never contain validation logic.
M-8: Reset Password Does Not Invalidate Old Tokens
File: backend/src/modules/users/users.service.ts
Details: When admin resets a user's password or a user changes their own password, existing refresh tokens remain valid until natural expiry (7 days). Without a token denylist (deferred to Phase 2 per architecture.md), a changed-password account stays accessible via old refresh tokens.
M-9: Missing Tests for Most Modules
Files: Only 9 test files exist for the entire codebase (auth.test.ts, auth-service.test.ts, orders.test.ts, validation.test.ts, middleware.test.ts, jwt.test.ts, settings-service.test.ts, users-service.test.ts, data-management.test.ts)
Details: TEST_CASES.md defines 698 test cases across 27 sections. Only a tiny fraction has actual tests. Critical modules like POS (30 test cases), Tables (27 test cases), Attendance (25 test cases), and cross-cutting auth (10 test cases) have zero test coverage.
M-10: Missing Global Error Notification/Toast System
File: Global frontend
Details: theme.md §16 specifies react-hot-toast for notifications with specific styling (slate-800 bg, slate-50 text, 12px border radius). This is either not implemented or not configured according to spec, and API errors rely on local component state rather than a global notification system.
Low Priority Issues
L-1: No-op .catch() on Cloudinary Cleanup
Files: backend/src/modules/products/products.service.ts:121,124,165, backend/src/modules/settings/settings.service.ts:54
Details: .catch(() => {}) silently swallows errors from deleteFromCloudinary. While non-critical, operational issues with image cleanup will go undetected.
L-2: In-Memory Sort After DB Query in Reports
File: backend/src/modules/reports/reports.service.ts:141
Details: .sort((a, b) => a.employeeName.localeCompare(b.employeeName)) performs JavaScript-level sorting after fetching all records. Should be sorted in the aggregation pipeline.
L-3: Raw fetch() on Homepage Bypassing React Query
File: frontend/src/app/(public)/page.tsx:18
Details: Health check uses raw fetch() inside useEffect. No caching, no retry logic, no loading state. If the component mounts/unmounts rapidly, redundant requests fire.
L-4: Homepage usePublicSettings Hook Violates Architecture
File: frontend/src/features/homepage/api.ts
Details: Feature homepage/ doesn't follow architecture.md's feature structure — no schema.ts, no components/ directory. The hook lives in the feature folder instead.
L-5: Console.log of Employee IDs in Production Path
File: backend/src/modules/attendance/attendance.service.ts:167,198
Details: console.log('[markAttendance] Request employeeId:', ...) and console.error('[E11000] Duplicate key...', ...) — logs internal IDs to stdout.
L-6: No Backend Linting/TypeScript Check Scripts
File: backend/package.json
Details: No script for lint, typecheck, or test:ci. The project lacks CI-ready validation commands.
L-7: SalaryList Frontend Loads limit=500
File: frontend/src/features/salaries/components/SalaryList.tsx:54-57
Details: Salary adjustments list loads with limit: 500 hardcoded. Not paginated server-side.
Suggested Improvements
 1. Rotate all secrets immediately — change MongoDB password, Cloudinary API keys, JWT secrets, regenerate all credentials that were exposed in .env
 2. Fix CSS variables to match theme.md — change --primary/--ring/--warning/--accent values to the spec's blue/blue-500/amber-500 values; remove --chart-1..5 and --accent
 3. Add .lean() to all read-only service queries (14+ locations)
 4. Fix N+1 in batch attendance — use findByIds then insertMany
 5. Paginate POS catalog/employees — add page/limit params to GET /pos/catalog and GET /pos/employees
 6. Add staleTime to all list React Query hooks — 30s minimum for static data
 7. Create React Error Boundary wrapper around the dashboard layout
 8. Fix cache invalidation in POS useCreateOrder — invalidate ['orders'], ['dashboard'], ['tables']
 9. Remove custom hex brand colors — replace #D81B26/#F8C301 with theme blue tokens
10. Add escapeRegex() to attendance search — import from shared lib
11. Replace the redirect/page.tsx — it uses non-theme colors and appears to be a different brand's page
12. Add frontend .env.example with required vars documented
13. Consider adding a CSRF token in addition to Origin/Referer header check
14. Break up the POS page into smaller components
15. Add test coverage starting with POS, Tables, and Auth (highest business impact)