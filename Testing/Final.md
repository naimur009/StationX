Act as the release gatekeeper for the {MODULE} module. Prompts 1 (Code
Review), 2 (QA Testing), and 3 (Security Review) have already been run and
their Critical/High findings have been fixed.

Context to read:
- The fixed code: backend/src/modules/{MODULE}/, backend/src/models/
  {RELEVANT_MODEL}.ts, frontend/src/features/{MODULE}/
- AI_rules.md, database.md §3 ({MODULE}), API.md ({MODULE} section),
  TEST_CASES.md §{SECTION_NUMBER}, decision.md (any {MODULE} entries)

Task:
1. Independently re-verify the fixes actually resolved what was flagged —
   don't trust the fix descriptions, re-check the code directly against the
   original finding.
2. Re-run the full TEST_CASES.md §{SECTION_NUMBER} list (plus §0 cross-cutting
   suites) fresh, as if Prompt 2 had never happened. Note any regression a fix
   may have introduced elsewhere in the same module.
3. Confirm no Critical or High severity issue remains open from any of the
   three prior reviews. A Medium/Low may remain open only if explicitly
   accepted below with a reason.
4. Score the module 0–100 across these weighted categories, showing your
   math:
   - Contract Compliance (API.md/database.md/AI_rules.md adherence) — 30%
   - Test Coverage & Correctness (TEST_CASES.md pass rate + edge cases) — 30%
   - Security (auth, authz, injection, data exposure, business-logic abuse) — 30%
   - Code Quality (structure, typing, error handling per AI_rules.md) — 10%
5. List any accepted Medium/Low issues explicitly, with the reason they're
   acceptable to ship with (e.g. "documented open item," "cosmetic," "no
   security/financial impact").
6. Give a final verdict:

   **VERDICT: APPROVED** — only if score ≥ 90 AND zero open Critical/High
   findings AND every TEST_CASES.md case for this module passes or is a
   documented, accepted exception.

   **VERDICT: NOT APPROVED** — otherwise. List exactly what must be fixed
   before re-submission, ranked by severity, with no more than the top 3
   items called "blocking."

Output format:
---
### {MODULE} — Final Review

| Category | Score | Notes |
|---|---|---|
| Contract Compliance | x/30 | |
| Test Coverage & Correctness | x/30 | |
| Security | x/30 | |
| Code Quality | x/10 | |
| **Total** | **x/100** | |

**Open issues accepted as-is:** (list or "None")

**VERDICT: APPROVED / NOT APPROVED**

**Blocking items (if not approved):** (numbered list, max 3)
---