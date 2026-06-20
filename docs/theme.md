# Theme & Design System — Restaurant Management Dashboard

> Derived from `PRD.md` (NFRs: mobile responsive, dark mode, fast loading), `architecture.md` §2/§3 (Tailwind CSS + shadcn/ui, locked in `AI_rules.md` §1), and `backlog.md`, whose Task 1 Design checklist says: *"Establish the base typography/color/spacing tokens here if not already done in Project Setup — every later module's forms reuse whatever's decided now."* This document **is** that earlier decision, made explicit so it doesn't get invented ad hoc partway through Auth & Access Control.
>
> **Why this document exists and wasn't in `guideline.md`'s original Phase 1–2 list:** none of `PRD.md` / `architecture.md` / `database.md` / `API.md` specify a single hex value, font, or spacing unit — by design, per `backlog.md`'s repeated note that "Design checklists deliberately don't prescribe colors/layout... that's `frontend-design` skill territory, decided at build time." Eighteen modules, each generated as a separate task (possibly in separate sessions, possibly by different models per `guideline.md` Phase 4), is exactly the situation where that freedom causes drift — Task 7's coupon-status badge colors and Task 10's order-status badge colors would otherwise be invented independently and disagree. This document is the one place those tokens are decided, so every later task's Design checklist inherits them instead of re-deciding them.
>
> **Scope discipline, matching the rest of this doc set:** this file fixes *tokens and conventions* — color, type, spacing, radius, status-badge mapping, component patterns, motion, copy voice. It does **not** fix page-specific layout calls (e.g., POS's tablet-vs-phone split, the permission-editor's matrix-vs-accordion pattern) — those remain each task's own Design checklist item in `backlog.md`, now answered using the tokens defined here rather than improvised tokens.
>
> Stack constraint this must fit inside (`AI_rules.md` §1): **Tailwind CSS + shadcn/ui only** — no CSS Modules, no styled-components, no inline `style={}` except genuinely dynamic values (e.g. a computed chart color). Every token below is expressed as a Tailwind/shadcn CSS variable for that reason.

---

## 1. Design Direction

**Subject:** a restaurant's day-to-day operations — taking orders at a counter under time pressure, closing out a shift, reading yesterday's numbers, restocking from a vendor invoice. **Audience:** Admins, Managers, and Employees who use this daily as a *working tool*, not visitors evaluating a product. **The page's job, almost everywhere in this app, is the same:** let someone scan a number, confirm a status, or complete an action in seconds, accurately, often on a tablet at a counter mid-rush.

That reframes "distinctive design" away from a marketing-site hero moment (this app has exactly one of those — the Home Page) and toward **a disciplined instrument panel with one consistent point of view**, expressed mostly through restraint, density, and a few deliberate motifs rather than decoration.

**Direction — "Ticket & Ledger":** the visual language borrows from two real artifacts of a restaurant's back-of-house, not from generic SaaS dashboards: the **kitchen order ticket** (a torn paper stub, sequential numbers, tabular figures) and the **ledger page** (hairline rules, flat tabular rows, no-nonsense numerals). Status badges read like rubber-stamped tickets. Money and order numbers are set in a monospaced face so columns of figures actually align, the way a real receipt does. The one place the app is allowed to feel warm and characterful is the public Home Page hero; everywhere behind the login wall stays quiet, dense, and fast to read.

**Explicitly avoided:** the warm-cream-background-plus-terracotta-serif look and the stark near-black-with-one-neon-accent look are both common AI-generated defaults regardless of subject — neither is chosen here. The palette below is a cooler, marble/steel-toned neutral with a **deep herb green** as the primary accent (a real restaurant material — fresh garnish, not a decorative gradient) and **copper/ember** reserved narrowly for destructive and alert states, which also matches its real-world association (heat, caution) rather than being picked for novelty.

---

## 2. Color Tokens

Six named hues, each with a clear job. Hex values are a deliberate starting point — verify final contrast ratios (WCAG AA, 4.5:1 body text / 3:1 large text & UI) with a contrast checker once rendered, per the accessibility baseline in §9.

