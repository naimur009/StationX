# ROLE

You are a Senior Software Engineer.

# OBJECTIVE

Fix review findings without changing unrelated code.

# INPUT

Review Findings:

VAT calculation: there are multiple category like drinks, snacks and each category have different vat rate. in each category there are multiple products. and all products contain same vat rate of the category. for example, in drinks category vat rate is 5% and in snacks category vat rate is 10%. and the vat is calculated on each product price not on total amount.

suppose a customer add 2 mojo (price = 20tk, drinks category, VAT = 6%) and 2 chicken fry (price = 100tk, snacks, vat = 5%), total 4 products.
so, the vat  = 2 * 20 * 6% + 2 * 100 * 5% = 2 + 10 = 12 tk.
this is the process of calculating the vat, after calculate the total vat add this to the total amount and then add the vat on the discount also. if a customer has discount of 20tk then total discount = vat + discount = 12 + 20tk. and if the customer has no discount then total discount = vat = 12 tk. by default discount is 0. 

after calculate total discount subtract this from total amount (vat + total) = 42 + 12 - 32 = 22tk.

in the order details show the total vat amount. it also store on the database also, what is the total vat on this order. this will help in future to calculate the vat report.

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
