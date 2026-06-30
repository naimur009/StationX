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

### [6] Customer Phone-First Matching, Auto-Refresh & Hard Delete — 2026-06-30

**Open item resolved:** `DATABASE.md` §3.6 (Customer — soft-delete vs hard-delete), `PRD.md` §17 (Customers — "should be linked to their order history")

**Decision:**
1. **Phone is the primary customer identifier.** POS order creation matches solely by `customerPhone`. If a phone match is found, the customer record is updated (name changed if provided, `orderCount` incremented) — no name-matching required. If no match, a new customer is created.
2. **Hard delete** — `DELETE /customers/:id` permanently removes the document (`findByIdAndDelete`). The `isActive` field remains on the model for informational use but is not returned in API responses.
3. **Auto-refresh** — React Query's `['customers']` key is invalidated after POS order creation, so the customer list auto-refreshes without manual page reload.
4. **`isActive` removed from API response** — The response no longer includes `isActive`. Displayed fields are: name, phone, orderCount.

**Doc(s) updated:**
- `DATABASE.md` §3.6 (updated notes — hard delete, phone-primary matching)
- `API.md` §18 (response shapes — removed `isActive`, hard delete docs)
- `TEST_CASES.md` §14 (updated CUST-H-06–H-08, added CUST-CROSS-04)
- `backend/src/modules/pos/pos.service.ts` (simplified customer matching)
- `backend/src/modules/customers/customers.service.ts` (hard delete, removed isActive from response)
- `frontend/src/features/customers/api.ts` (removed isActive from response type)
- `frontend/src/features/customers/components/CustomerList.tsx` (removed isActive filter, Status column, changed Deactivate to Delete)
- `frontend/src/app/(dashboard)/customers/DeleteCustomerDialog.tsx` (hard delete confirmation)
- `frontend/src/features/pos/api.ts` (auto-refresh customers after order)

**Reasoning:** Phone is the most practical unique identifier for restaurant customers (many share names, few share phones). Hard delete matches the user's operational preference — admins want to permanently remove customers, not just deactivate them. Auto-refresh removes a friction point where staff had to manually refresh the customers page after placing an order.

### [5] Customer Auto-Creation & History — 2026-06-30

**Open item resolved:** `PRD.md` §17 (Customers — "should be linked to their order history"), `DATABASE.md` §3.6 (Customer — previously no `orderCount`/`history` fields)

**Decision:** POS order creation auto-creates or updates `Customer` documents when `customerName`/`customerPhone` are provided. If a customer with that phone already exists, their `orderCount` is incremented and their name is updated (with the old name pushed to `history`). The `updateCustomer` endpoint also pushes changed field values to `history`. The customer's `orderCount` field tracks total orders placed. `GET /customers/:id?includeOrders=true` populates actual orders from the `Order` collection.

**Doc(s) updated:**
- `DATABASE.md` §3.6 (added `orderCount` and `history` fields)
- `API.md` §18 (updated response shapes, added customer-auto-creation documentation)
- `TEST_CASES.md` §14 (added CUST-H-07–CUST-H-11, CUST-CROSS-03, CUST-E-02)
- `backend/src/models/Customer.ts` (ICustomer interface + schema)
- `backend/src/modules/customers/customers.service.ts` (response, update, getCustomerById)
- `backend/src/modules/pos/pos.service.ts` (createOrder)
- `frontend/src/features/customers/api.ts` (CustomerResponse)
- `frontend/src/features/customers/components/CustomerList.tsx` (orderCount column)

**Reasoning:** Automatic customer creation during POS checkout reduces friction for cashiers — they don't need to toggle to a separate Customers module to register a walk-in. History tracking ensures data changes are auditable (who changed what, when) without relying on the ActivityLog module, since customer field changes (name, phone) are informational rather than transactional. `orderCount` gives a quick at-a-glance measure of customer engagement without an aggregation query.

### [4] Settings — 2026-06-22

**Open items resolved:** `DATABASE.md §8.2`, `API.md §25.5`, `AI_rules.md §13.5`
**Decision:** `Settings.taxConfig.mode` = `'none'` for v1 — no tax calculation anywhere in the system. POS `taxAmount` is always 0. The `taxConfig` field retains the full enum (`none | flat | itemized`) in the schema for forward compatibility, but only `none` is functional in v1.
**Doc(s) updated:** `DATABASE.md §8.2` (marked resolved), `API.md §25.5` (marked resolved), `AI_rules.md §13.5` (marked resolved)
**Reasoning:** Tax calculation adds complexity to POS order creation, Settings configuration, and reporting. Deferring it to a future phase reduces v1 scope without breaking schema compatibility — the field is already designed for the full enum.