Act as a principal software architect doing a code review of the {MODULE} module.

MODULE = "Tasks"

Context to read first:
- AI_rules.md (all sections — this is the binding coding standard)
- architecture.md §9 (module-to-architecture mapping for {MODULE})
- database.md §3 (schema for the collection(s) {MODULE} touches)
- API.md (the {MODULE} section — exact endpoint contract)
- decision.md (search for any entries mentioning {MODULE} — these are settled
  decisions, not open questions; don't re-litigate them, just verify the code
  matches them)

Files to review:
- backend/src/modules/{MODULE}/
- backend/src/models/{RELEVANT_MODEL}.ts
- frontend/src/features/{MODULE}/

Check specifically against AI_rules.md:
1. §1 Stack — no substituted libraries, no `any`, strict TypeScript
2. §2 Project Structure — controllers have zero business logic; services own it;
   file layout matches the module template exactly
3. §3 API Contract Discipline — envelope shape `{ data }`/`{ error }`, permission
   module key matches API.md §24's fixed list, pagination/date-range use the
   shared helpers (not reimplemented), server-recalculated money fields,
   snapshot fields are never re-derived from live documents on read
4. §4 Validation — Zod schema runs via `validate` middleware before the
   controller; frontend/backend schemas match in shape; money fields use
   `.multipleOf(0.01)`
5. §5 Auth & Permissions — `authenticate` + `authorize(module, action)` present
   on every protected route; no hardcoded role checks; passwordHash excluded
   at the query-projection level if User is touched
6. §6 Database Rules — correct soft/hard delete per the collection; no direct
   writes to frozen/snapshot/write-once fields outside creation; transactions
   used where database.md §5 requires them
7. §7 Real-Time Events — emitted event names/payloads match API.md §23 exactly,
   emitted only after DB commit
8. §8 Frontend Conventions — theme.md tokens only (no hardcoded hex/arbitrary
   Tailwind), correct React Query vs Zustand vs RHF split, PermissionGate
   present on the page
9. §9/§10/§11 — central errorHandler only, no raw Mongo queries, secrets in
   env vars, activityLogger inherited (not reimplemented)

Give findings with severity (Critical / High / Medium / Low), the exact file
and line/function, which specific rule or doc section it violates, and a
one-line fix suggestion. If a "violation" is actually a resolved item in
decision.md, say so and skip it — don't flag settled decisions as bugs.

If a prompt-conflict-worthy issue turns up (code deviates from AI_rules.md in
a way that looks intentional), flag it per AI_rules.md §12 rather than
silently accepting or silently "fixing" it.