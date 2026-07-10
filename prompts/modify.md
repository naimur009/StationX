# Modify Feature Prompt

Use this prompt template when modifying an existing feature. Copy it into your chat, fill in the sections, and send.

```
You are modifying an existing feature in the Restaurant Management Dashboard.

## Required Reading

First read these docs to understand the project conventions:

1. `docs/PRD.md` — product requirements
2. `docs/AI_rules.md` — coding standards, project structure, API discipline
3. `docs/theme.md` — design tokens (colors, spacing, breakpoints)
4. `docs/decision.md` — decisions log (check for past decisions related to this module)

Then read these docs relevant to the feature being modified:

5. `docs/API.md` — API contract for the module
6. `docs/database.md` — schema design for the relevant collections
7. `docs/TEST_CASES.md` — existing test cases for the module
8. `tasks/implementation_plan.md` — original implementation plan
9. `tasks/current_task.md` — current task context
10. `tasks/backlog.md` — upcoming tasks

## Feature to Modify

**Module:** <orders>
**What to change:**
VAT calculation: there are multiple category like drinks, snacks and each category have different vat rate. in each category there are multiple products. and all products contain same vat rate of the category. for example, in drinks category vat rate is 5% and in snacks category vat rate is 10%. and the vat is calculated on each product price not on total amount.

suppose a customer add 2 mojo (price = 20tk, drinks category, VAT = 6%) and 2 chicken fry (price = 100tk, snacks, vat = 5%), total 4 products.
so, the vat  = 2 * 20 * 6% + 2 * 100 * 5% = 2 + 10 = 12 tk.
this is the process of calculating the vat, after calculate the total vat add this to the total amount and then add the vat on the discount also. if a customer has discount of 20tk then total discount = vat + discount = 12 + 20tk. and if the customer has no discount then total discount = vat = 12 tk. by default discount is 0. 

after calculate total discount subtract this from total amount (vat + total) = 42 + 12 - 32 = 22tk.

in the order details show the total vat amount. it also store on the database also, what is the total vat on this order. this will help in future to calculate the vat report.
    


## Scope Boundaries

Things that MUST NOT change:
<e.g. "Do not touch the POS cart Zustand store", "Do not change the API response envelope", etc.>

## Tasks

1. Read the existing source files for this module (both frontend and backend).
2. Understand the current flow end-to-end before making changes.
3. Update backend: <files to modify or create>
4. Update frontend: <files to modify or create>
5. Update docs if needed (API.md, database.md, TEST_CASES.md, decision.md).
6. Run `tsc --noEmit` in both backend/ and frontend/ — must pass with zero errors.
7. Run `npm test` in backend/ — existing tests must still pass; add or update tests.
8. Run `npm run lint` if available.

## Constraints

- Follow `AI_rules.md` strictly. Do not introduce libraries outside the locked stack.
- Every color, spacing, and breakpoint comes from theme.md tokens — no hardcoded values.
- API responses use the standard envelope: `{ data: ... }` for single, `{ data: [...], meta: {...} }` for lists.
- Error responses use `{ error: { code, message, details? } }`.
- All mutating endpoints validate via Zod schema before the controller runs.
- Activity logging is global and automatic — do not add module-specific logging calls.
- Permission checks use existing module keys from API.md §24 — do not invent new keys.
- Financial fields are never editable post-creation (snapshot rule).
- Use the project's existing component library (shadcn/ui patterns in `components/ui/`).

## Verification

Before finishing:
1. `cd backend && npx tsc --noEmit`
2. `cd frontend && npx tsc --noEmit`
3. `cd backend && npm test`
4. Verify the full test suite still passes.
5. If the modification affects API contracts, check that TEST_CASES.md still matches.
```

---

## Example Usage

> Paste the template above into a new chat, then fill in the sections. For example:

```
**Module:** orders
**What to change:**
Add a "notes" field to orders. The field should be:
- Optional string, max 500 chars
- Editable via PUT /orders/:id alongside existing fields
- Displayed in OrderDetail component
- Not included in bill PDF
**Things that MUST NOT change:**
- Status transition rules
- Delete guard conditions
- Financial field immutability
- API response envelope
```
