Act as a senior security engineer reviewing the {MODULE} module specifically
(not the whole app).

MODULE: "User and permission"

Context to read first:
- AI_rules.md §5 (Auth & Permissions), §9 (Error Handling), §10 (Security),
  §11 (Activity Logging)
- API.md (the {MODULE} section — permission module key + action list from §25)
- database.md §3 (schema — note any field that must never leak, e.g.
  passwordHash, or must never be client-writable, e.g. usageCount, orderNumber,
  priceSnapshot)

Check:
1. Authentication — every route requires a valid access token unless API.md
   explicitly marks it "Auth: none"/"Auth: optional" for this module.
2. Authorization — every route calls `authorize(module, action)` with the
   correct module key from API.md §25 and the correct action; no route
   silently defaults to "any authenticated user"; admin bypass is intentional,
   not accidental.
3. Input validation — every mutating endpoint validates via Zod before the
   controller runs; unknown/extra fields are stripped, not persisted; the
   client cannot set server-controlled fields (`createdBy`, `_id`, computed
   totals, `usageCount`, snapshot fields, `orderNumber`) even if included in
   the request body — actually trace what happens if they're sent.
4. Injection — no raw/string-interpolated Mongo queries; all filters go
   through Mongoose query builders.
5. Data exposure — no sensitive field (passwordHash, internal-only metadata)
   returned in any response path for this module, including error paths and
   populated sub-documents.
6. Business-logic abuse — for {MODULE} specifically, look for:
   - Race conditions on any counter/limit (coupon usageCount, salary
     remainingBalance, attendance uniqueness, order numbering)
   - IDOR: can a user with valid auth but no ownership/permission over a
     specific record still access/modify it via a guessed ID?
   - Privilege escalation via a module's own edit endpoint (e.g. can a
     non-permissions route be used to indirectly change access/role/status?)
   - Guard rails from API.md/AI_rules.md (e.g. CANNOT_DEACTIVATE_SELF,
     LAST_ADMIN_PROTECTED, ORDER_NOT_DELETABLE conditions) — are they checked
     in every code path that can trigger the action, or only the "main" route?
7. Error handling — errors from this module never leak stack traces, raw Mongo
   error text, or file paths; unhandled cases collapse to generic 500.
8. Audit trail — every mutating route in this module is actually covered by
   the global activityLogger, and `ActivityLog.description` is server-generated,
   never a pass-through of user free text.
9. Rate limiting — if {MODULE} exposes any public/unauthenticated endpoint
   (check API.md "Auth: none" rows), confirm it has appropriate rate limiting.

Give findings with severity (Critical/High/Medium/Low), exact file/route,
proof-of-concept description (not exploit code), and remediation.