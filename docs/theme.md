# Theme & Design System — Restaurant Management Dashboard

> **Source of truth for this revision:** an actual implemented theme (provided directly) from a reference project ("Campus Link"). Per `guideline.md`'s instruction to that this is *the* theme for this project, the values below are taken from that reference as closely as the two projects' stacks allow — colors, type scale, radius, shadow, spacing, and every component-level spec are reproduced from it, not re-invented.
>
> **Conflicts found and how they're resolved (not just flagged — settled, per the discussion that produced this revision):**
> 1. **Stack:** the reference is React 19 + Vite + plain Tailwind utility classes (no shadcn/ui). This project stays on **Next.js 14 App Router + Tailwind + shadcn/ui** per `architecture.md` §2 / `AI_rules.md` §1 — that lock is unchanged. The reference's raw Tailwind classes (`bg-blue-600`, `text-slate-700`, etc.) are translated below into the shadcn **CSS-variable token layer** (`--primary`, `--destructive`, …) so the same visual result is achieved through the architecture already in place, rather than switching frameworks.
> 2. **Components:** the reference hand-rolls its own primitives (`components/common/Button.jsx`, `Card.jsx`, etc.) instead of shadcn/ui. This project keeps using **shadcn/ui primitives** (`components/ui/*`) configured with custom variants that reproduce the reference's variant tables (§14), plus the project's already-named shared composites (`MetricCard`, `DataTable`, `PermissionGate` per `architecture.md` §3) standing in for the reference's `StatCard`/`Table`.
> 3. **Dark mode:** the reference has **no dark mode** ("fixed light color scheme throughout"). **Resolved:** dark mode is removed from v1 scope to match the reference exactly. `PRD.md`'s "Dark mode" NFR should be updated to mark this as a deferred/Phase-2 item rather than a v1 requirement — that's a one-line edit to make in `PRD.md` directly; it's recorded here as a settled decision, not an open question. The CSS variables below are still named semantically (not raw hex inline), so a `.dark` block can be added later without restructuring anything.
> 4. **shadcn defaults vs. this theme:** shadcn/ui's generated component files ship with their own default variant names, hover behavior, and radius — close to, but not identical to, what's specified here. Rather than leave that gap implicit, §13 below states exactly which hardcoded classes in which generated file need to change. **The visual result described elsewhere in this document doesn't change because of this** — these are notes on *how* to get shadcn's source to produce that result, not a new look.
>
> Everything else in this document supersedes the previous theme.md revision (the "Ticket & Ledger" motif, the ticket-rail perforation, flat-radius ledger tables, and the Cobalt/Ember/Brass/Moss naming are all retired — they don't match the reference and the reference now wins).

---

## 1. Design Direction

A clean, blue-led admin dashboard, not a themed/decorated one: white `rounded-2xl` cards with soft shadows on a near-white `slate-50` canvas; a dark `slate-900 → slate-800` gradient sidebar; status conveyed through small pill badges with light tinted backgrounds (never solid-color text-on-color); primary actions get a tinted colored shadow under a solid-fill button. The one place color gets expressive is the Home Page hero (gradient headline, gradient avatar/logo) — everywhere behind the login wall stays restrained, dense, and fast to scan, consistent with this being a working tool used under time pressure (POS at a counter, attendance at shift start) rather than a marketing surface.

---

## 2. Color Tokens

No invented token names this revision — colors are referenced by their actual role (Primary/Success/Warning/Danger/Neutral) and, wherever shadcn needs a CSS variable, that variable's value is set to the exact Tailwind shade the reference uses for that role. Hex values below **are** Tailwind's default palette (not custom), so `bg-blue-600` and `bg-[hsl(var(--primary))]` resolve to the same color.

### Primary — Blue (Brand Color)

| Token | Hex | Typical Usage |
|-------|-----|---------------|
| `blue-50` | `#eff6ff` | Light backgrounds, badges |
| `blue-100` | `#dbeafe` | Hover states, light elements |
| `blue-200` | `#bfdbfe` | Borders, light accents |
| `blue-500` | `#3b82f6` | Focus rings, secondary brand, active link text |
| `blue-600` | `#2563eb` | Primary buttons, active nav, brand elements — `--primary` |
| `blue-700` | `#1d4ed8` | Primary button hover |
| `blue-900` | `#1e3a8a` | Gradient dark end, hero text |

### Success — Green

| Token | Hex | Typical Usage |
|-------|-----|---------------|
| `green-100` | `#dcfce7` | Paid badge backgrounds, present stats |
| `green-500` | `#22c55e` | "Present"/"Paid" status icon fills |
| `green-600` | `#16a34a` | Success button bg — `--success` |
| `green-700` | `#15803d` | Success button hover |

### Warning — Amber

| Token | Hex | Typical Usage |
|-------|-----|---------------|
| `amber-50` | `#fffbeb` | Offline/warning banner backgrounds |
| `amber-100` | `#fef3c7` | Amber backgrounds |
| `amber-500` | `#f59e0b` | Warning button bg, amber status — `--warning` |
| `amber-600` | `#d97706` | Warning button hover |

### Danger — Red

| Token | Hex | Typical Usage |
|-------|-----|---------------|
| `red-50` | `#fef2f2` | Danger-zone sections, light red backgrounds |
| `red-100` | `#fee2e2` | Error containers, red borders |
| `red-500` | `#ef4444` | "Absent"/"Cancelled" status icon fills |
| `red-600` | `#dc2626` | Destructive button bg — `--destructive` |
| `red-700` | `#b91c1c` | Destructive button hover |

### Slate Neutrals (most-used scale in the app)

| Token | Hex | Typical Usage |
|-------|-----|---------------|
| `slate-50` | `#f8fafc` | Page background — `--background` |
| `slate-100` | `#f1f5f9` | Table headers, hover fills — `--muted`/`--secondary` |
| `slate-200` | `#e2e8f0` | Card/table borders — `--border` |
| `slate-300` | `#cbd5e1` | Input/select borders |
| `slate-400` | `#94a3b8` | Placeholder text, muted icon fills — `--muted-foreground` |
| `slate-500` | `#64748b` | Secondary body text |
| `slate-600` | `#475569` | Ghost-button text |
| `slate-700` | `#334155` | Primary body text, input text — `--secondary-foreground` |
| `slate-800` | `#1e293b` | Heading text, toast background |
| `slate-900` | `#0f172a` | `<body>` text color — `--foreground` |

### Accent set (color-coded grouping — categories, vendors, any visual-grouping card)

Indigo, Purple, Teal, Orange, Pink, Cyan, Rose, Sky — used as `from-{color}-500 to-{color}-700` gradients wherever more than the four semantic colors are needed to tell several cards apart at a glance (e.g. a Category color swatch, a Vendor card header). Indigo additionally doubles as the one "informational/in-progress" badge color (`indigo-600`, `#4f46e5`).

### shadcn/ui CSS variable mapping

`app/globals.css`, per `architecture.md` §2. Includes a `-hover` variable per semantic color since the reference uses a distinct shade on hover (not an opacity tweak) — components reference these directly rather than hand-picking a hover shade per button.

```css
@layer base {
  :root {
    --background: 210 40% 98%;          /* slate-50 */
    --foreground: 222 47% 11%;          /* slate-900 */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 221 83% 53%;             /* blue-600 */
    --primary-hover: 224 76% 48%;       /* blue-700 */
    --primary-foreground: 0 0% 100%;

    --secondary: 210 40% 96%;           /* slate-100 */
    --secondary-hover: 214 32% 91%;     /* slate-200 */
    --secondary-foreground: 215 25% 27%; /* slate-700 */

    --muted: 210 40% 96%;               /* slate-100 */
    --muted-foreground: 215 20% 65%;    /* slate-400 */

    --success: 142 76% 36%;             /* green-600 */
    --success-hover: 142 72% 29%;       /* green-700 */
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 50%;              /* amber-500 */
    --warning-hover: 32 95% 44%;        /* amber-600 */
    --warning-foreground: 0 0% 100%;

    --destructive: 0 72% 51%;           /* red-600 */
    --destructive-hover: 0 74% 42%;     /* red-700 */
    --destructive-foreground: 0 0% 100%;

    --info: 244 75% 59%;                /* indigo-600 */
    --info-foreground: 0 0% 100%;

    --border: 214 32% 91%;              /* slate-200 */
    --input: 213 27% 84%;               /* slate-300 */
    --ring: 217 91% 60%;                /* blue-500, focus rings */
    --radius: 0.75rem;                  /* see §5 — base is rounded-xl, not rounded-lg */
  }

  /* No .dark block in v1 — see the conflict-resolution note at the top of this
     document. Variable naming is semantic so one can be added later without
     touching any component. */
}
```

---

## 3. Typography

Single family: **Inter**, Google Fonts, weights 400–700. Loaded via `next/font/google` (self-hosted at build time, no runtime call to `fonts.googleapis.com` — equivalent outcome to the reference's `<link>`-in-`index.html` approach, just adapted to the Next.js stack already locked in). Applied at the root so `font-sans` resolves to Inter everywhere; no per-component font-family overrides.

```css
/* next/font/google, configured once in app/layout.tsx */
const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], display: 'swap' });
```

**Font sizes used throughout** (literal Tailwind classes — no custom `text-*` token aliases; this revision drops the old `text-hero`/`text-figure` naming in favor of using the scale directly, matching the reference):

| Class | Size | Typical weight | Usage |
|-------|------|------|-------|
| `text-[10px]` | 10px | — | Tiny calendar/day labels |
| `text-[11px]` | 11px | — | Mobile-compact info |
| `text-xs` | 12px | `font-medium`/`font-semibold` | Badges, subtitles, tab labels |
| `text-sm` | 14px | `font-medium`/`font-semibold` | Body text, buttons, inputs, labels |
| `text-base` | 16px | `font-bold` | Large buttons, card titles |
| `text-lg` | 18px | `font-bold` | Section headings, stat values |
| `text-xl` | 20px | `font-bold` | Page titles, large stat values |
| `text-2xl` | 24px | `font-bold` | Main page headings |
| `text-3xl` | 30px | `font-bold` | Hero/login page title |
| `text-4xl` | 36px | `font-bold` | Home Page section headings |
| `text-5xl`/`text-6xl` | 48–60px | `font-bold`/`font-extrabold` | Home Page hero main title |

No tabular-figure/monospace treatment for money or order numbers in this revision — the reference doesn't use one, so numeric values are just `font-bold`/`font-semibold` Inter at the sizes above, same as any other text.

---

## 4. Border Radius

| Class | Value | Used for |
|-------|-------|----------|
| `rounded-lg` | 8px | Small nav items, logo icons, search toggle |
| `rounded-xl` | 12px | **Default control radius** — buttons, inputs, selects, stat icons, data-table wrapper |
| `rounded-2xl` | 16px | Cards, modals/dialogs, sidebar logo block |
| `rounded-full` | pill | Badges, avatars, attendance day dots |

Note the shift from the old theme.md: data tables are `rounded-xl` with a visible border, not flat/sharp-edged.

---

## 5. Shadows

| Shadow | Used for |
|--------|----------|
| `shadow-sm` | Resting cards, stat cards |
| `shadow-md` | Hover elevation, icon wrappers |
| `shadow-lg` | Active nav item, emphasis |
| `shadow-xl` | Modals/dialogs, dropdowns |
| `shadow-2xl` | Sidebar |

**Tinted shadows** — a colored, translucent shadow under solid-fill buttons/elements, reinforcing the button's semantic color without adding a border:

| Class | Used for |
|-------|----------|
| `shadow-blue-500/25` | Primary buttons |
| `shadow-blue-500/30` | Active nav item, submit buttons |
| `shadow-blue-200/50` | Logo icon |
| `shadow-green-500/25` | Success buttons |
| `shadow-red-500/25` | Destructive buttons |
| `shadow-amber-500/25` | Warning buttons |
| `shadow-green-500/40` / `shadow-red-500/40` | Attendance Present/Absent active toggle (stronger, §16) |

---

## 6. Spacing Scale

Tailwind defaults, no custom scale.

| Class | Value | Common usage |
|-------|-------|---------------|
| `gap-1` / `gap-1.5` | 4 / 6px | Tight spacing, badge content |
| `gap-2` / `gap-3` | 8 / 12px | Element groups, section spacing |
| `gap-4` / `gap-5` | 16 / 20px | Form fields, stat card layout |
| `gap-6` / `gap-8` | 24 / 32px | Page sections, large section gaps |
| `p-3` / `p-4` | 12 / 16px | Sidebar nav items, sidebar logo area |
| `p-5` / `p-6` | 20 / 24px | Card body, main card padding |
| `p-8` | 32px | Login form |
| `pt-16` | 64px | Main content top offset (navbar height) |

---

## 7. Breakpoints

| Breakpoint | Min width | Purpose |
|---|---|---|
| `sm` | 640px | Responsive text, layout shifts |
| `md` | 768px | Table column visibility, grid changes |
| `lg` | 1024px | Sidebar collapse/expand, multi-column |
| `xl` | 1280px | 4-column stat-card grid |
| `2xl` | 1536px | Max content width (`max-w-screen-2xl`) |

---

## 8. Z-Index Scale

| Value | Element |
|---|---|
| `z-30` | Navbar header |
| `z-40` | Mobile sidebar overlay |
| `z-50` | Sidebar, search dropdowns, mobile search |
| `z-[100]` | Modals/dialogs |

---

## 9. Transitions & Animations

| Duration | Easing | Used for |
|---|---|---|
| 150ms | ease | Color transitions, hover effects, table-row hover |
| 200ms | ease | Buttons, inputs, cards |
| 300ms | ease-in-out | Sidebar width, layout shifts, scroll effects |
| 1s | linear infinite | `animate-spin` (loading spinners) |
| 1s | ease-in-out infinite | `animate-bounce` (loading dots, staggered 0/150/300ms) |
| 2s | ease-in-out infinite | `pulse-dot` keyframe — opacity 1 → 0.5 → 1 |
| 0.2s ease-out | — | `modal-enter` keyframe — opacity 0/scale(0.95)/translateY(-8px) → opacity 1/scale(1)/translateY(0) |

---

## 10. Defined Utility Classes & Scrollbar

| Class | Properties |
|---|---|
| `.sidebar-transition` | `transition: width 0.3s ease, transform 0.3s ease` |
| `.card-hover` | `transition: transform 0.2s ease, box-shadow 0.2s ease`; on hover: `translateY(-2px)`, `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1)` |
| `.gradient-bg` | `background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)` |
| `.table-row-hover` | hover: `background-color: #f1f5f9; transition: background-color 0.15s ease` |

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }   /* slate-300 */
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }                /* slate-400 */
```

---

## 11. Body & HTML Defaults

| Property | Value |
|---|---|
| `body` background | `#f8fafc` (slate-50) |
| `body` color | `#0f172a` (slate-900) |
| `body` min-height | `100vh` |
| `html` overflow-x | `hidden` |
| Font smoothing | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` |

---

## 12. Status & Badge Color Mapping

The Badge component (§14) supports exactly five variants — **green / red / yellow / blue / slate** — each a light tinted background with darker text and a matching dot, never a solid fill. This is the single authoritative mapping every module's status badge resolves to.

| Module | Field | Value | Badge variant |
|---|---|---|---|
| Orders | `status` | `pending` | yellow |
| Orders | `status` | `completed` | green |
| Orders | `status` | `cancelled` | red |
| Coupons | computed `status` | `active` | green |
| Coupons | computed `status` | `scheduled` | blue |
| Coupons | computed `status` | `expired` | red |
| Coupons | computed `status` | `disabled` | slate |
| Tasks | `priority` | `low` | slate |
| Tasks | `priority` | `medium` | yellow |
| Tasks | `priority` | `high` | red |
| Tasks | `status` | `pending` | yellow |
| Tasks | `status` | `in_progress` | blue |
| Tasks | `status` | `completed` | green |
| Users / Products / Vendors / Categories / Customers | `isActive` | `true` | green (small dot, not a full badge in lists) |
| Users / Products / Vendors / Categories / Customers | `isActive` | `false` | slate, row dimmed + "Deactivated" label — never red, deactivation isn't a failure state |

**Badge style:** `rounded-full px-2.5 py-0.5 text-xs font-semibold`.

| Variant | BG | Text | Dot |
|---|---|---|---|
| green | `green-100` | `green-700` | `green-500` |
| red | `red-100` | `red-700` | `red-500` |
| yellow | `yellow-100` | `yellow-700` | `yellow-500` |
| blue | `blue-100` | `blue-700` | `blue-500` |
| slate | `slate-100` | `slate-600` | `slate-400` |

---

## 13. Component-Specific Theme Reference

Mapped onto **shadcn/ui primitives** per the conflict resolution above — same visual variants as the reference, implemented as shadcn component variants rather than hand-rolled `components/common/*`. `MetricCard` and `DataTable` are this project's already-named shared composites (`architecture.md` §3) standing in for the reference's `StatCard`/`Table`.

### Button (`components/ui/button.tsx`, shadcn `Button` with custom variants)

| Variant | BG | Hover | Text | Shadow |
|---|---|---|---|---|
| `primary` | `--primary` | `--primary-hover` | white | `shadow-blue-500/25` |
| `secondary` | `--secondary` | `--secondary-hover` | `--secondary-foreground` | — |
| `success` | `--success` | `--success-hover` | white | `shadow-green-500/25` |
| `destructive` | `--destructive` | `--destructive-hover` | white | `shadow-red-500/25` |
| `warning` | `--warning` | `--warning-hover` | white | `shadow-amber-500/25` |
| `ghost` | transparent | `slate-100` | `slate-600` | — |
| `outline` | transparent | `slate-50` | `slate-700`, border `slate-300` | — |

**Sizes:** `xs` (`py-1 px-2.5 text-xs`), `sm` (`py-1.5 px-3 text-sm`), `md` (`py-2 px-4 text-sm`), `lg` (`py-2.5 px-5 text-base`). Radius `rounded-xl`. Focus: `ring-ring ring-offset-2` (resolves to blue-500 via `--ring`, §2 — same color as before, just referenced through the token instead of hardcoded so it stays in sync if `--ring` ever changes). Disabled: `opacity-50 cursor-not-allowed`.

**Shadcn source edits needed (no visual change vs. the rest of this document — just how to get there):**
1. shadcn's stock `buttonVariants` map is `default | destructive | outline | secondary | ghost | link`. Rename `default` → `primary`, drop `link` (unused here), add `success` and `warning` to the `cva()` map.
2. Stock hover is `hover:bg-primary/90` (an opacity trick). That can't reproduce a genuinely different shade (`blue-600`→`blue-700` isn't "blue-600 at 90% opacity"), so every variant's hover class becomes `hover:bg-[hsl(var(--*-hover))]` using the `-hover` tokens defined in §2.
3. Stock radius is `rounded-md`. Change the hardcoded class to `rounded-xl` directly — setting `--radius` alone won't do this, since `rounded-md` resolves from `calc(var(--radius) - 2px)` in shadcn's default Tailwind config, not from the full `--radius` value.

### Card (shadcn `Card`)

`bg-white rounded-2xl border border-slate-200 shadow-sm p-6`. Title: `text-base sm:text-lg font-bold text-slate-800`. Subtitle: `text-sm text-slate-500`. Header gap: `gap-4`. No edit needed here — shadcn's stock `Card` already ships `rounded-xl`+`shadow`, close enough that bumping to `rounded-2xl`/`shadow-sm` is a one-line tweak, not a structural change like Button/Badge below.

### Input / Select (shadcn `Input` / `Select`)

`rounded-xl bg-white text-slate-800 py-2.5 px-3.5 text-sm border border-slate-300`. Placeholder `slate-400`. Focus: `ring-ring focus:border-blue-500`. Error: `border-red-400 focus:ring-red-400`. Label: `text-sm font-medium text-slate-700`. Error message: `text-xs text-red-500`. Hint text: `text-xs text-slate-400`.

**Shadcn source edit needed:** same as Button point 3 — `Input` and `Select`'s trigger both ship `rounded-md` by default; change to `rounded-xl` directly in `input.tsx` / the select trigger. `SelectContent` (the dropdown popover) isn't covered by the reference and can stay on shadcn's stock `bg-popover` styling — only the trigger needs to match Input's look.

### Badge — variant/color mapping is §12. Implementation note below.

**This one is a structural edit, not a token swap.** Shadcn's stock `Badge` is solid-fill (`bg-primary text-primary-foreground`, etc.) with four variants and no dot. §12's badges are light-tint background + darker text + a small dot, on five variants (green/red/yellow/blue/slate) that don't correspond to shadcn's default/secondary/destructive/outline names. Rebuild `badge.tsx`'s variant map from §12's table directly (`bg-green-100 text-green-700` + a `<span className="size-1.5 rounded-full bg-green-500" />`, repeated per variant) rather than trying to retrofit shadcn's existing variants onto it.

### Dialog (reference's "Modal" → shadcn `Dialog`)

| Part | Style |
|---|---|
| Overlay | `fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm` |
| Content | `bg-white rounded-2xl shadow-2xl border border-slate-200`, `.modal-enter` animation (§9) |
| Header | `px-6 py-4 border-b border-slate-200`; title `text-base sm:text-lg font-bold text-slate-800` |
| Body | `px-6 py-5 overflow-y-auto max-h-[90vh]` |
| Footer | `px-6 py-4 border-t border-slate-200`, `gap-3 justify-end` |
| Sizes | `sm: max-w-md`, `md: max-w-lg`, `lg: max-w-2xl`, `xl: max-w-4xl`, `full: max-w-full mx-4` |

**Shadcn source edit needed:** stock `DialogContent` ships `rounded-lg shadow-lg`. Bump to `rounded-2xl shadow-2xl` directly in `dialog.tsx`.

### MetricCard (reference's "StatCard")

| Color | Icon BG | Value text |
|---|---|---|
| blue | `blue-600` | `blue-600` |
| indigo | `indigo-600` | `indigo-600` |
| green | `green-600` | `green-600` |
| red | `red-600` | `red-600` |
| yellow | `yellow-500` | `yellow-600` |
| slate | `slate-600` | `slate-600` |

Container: `bg-white rounded-2xl border border-slate-200 p-5 shadow-sm`. Icon wrapper: `w-12 h-12 rounded-xl shadow-md`, solid color fill, white icon (not a light tint — distinct from badges). Title: `text-sm font-medium text-slate-500`. Value: `font-bold text-2xl sm:text-3xl` (or `text-xl sm:text-2xl` for long values).

### DataTable (reference's "Table")

| Part | Style |
|---|---|
| Wrapper | `rounded-xl border border-slate-200 overflow-x-auto` |
| Header | `bg-slate-50 border-b border-slate-200` |
| Header cell | `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500` |
| Body | `divide-y divide-slate-100`, `.table-row-hover` on each row |
| Data cell | `px-4 py-3 text-slate-700 whitespace-nowrap` |
| Loading | `h-4 bg-slate-200 rounded animate-pulse` |
| Empty state | `px-4 py-12 text-center text-slate-400` |
| Mobile (<480px) | Row → stacked label/value card, per `TEST_CASES.md` CC-MOB-03 |

---

## 14. Layout Theme

### Sidebar

| Property | Value |
|---|---|
| Background | `bg-gradient-to-b from-slate-900 to-slate-800` |
| Border | `border-r border-white/10` |
| Collapsed / expanded width | `w-16` (64px) / `w-64` (256px) |
| Transition | `.sidebar-transition` (§10) |
| Z-index | `z-50` |
| Mobile overlay | `fixed inset-0 bg-black/50 z-40` |
| Logo block | `p-4 border-b border-white/10 min-h-[64px]`; icon `w-9 h-9 rounded-xl bg-blue-600 shadow-lg` |
| Brand name | `text-white font-bold text-sm` |
| Subtitle | `text-slate-400 text-xs` |
| Active nav item | `bg-blue-600 text-white shadow-lg shadow-blue-500/30 rounded-xl` |
| Inactive nav item | `text-slate-400 hover:text-white hover:bg-white/10 rounded-xl` |
| Logout item | `text-slate-400 hover:text-red-400 hover:bg-red-500/10` |

### Navbar

| Property | Value |
|---|---|
| Background | `bg-white/80 backdrop-blur-md` |
| Border | `border-b border-slate-200` |
| Height / position | `h-16`, `fixed top-0 right-0 left-0 z-30` |
| Left offset | `lg:left-16` (sidebar collapsed) / `lg:left-64` (expanded) |
| Search input | `bg-slate-100 rounded-xl` |
| User avatar | `w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-md` |
| User name / role | `text-sm font-semibold text-slate-700` / `text-xs text-slate-400 capitalize` |

### Main content area

| Property | Value |
|---|---|
| Background | `bg-slate-50` |
| Padding top | `pt-16` |
| Padding left | `lg:pl-16` / `lg:pl-64` |
| Content padding | `p-3 sm:p-6 lg:p-8` |
| Max width | `max-w-screen-2xl` |

---

## 15. Gradient Definitions

| Name | Gradient | Used in |
|---|---|---|
| Sidebar | `from-slate-900 to-slate-800` | Sidebar background |
| Hero text | `from-blue-800 via-blue-600 to-indigo-700` (clipped to text) | Home Page hero headline |
| Avatar | `from-blue-500 to-blue-700` | Navbar user avatar |
| Primary button bg | `from-blue-600 to-blue-700` | Login submit, logo icon |
| Header banner | `from-blue-600 to-blue-700` | Dashboard page header band |
| Brand gradient | `135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%` | `.gradient-bg` utility |
| Visual-grouping cards | `from-{accent}-500 to-{accent}-700` across the 8 accent hues (§2) | Category/Vendor color-coded cards |

---

## 16. Toast Notifications (react-hot-toast)

| Property | Value |
|---|---|
| Background | `#1e293b` (slate-800) |
| Text | `#f8fafc` (slate-50) |
| Border radius | 12px |
| Font | 14px, weight 500 |
| Border | `1px solid #334155` (slate-700) |
| Shadow | `0 10px 25px -5px rgba(0,0,0,0.3)` |
| Success icon | Primary `green-500`, secondary `slate-50` |
| Error icon | Primary `red-500`, secondary `slate-50` |

---

## 17. Attendance-Specific Theme

Directly applicable to this project's own Attendance module (`PRD.md` Feature 8, `DATABASE.md` §3.11):

| Element | Style |
|---|---|
| Present toggle (active) | `bg-green-500 text-white shadow-green-500/40` |
| Present toggle (inactive) | `bg-green-50 text-green-600 hover:bg-green-100` |
| Absent toggle (active) | `bg-red-500 text-white shadow-red-500/40` |
| Absent toggle (inactive) | `bg-red-50 text-red-600 hover:bg-red-100` |
| Unsaved/dirty row | `bg-blue-50/50` |
| Offline banner | `bg-amber-50 border border-amber-200 text-amber-700 rounded-xl` |
| Syncing banner | `bg-blue-50 border border-blue-200 text-blue-700 rounded-xl` |
| Present day circle | `bg-green-500 text-white shadow-md` |
| Absent day circle | `bg-red-500 text-white shadow-md` |
| Unmarked day circle | `text-yellow-700 bg-yellow-100` |
| Today indicator | `ring-2 ring-ring ring-offset-2` (same blue-500 value as `--ring`, §2) |

---

## 18. Loading States & Print Styles

**Spinner:** `w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin`.
**Loading dots:** three `w-3 h-3 rounded-full` dots in `blue-500`/`blue-600`/`blue-500`, staggered `animate-bounce` (delays 0/150/300ms).

**Print (Reports export, Order bill print):**
- `@page { size: landscape; margin: 12mm; }`
- `-webkit-print-color-adjust: exact`
- Black/white color scheme for printed tables
- `print:hidden` / `print:block` to control what's print-only vs screen-only

---

## 19. Accessibility & Writing Conventions

- Focus rings (`ring-2 ring-ring ring-offset-2` — the `--ring` token, §2, set to blue-500) on every interactive element, never `outline: none` without that replacement.
- Every badge in §12 pairs color with a text label (and a dot) — never color alone.
- **Active voice, action-named controls:** "Save changes," "Cancel order," "Deactivate user" — never "Submit" or "OK." Toasts echo the same verb ("Order cancelled," not "Success").
- **Consistent vocabulary:** "Deactivate" for the five soft-delete collections (User, Customer, Vendor, Category, Product); "Disable" reserved for Coupon's toggle action only.
- **Errors say what happened and what to do**, without apologizing, and never surface a raw `API.md` §23 code verbatim.
- **Empty states name what will appear there** — "No orders yet today — completed sales will appear here."

---

## 20. Responsive Strategy

Breakpoints are §7's; behavior per surface:

| Surface | `lg`+ | `md`–`lg` | `<md` |
|---|---|---|---|
| Sidebar | Expanded (`w-64`) | Collapsed icon rail (`w-16`) | Off-canvas, opens via overlay |
| `DataTable` | Full table | Full table, horizontal scroll for wide tables | Row → stacked card (CC-MOB-03) |
| POS screen | Product grid + persistent side cart | Same — primary target | Tabbed Catalog/Cart, checkout pinned to bottom |
| Stat-card grid | 4-up (`xl`) | 2-up | 1-up |
| Modals | Centered dialog | Centered dialog | Full-screen sheet |

Money/quantity inputs (`POS` quantity, `Expense.amount`, `Coupon.value`) use `inputMode="decimal"` so mobile triggers a numeric keypad, per `TEST_CASES.md` CC-MOB-04.

---

## 21. What This Document Resolves vs. What Stays Per-Module

| `backlog.md` Design checklist item | Resolved here |
|---|---|
| Task 1 — base tokens | ✅ §2–§9 |
| Task 2 — deactivated-user treatment | ✅ §12 |
| Task 7 — coupon status badges | ✅ §12 |
| Task 9 (POS) — tokens, touch targets | ✅ §2–§9, §20 |
| Task 10 (Orders) — status badges | ✅ §12 |
| Task 11 (Dashboard) — MetricCard styling | ✅ §13 |
| Task 15 (Tasks) — priority colors | ✅ §12 |
| Task 16 (Attendance) — check-in/out visuals | ✅ §17 |

Layout-only decisions (login page split-screen vs centered, permission-editor matrix vs accordion, etc.) remain each task's own call, made using the tokens above.

---

## 22. Open Items

1. **PRD.md NFR edit needed:** update the "Dark mode" line in `PRD.md`'s Non-Functional Requirements to reflect the settled decision in this document's header (deferred, not v1).
2. **Indigo as `--info`:** confirmed equal to `indigo-600` (`#4f46e5`) — used for Coupon `scheduled` and Task `in_progress` only, matching the reference's "informational, neither success nor warning nor danger" use case.
3. **Verify after implementing §13:** once `button.tsx`/`input.tsx`/`badge.tsx`/`dialog.tsx` are edited per §13's notes, do a quick visual diff against this document's stated look (radius, hover shades, badge dots) — those notes describe the *intended* edits, not yet a confirmed render.