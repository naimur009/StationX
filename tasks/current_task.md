## 4. Settings

**PRD Feature 14** | `API.md` §20 | `DATABASE.md` §3.14
**Depends on:** Users & Permissions
**Why early:** POS's tax calculation reads `Settings.taxConfig` — needs to exist (even with defaults) before POS is finished.

### Backend
- [x] `Settings` model, singleton via fixed `_id`
- [x] `GET /settings`
- [x] `PUT /settings` — **merge**, not replace; only submitted top-level fields overwrite, untouched sections (e.g. `logo`) survive a Tax-only save
- [x] Seed/upsert the singleton document on first boot if it doesn't exist yet, so `GET /settings` never 404s

### Frontend
- [x] `features/settings/api.ts`, `schema.ts`
- [x] Settings page split into sections: Business Info, Tax, Business Hours, Logo — each section saves independently (calls `PUT /settings` with only its own fields)
- [x] Logo upload (uses Shared Uploads endpoint — build that task first or stub it temporarily)

### Design
- [x] Decide section layout: tabs vs single scrollable page with anchored sections
- [x] Decide save-feedback pattern per section (since each section saves independently, each needs its own success/error state, not one global save button)

### Open item to resolve during this task
- [x] `DATABASE.md` §8.2 — confirm `taxConfig.mode` for v1 is `flat` only, or whether `itemized` is needed now. This gates POS's tax logic, so decide before POS starts.
  **Decision:** `mode: 'none'` for v1 — no tax calculation. POS `taxAmount` is always 0.

---

## Notes / Decisions Made During This Task

**Open items resolved:**
- `DATABASE.md` §8.2 — marked **RESOLVED** with `mode: 'none'` for v1
- `API.md` §25.5 — marked **RESOLVED**
- `AI_rules.md` §13.5 — marked **RESOLVED**

**Doc updates applied:**
- `DATABASE.md` §8.2 — struck through, marked RESOLVED
- `API.md` §25.5 — struck through, marked RESOLVED
- `AI_rules.md` §13.5 — struck through, marked RESOLVED
- `docs/decision.md` — new entry added for [4] Settings

**Implementation notes:**
- Logo upload is stubbed with a URL text input — real upload component will replace it when Task 6 (Shared Uploads) is built
- Settings singleton uses fixed `_id: 'restaurant-settings'` (string, not ObjectId)
- `PUT /settings` uses merge semantics via `$set` — only submitted top-level fields overwrite
- Auto-seed on first `GET /settings` if document doesn't exist yet
- Frontend uses per-section independent save buttons with inline success/error feedback (no toast library)
