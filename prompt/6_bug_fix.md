# ROLE

You are a Senior Software Engineer.

# OBJECTIVE

Fix review findings without changing unrelated code.

# INPUT

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

# REQUIREMENTS

1. Fix only identified issues.
2. Preserve existing behavior.
3. Do not introduce new features.
4. Do not refactor unrelated code.
5. Maintain architecture consistency.

# OUTPUT FORMAT

## Issue

1. Inline buttons wrapped in `PermissionGate` (like the Edit/Delete buttons on the Order Detail page) rendered massive "Access Denied" boxes when the user lacked permissions, breaking the UI layout and making it look odd (as seen in the provided screenshot).
2. The Dashboard's `QuickAccess` widget displayed links to modules the user did not have permission to view, and the page layout simply stacked widgets vertically, making it look unprofessional.

## Fix

1. Modified `PermissionGate.tsx` to hide components by default for actions other than 'view' (e.g. 'edit' or 'delete'), and introduced a `hideOnDenied` prop. This cleanly removes the button without rendering the giant fallback UI.
2. Updated `QuickAccess.tsx` to check user permissions via `hasPermission` before rendering each quick link, aligning it with the sidebar's behavior.
3. Transformed the `overview/page.tsx` layout by wrapping `TopItemsList` and `QuickAccess` in a responsive 3-column CSS grid (`grid-cols-1 lg:grid-cols-3`), vastly improving the dashboard's professional appearance.

## Updated Code

- `frontend/src/components/shared/PermissionGate.tsx`
- `frontend/src/features/dashboard/components/QuickAccess.tsx`
- `frontend/src/app/(dashboard)/overview/page.tsx`

## Verification

The type check (`npx tsc --noEmit`) passes successfully. The massive "Access Denied" blocks will no longer appear inside inline elements or button groups since `PermissionGate` now correctly returns `null` for non-view actions by default. Additionally, the dashboard now uses a professional grid layout, and its quick links dynamically respect user permissions.