| Token name | Hex (light) | Hex (dark) | Role |
|---|---|---|---|
| **Ink** | `#1A1B17` | `#ECEBE6` | Primary text/foreground |
| **Marble** | `#EEF0EC` | `#141713` | Page background — cool, low-chroma neutral (a prep counter, not warm cream) |
| **Slate** | `#6B7068` | `#9A9F95` | Secondary text, muted labels, placeholders |
| **Herb** | `#2F5233` | `#5C9A63` | **Primary accent** — primary buttons, active nav, links, "completed/active/success" states |
| **Ember** | `#B5481E` | `#E2723D` | **Destructive/alert accent** — destructive buttons, "cancelled/expired/danger" states only |
| **Brass** | `#9C7A3C` | `#C9A368` | **Warning/highlight accent** — "pending/scheduled/warning" states, featured/highlight backgrounds |

One supporting hue, used only for badges that mean "in progress / informational" (neither success nor warning nor danger):

| Token name | Hex (light) | Hex (dark) | Role |
|---|---|---|---|
| **Steel** | `#3F6173` | `#7FA8BC` | "in_progress" / informational badges only |

### shadcn/ui CSS variable mapping

Drop into `app/globals.css` (Tailwind + shadcn convention per `architecture.md` §2). This is what Task 0/Task 1 implements directly — no later task should hand-roll a different `--primary`.

```css
@layer base {
  :root {
    --background: 100 14% 93%;        /* Marble */
    --foreground: 70 7% 11%;          /* Ink */
    --card: 100 14% 97%;
    --card-foreground: 70 7% 11%;
    --popover: 100 14% 97%;
    --popover-foreground: 70 7% 11%;
    --primary: 128 27% 25%;           /* Herb */
    --primary-foreground: 100 14% 97%;
    --secondary: 90 5% 60%;           /* Slate, muted */
    --secondary-foreground: 70 7% 11%;
    --muted: 100 10% 88%;
    --muted-foreground: 90 5% 40%;
    --accent: 38 44% 43%;             /* Brass */
    --accent-foreground: 70 7% 11%;
    --destructive: 18 71% 41%;        /* Ember */
    --destructive-foreground: 100 14% 97%;
    --info: 197 30% 34%;              /* Steel — custom, not default shadcn */
    --info-foreground: 100 14% 97%;
    --border: 100 8% 82%;
    --input: 100 8% 82%;
    --ring: 128 27% 25%;              /* Herb, for focus rings */
    --radius: 0.625rem;
  }

  .dark {
    --background: 80 9% 7%;
    --foreground: 60 10% 91%;
    --card: 80 9% 10%;
    --card-foreground: 60 10% 91%;
    --popover: 80 9% 10%;
    --popover-foreground: 60 10% 91%;
    --primary: 126 26% 47%;
    --primary-foreground: 80 9% 7%;
    --secondary: 90 5% 35%;
    --secondary-foreground: 60 10% 91%;
    --muted: 80 7% 16%;
    --muted-foreground: 90 5% 65%;
    --accent: 37 38% 60%;
    --accent-foreground: 80 9% 7%;
    --destructive: 22 73% 59%;
    --destructive-foreground: 80 9% 7%;
    --info: 196 28% 60%;
    --info-foreground: 80 9% 7%;
    --border: 80 7% 20%;
    --input: 80 7% 20%;
    --ring: 126 26% 47%;
  }
}
```

> `--info` is an addition beyond shadcn's default token set — needed because several modules (Tasks' `in_progress`, Orders mid-flow states) require a fourth semantic color beyond success/warning/destructive. Treat it as a first-class token everywhere `--destructive` is, not a one-off inline color.

---

## 3. Typography

Three roles, deliberately not the same family doing double duty, and deliberately not whatever a fresh `create-next-app` defaults to:

| Role | Typeface | Used for |
|---|---|---|
| **Display / Chrome** | **Space Grotesk** (weights 500/600/700) | Page titles, section headers, sidebar nav labels, `MetricCard` headline numbers on Dashboard. Geometric, slightly technical — reads like instrument-panel labeling, not a magazine headline. |
| **Body / UI** | **IBM Plex Sans** (weights 400/500/600) | Body copy, form labels, table cell text, buttons, badges. Designed for data-dense interfaces; legible at small sizes without going generic. |
| **Numeric / Ledger** | **IBM Plex Mono** (weights 400/500) | **Every monetary figure, `orderNumber`, coupon `code`, and timestamp in a table or receipt.** Tabular figures so columns of money actually align — this is the ledger motif made functional, not decorative. |

