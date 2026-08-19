# ROLE

You are a Senior Software Engineer.

# OBJECTIVE

Fix review findings without changing unrelated code.

# INPUT


Critical Issues
1. Privilege escalation: any user with users:edit can reset the admin's password and take over the system
backend/src/modules/users/users.service.ts:367-386, route at users.routes.ts:41. adminResetUserPassword has no role check — the only guard is id !== actorId. users:edit is grantable to employees (MODULE_ACTIONS.users = ['view','create','edit','delete']). An employee can reset the admin password, log in as admin, and become omnipotent. The same gap lets users:delete holders deactivate/permanently-delete admin accounts (users.service.ts:198-234).

fix: fix this problem in the code and also in the .md files

2. Restore-backup endpoint injects attacker-chosen admin accounts
backend/src/modules/settings/data-management.service.ts:138 + settings.validation.ts:48-50. Restore validates only collection-key presence and adminCount > 0; User documents are insertMany'd verbatim as z.any(). A settings:edit holder can restore a backup containing { email: attacker@x, role: 'admin', passwordHash: <own hash> } — instant admin creation, all users wiped.

fix: fix this problem in the code and also in the .md files


3. Cancelled (terminal) order can be revived and marked paid — fabricated revenue
backend/src/modules/orders/orders.service.ts:710-751. The paymentStatus: 'paid' branch executes before the VALID_TRANSITIONS check (line 817) and never checks order.status. PATCH /orders/:id/status with {paymentStatus:'paid', payment:{method:'cash'}, cashTendered:X} on a cancelled order sets status:'completed' + paymentStatus:'paid', entering dashboard/report revenue. cancelledAt/cancelReason aren't even cleared. updateOrder also allows editing a cancelled order's items before revival → cancel → inflate → capture = cash-out fraud.

fix: fix this problem in the code and also in the .md files


4. Coupon redemption skips validFrom / minOrderAmount checks
backend/src/modules/pos/pos.service.ts:163 and orders.service.ts:521. Order creation only checks isEnabled + validUntil. Scheduled coupons (validFrom in the future) are redeemed early, and orders below minOrderAmount still get the discount. validateCoupon (preview endpoint) checks these; the actual redemption path does not.

fix: fix this problem in the code and also in the .md files

5. Negative grandTotal is persisted (discount exceeds subtotal)
pos.service.ts:205 / orders.service.ts:533,540,552: grandTotal = round2(subtotal - discountAmount) with no clamp. Flat coupon value is unbounded, and coupon discount stacks with manual discountPercent (each capped at 100% individually, not combined). A BDT-500 coupon on a 300 order → grandTotal = -200 flows into revenue $sums as negative revenue.

fix: fix this problem in the code and also in the .md files


6. Client-supplied changeAmount trusted at payment capture
orders.service.ts:748 (and PUT path :592-593): setFields.changeAmount = changeAmount != null ? changeAmount : .... Docs (API.md §10) require server-side computation. A cashier can submit cashTendered: 1000, changeAmount: 0 on a 500 order — the bill prints no "Returned" line; cash skimming with no audit trail.

fix: fix this problem in the code and also in the .md files


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
