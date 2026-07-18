# ROLE

You are a Senior Software Engineer.

# OBJECTIVE

Fix review findings without changing unrelated code.

# INPUT

Review Findings:

when admin or user is already logged in, then from homepage when click staff login it redirect to dashboard. but in between a blank white screen is shown. i want that a cool annimation is shown in between. the animation should look very look. 

in dashboard, when click logout, it redirect to homepage. but in between a blank white screen is shown. i want that a cool annimation is shown in between. the animation should look very look. 

the animation should be like the name of the organization is shwoing in the screen for 2 seconds and then it should redirect to the homepage. and the organization name is coming from config.json file. 


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