**One deliberate exception — the Home Page hero only:** set the hero headline in **Fraunces** (a warm, high-contrast serif) at large display size. This is the one place in the whole app spending character on a typeface, per the "spend your boldness in one place" principle — everything behind the login wall stays in Space Grotesk + Plex Sans + Plex Mono.

```css
/* next/font or <link> — pick whichever the Project Setup task standardizes on */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Fraunces:wght@600&display=swap');
```

> **Decided:** self-host all four families via `next/font/google` rather than the CDN `@import` above — the snippet is shown for reference/non-Next.js contexts only. Self-hosting eliminates the external font request entirely, which matters specifically for POS's "fast loading" NFR (`PRD.md`); a CDN `@import` would add a render-blocking round trip to the one screen with the tightest latency budget in the app. This is implemented as part of Project Setup (Task 0).

### Type scale

| Token | Size / Line-height | Face | Example use |
|---|---|---|---|
| `text-hero` | 48px / 56px | Fraunces 600 | Home Page hero only |
| `text-display` | 32px / 40px | Space Grotesk 600 | Page titles (`Orders`, `Reports`) |
| `text-section` | 20px / 28px | Space Grotesk 600 | Card/section headers, modal titles |
| `text-base` | 14px / 20px | IBM Plex Sans 400 | Body copy, table cells, form inputs |
| `text-label` | 12px / 16px | IBM Plex Sans 500, uppercase, tracked +0.04em | Field labels, table headers, eyebrow text |
| `text-figure` | 14px / 20px, tabular-nums | IBM Plex Mono 500 | Money, order numbers, timestamps, coupon codes |
| `text-figure-lg` | 24px / 32px, tabular-nums | IBM Plex Mono 500 | Dashboard `MetricCard` totals, POS grand total |

`font-feature-settings: "tnum" 1` (tabular numerals) is applied wherever `text-figure*` is used so digits never jitter as values update live via Socket.io.

---

## 4. Spacing, Radius & Elevation

- **Spacing scale:** Tailwind's default 4px base (`1`=4px … `4`=16px … `8`=32px). Component internal padding uses `3`–`4`; section/card gaps use `6`–`8`; page-level gutters use `8`–`12`. No custom spacing scale — the default is sufficient and keeps every module consistent without a second system to maintain.
- **Radius — intentionally not uniform, each value encodes what kind of surface it is:**
  | Surface | Radius | Rationale |
  |---|---|---|
  | Cards, modals, panels | `0.625rem` (`--radius`) | Soft, contained — "a tray" |
  | Buttons, inputs | `0.5rem` | Slightly tighter than cards |
  | **Badges (all status badges)** | `9999px` (full pill) | Reads as a rubber-stamped ticket marker — the one place pill-radius is used, so it stays meaningful rather than decorative |
  | **Data tables** | `0` (flat) | Deliberately sharp-edged — a ledger page, not a card; visually distinguishes "this is a record" from "this is a control" |
- **Elevation:** two shadow levels only, both subtle (`shadow-sm` for resting cards, a slightly stronger shadow for open dropdowns/modals/popovers). No heavy drop shadows anywhere — a data-dense screen with strong shadows reads as cluttered, not premium.

---

## 5. Signature Element — "The Ticket Rail"

Per the design skill's "spend your boldness in one place" principle, this app has exactly one recurring decorative motif, used narrowly: a **perforated top edge** — a dashed border with small semicircle notches cut into it via `radial-gradient` — evoking a ticket torn off a rail. It appears in exactly three places, never more:

1. **POS `BillPreview`** and **`GET /orders/:id/bill?format=html`** — the top edge of the receipt card.
2. **PDF bill/report templates** (Puppeteer-rendered) — same treatment, reproduced in print CSS.
3. **Activity Log** day-group dividers — each new calendar day's entries are introduced by a torn-ticket divider rather than a plain `<hr>`.

```css
.ticket-edge::before {
  content: "";
  display: block;
  height: 8px;
  background: radial-gradient(circle at 8px 0, transparent 6px, hsl(var(--background)) 6px) repeat-x;
  background-size: 16px 8px;
}
```

Nowhere else in the app — not on every card, not on every modal — so it stays a signature rather than wallpaper.

---

## 6. Status & Badge Color Mapping

