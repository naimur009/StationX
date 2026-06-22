# Decisions Log — Restaurant Management Dashboard

> Append-only running log of decisions made while implementing a feature that resolve an "open item" tracked in `AI_rules.md` §13, `database.md` §8, or `API.md` §25 — or that otherwise deviate from / clarify an upstream doc.
>
> **This file is the history of *why*. The upstream docs (`PRD.md`, `architecture.md`, `database.md`, `API.md`, `AI_rules.md`) remain the *current truth*.** Don't let a decision live only here — if you log a decision below, the corresponding doc must already reflect it.
>
> Workflow: per `backlog.md`'s "How to Use This File" step 5, copy `current_task.md`'s "Notes / Decisions Made During This Task" section here right before clearing that file for the next pick.

---

## Format

```
### [Backlog #] Task Name — YYYY-MM-DD

**Open item resolved:** (cite source, e.g. `API.md §25.4`)
**Decision:**
**Doc(s) updated:** (file + section)
**Reasoning:**
```

---

## Log

### [3] Users & Permissions — 2026-06-22

**Open items resolved:** `API.md §25.4`, `AI_rules.md §13.4`
**Decision:** Admin sets password directly on `POST /users` (Option B, not email-based invite). `GET /users/:id` returns `200` with `isActive: false` for inactive users.
**Doc(s) updated:** `API.md §5` (removed "also used for first-time account setup"), `API.md §6` (replaced reset-flow note with admin-sets-password explanation), `API.md §25.4` (marked resolved), `AI_rules.md §13.4` (marked resolved)
**Reasoning:** Option B is simpler, removes email-provider dependency, gives admin immediate certainty the account is usable. Returning 200 for inactive users allows the client to decide rendering.

### [4] Settings — 2026-06-22

**Open items resolved:** `DATABASE.md §8.2`, `API.md §25.5`, `AI_rules.md §13.5`
**Decision:** `Settings.taxConfig.mode` = `'none'` for v1 — no tax calculation anywhere in the system. POS `taxAmount` is always 0. The `taxConfig` field retains the full enum (`none | flat | itemized`) in the schema for forward compatibility, but only `none` is functional in v1.
**Doc(s) updated:** `DATABASE.md §8.2` (marked resolved), `API.md §25.5` (marked resolved), `AI_rules.md §13.5` (marked resolved)
**Reasoning:** Tax calculation adds complexity to POS order creation, Settings configuration, and reporting. Deferring it to a future phase reduces v1 scope without breaking schema compatibility — the field is already designed for the full enum.