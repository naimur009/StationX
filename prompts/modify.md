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

**Module:** <salaries>
**What to change:**

in salary section, suppose a employee's salary is 10,000 but from this section i can give more than 10,000, this is a huge issue. 

so add a validator that a employee cant get more than his salary by the main salary option. but he can get extra by bonus section


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