The single authoritative table every module's "decide status badge colors" Design checklist item (`backlog.md` Tasks 2, 7, 10, 15) resolves to. All badges: pill radius (§4), `text-label` type, an icon-or-dot paired with the text (never color alone — see §9).

| Module | Field | Value | Token |
|---|---|---|---|
| Orders | `status` | `pending` | Brass |
| Orders | `status` | `completed` | Herb |
| Orders | `status` | `cancelled` | Ember |
| Coupons | computed `status` | `active` | Herb |
| Coupons | computed `status` | `scheduled` | Steel |
| Coupons | computed `status` | `expired` | Ember |
| Coupons | computed `status` | `disabled` | Slate (neutral, not a "problem" state — it's a deliberate admin choice) |
| Tasks | `priority` | `low` | Slate |
| Tasks | `priority` | `medium` | Brass |
| Tasks | `priority` | `high` | Ember |
| Tasks | `status` | `pending` | Brass |
| Tasks | `status` | `in_progress` | Steel |
| Tasks | `status` | `completed` | Herb |
| Users | `isActive` | `true` (active) | Herb (small dot, not a full badge — used sparingly in lists) |
| Users | `isActive` | `false` (deactivated) | Slate, row at 60% opacity + "Deactivated" label — never hidden, never Ember (deactivation isn't a failure state) |
| Products / Vendors / Categories / Customers | `isActive` | `false` | Same Slate/dimmed-row treatment as Users, for consistency across every soft-delete collection |

---

## 7. Component Conventions

- **Buttons:** `primary` = Herb solid, used for the one main action per view (Save, Checkout, Create). `secondary` = outline, Slate border/text. `destructive` = Ember solid, reserved **only** for true destructive/irreversible-feeling actions (Deactivate User, Cancel Order, Delete Coupon, Hard-delete Expense) — never for a merely negative-sounding action like "Disable Coupon" (`toggle`), which is reversible and stays `secondary`.
- **Data tables (`DataTable` shared component, `architecture.md` §3):** flat radius, hairline `--border` row dividers, no zebra striping (a zebra pattern fights with the ledger motif's flat rule lines), sticky header on scroll, numeric columns right-aligned in `text-figure`. Mobile (<480px, per `TEST_CASES.md` CC-MOB-03) collapses each row into a stacked card — label/value pairs — rather than horizontal scroll, except where a horizontal scroll genuinely preserves more context (e.g. wide Reports tables).
- **Forms (React Hook Form + Zod, per `AI_rules.md` §1):** label above input, `text-label` styling, error text in Ember directly beneath the field (never a toast-only error for field-level validation — toasts are for request-level outcomes). Required-field asterisks in Slate, not Ember, so the eye isn't drawn to every required field as if it were already an error.
- **`PermissionGate` fallback state:** when a route is reached despite being hidden from nav (defense-in-depth case per `architecture.md` §3), show a calm, centered empty-state message — *"You don't have access to this section. Ask an admin to update your permissions."* — never a raw 403 or stack-trace-flavored message, consistent with §10's writing voice.
- **Touch targets:** see §12 for the full breakpoint/touch-target floor — POS enforces it without exception, since it's the one screen used at a counter under time pressure on a tablet.
- **Real-time updates (Socket.io → React Query invalidation, `architecture.md` §8):** when a value changes live (Dashboard metrics, Orders list row insert), briefly flash the changed cell/row background with `--accent` at low opacity for ~600ms rather than an abrupt re-render — confirms to the person at the screen that *this* number just moved, without a jarring layout shift.

---

## 8. Dark Mode Strategy

Tailwind `class` strategy (`darkMode: 'class'`), toggled via a `next-themes`-style provider, persisted per-user (not per-browser-session) since the same staff member may use the dashboard on multiple terminals across shifts. The CSS variable swap in §2 means **no component ever branches on `theme === 'dark'` in JS** — every color reference goes through the `hsl(var(--token))` indirection, so dark mode is a single variable swap, not a parallel set of conditional styles to keep in sync as 18 modules get built. Verify per `TEST_CASES.md` CC-MOB-05 that the toggle applies with no flash-of-wrong-theme on POS, Dashboard, and modals specifically — those are the surfaces most likely to be open during a shift change.

---

## 9. Accessibility Baseline

- Visible keyboard focus on every interactive element, using `--ring` (Herb) at a 2px offset outline — never `outline: none` without a replacement.
- Status is never color-only: every badge in §6 pairs its color with a label (and, where space allows, a small icon) so the app remains legible for color-vision-deficient users and in print (the PDF bill/report templates render in grayscale-safe ink, not solid color fills).
- Body text maintains 4.5:1 contrast against its background in both light and dark mode; large text/icons maintain 3:1 — verify the §2 hex values against this once rendered, before they're treated as final.
- Reduced motion respected: the §7 real-time "flash" effect and any list-reorder animation are disabled under `prefers-reduced-motion: reduce`, falling back to an instant state change.

---

## 10. Writing & Microcopy Conventions

Words are part of this design system, not an afterthought left to whoever builds each form.

- **Active voice, action-named controls:** a button says exactly what happens — "Save changes," "Cancel order," "Deactivate user" — never "Submit" or "OK." The resulting toast echoes the same verb: "Order cancelled," not "Success."
- **Consistent vocabulary across modules** (the actual content of several `backlog.md` "Design" checklist gaps): always **"Deactivate"** for the five soft-delete collections (User, Customer, Vendor, Category, Product) — never "Disable" or "Remove," which read as more destructive than a reversible `isActive: false` flag actually is. Reserve **"Disable"** exclusively for Coupon's `toggle` action, since that's the one module where the PRD's own language ("Enable/disable a coupon") already uses it.
- **Errors state what happened and what to do, without apologizing:** *"That coupon has expired. Choose another or remove it from the order."* — not "Oops, something went wrong" and not a raw `API.md` §23 error code surfaced verbatim to the user.
- **Empty states are an invitation, not a dead end:** *"No orders yet today — completed sales will appear here."* / *"No tasks assigned to you."* Every empty list state names what will appear there and, where relevant, the action that fills it.
- **Numbers are never narrated:** a `MetricCard` shows the figure in `text-figure-lg`; it doesn't also say "Great job!" or add unearned commentary — per §1's direction, this app's job is to be scanned quickly and trusted, not to perform enthusiasm.

---

## 11. What This Document Resolves vs. What Stays Per-Module

| `backlog.md` Design checklist item | Resolved here | Still decided in that task |
|---|---|---|
| Task 1 — "Establish base typography/color/spacing tokens" | ✅ Fully (§2–§4) | Login page layout (centered card vs. split-screen) |
| Task 2 — "Deactivated-user visual treatment" | ✅ Fully (§6) | Permission editor's matrix-vs-accordion interaction pattern |
| Task 7 — "Status badge colors/labels" | ✅ Fully (§6) | Form UX for conditional `maxDiscountAmount` field |
| Task 9 (POS) — touch-target floor, color/type tokens | ✅ Touch-target floor, tablet-vs-phone layout (§12), tokens (§2–§4) | Bill-preview print styling beyond the ticket-rail motif |
| Task 10 (Orders) — "Status badge visual language" | ✅ Fully (§6) | Cancel-reason input pattern (modal vs. inline) |
| Task 11 (Dashboard) — metric card / top-items treatment | ✅ Type/number styling (§3), grid responsive behavior (§12) | Ranked-list vs. bar-chart choice for top-10 items |
| Task 15 (Tasks) — "Priority visual treatment" | ✅ Fully (§6) | Whether employees see only their own tasks by default |

Any later task whose Design checklist item isn't listed above still makes its own call, but must draw its colors, type, spacing, and radius from §2–§4 rather than introducing new values.

---

## 12. Responsive Strategy

The NFR this section exists for: `PRD.md` — *"Mobile responsive (usable on tablet/phone for POS use at the counter)"* — and `TEST_CASES.md` §0.5 (CC-MOB-01 through CC-MOB-06), which test exactly the behaviors below. §1–§11 give the tokens; this section is what actually makes the app usable below desktop width, so it's binding the same way §2's colors are — not a per-module judgment call.

### Breakpoints

Tailwind's default scale, named for how they actually get used here rather than left as bare pixel values:

| Name | Width | Primary device in practice |
|---|---|---|
| `counter` (base, no prefix) | `<640px` | Phone — rare, but an owner checking Dashboard from their pocket must still work |
| `sm` | `≥640px` | Small tablet, portrait |
| `md` | `≥768px` | **Tablet, landscape — the primary POS target per the PRD** |
| `lg` | `≥1024px` | Back-office laptop — default assumption for admin-only modules (Reports, Settings, Users) |
| `xl` | `≥1280px` | Wide back-office monitor — Dashboard/Reports get extra columns, nothing else changes |

### Responsive type scale

The §3 type scale is the `lg`+ value. Below `md`, step down rather than holding desktop sizes at a cramped width:

| Token | `lg`+ | `<md` |
|---|---|---|
| `text-hero` | 48px | 32px |
| `text-display` | 32px | 24px |
| `text-section` | 20px | 18px |
| `text-base`, `text-label`, `text-figure` | unchanged | unchanged — these are already sized for density, not display |

### Navigation pattern

The dashboard shell (`(dashboard)/layout.tsx`, `architecture.md` §3) changes structurally, not just in scale, since a persistent sidebar is the wrong control for a thumb:

- **`lg`+:** persistent left sidebar, full text labels.
- **`md`–`lg`:** collapsed icon-only rail, expands on tap; this is the **POS tablet's actual state**, so POS's own chrome should assume minimal sidebar width by default rather than expecting it collapsed manually.
- **`<md`:** sidebar replaced by a **bottom tab bar** (Dashboard / POS / Orders / More) plus a slide-up drawer for the remaining modules under "More." A bottom tab bar, not a hamburger-only pattern, because the highest-frequency phone use case (checking in on the dashboard, or a manager glancing at Orders) is one-handed and thumb-driven — burying it in a corner hamburger adds friction `PRD.md`'s NFR is explicitly trying to avoid.

### Touch-target floor

44×44px minimum on every interactive element that's reachable on a touchscreen — this is a sitewide floor, not a POS-only rule, per WCAG 2.5.5 and platform touch-target guidance. **POS enforces it without exception** on every control, since it's relied on under time pressure. Desktop-only affordances that a touchscreen user would never reach (e.g., a dense inline icon-button in a wide `lg`+-only Reports table) may go down to 32–36px, but anything visible at `md` or below must hit the 44px floor.

### Per-surface behavior

| Surface | `lg`+ (desktop) | `md`–`lg` (tablet) | `<md` (phone) |
|---|---|---|---|
| Dashboard shell / nav | Persistent sidebar | Icon rail | Bottom tab bar + "More" drawer |
| `DataTable` | Full table | Full table, horizontal scroll for wide Reports tables | Row → stacked card (label/value pairs), per CC-MOB-03 |
| POS screen | Product grid + persistent side cart | **Product grid + persistent side cart (primary target — this is the layout the PRD is actually written for)** | Tabbed Catalog / Cart switch, checkout action pinned to the bottom of the viewport |
| Forms (RHF) | 2-column where fields pair naturally (e.g. `from`/`to` dates) | 1-column | 1-column, full-width inputs, sticky bottom action bar for Save/Submit so it never scrolls off-screen below a long form |
| Modals/dialogs | Centered dialog | Centered dialog | Full-screen sheet, slides up from the bottom |
| Dashboard `MetricCard` grid | 4-up | 2-up | 1-up, stacked |
| Settings sections | Tabs | Tabs | Accordion (stacked, one section open at a time) |

### Inputs on mobile

Every money/quantity field (POS quantity stepper, Expense `amount`, Coupon `value`) sets `inputMode="decimal"` or `type="number"` so the device's numeric keypad triggers automatically rather than the full alphanumeric keyboard — this is the literal content of `TEST_CASES.md` CC-MOB-04 and otherwise tends to get skipped until QA catches it.

### Verification

This section is what `TEST_CASES.md` CC-MOB-01–06 are checking against — when those test cases run, they're validating the table and rules above, not an undocumented judgment call made fresh per module.

---

## 13. Open Items

1. **Final contrast verification** (§9) — the hex values in §2 are a deliberate starting palette, not yet run through an automated contrast checker against real rendered components. Verify before Task 1 ships its first real form.
2. **Print stylesheet scope** — the ticket-rail motif (§5) needs to be confirmed as render-safe inside Puppeteer's PDF pipeline (`lib/pdf.ts`), since `radial-gradient`-based perforation may need a simplified fallback (e.g. a dashed border) for print output. Resolve during Task 9/Task 17 (Reports), not assumed here.