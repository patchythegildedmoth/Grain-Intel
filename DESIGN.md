# Grain Intel Design System

> **Design Vision:** A Bloomberg terminal designed by the Linear team. Dense, fast, professional, calm. Every pixel serves the trader's morning workflow. Open it at 6 AM, understand the book in 3 seconds.

*Source of truth for all UI decisions. Derived from design research across 15 best-in-class dashboards. See `DESIGN_RESEARCH/` for full site reviews, synthesis, and delight playbook.*

---

## Design Principles

1. **Lead with the number that matters most.** Every screen has one hero metric — the biggest, boldest element.
2. **Hierarchy through typography, not color.** Size and weight create hierarchy. Color is reserved for meaning.
3. **One screen, one decision.** The answer to the trader's question should be above the fold.
4. **Density is a feature, clutter is a bug.** Show more data, but with consistent visual patterns.
5. **Delight is responsiveness.** Fast interactions, smooth transitions, numbers that feel alive.

---

## Typography

Three-font stack. Each font has a defined role — do not mix roles.

| Role | Font | Weight Range | Tailwind Class | Use |
|------|------|-------------|----------------|-----|
| Display | Plus Jakarta Sans | 600–800 | `font-display` | Page titles, module headings, Morning Brief hero |
| Body | DM Sans | 400–600 | (default) | All UI text, labels, nav, descriptions |
| Data | Geist Mono | 400–600 | `font-data` | Dollar amounts, bushel counts, percentages, timestamps |

**Loading:** Plus Jakarta Sans + DM Sans via Google Fonts (`index.html`). Geist Mono via jsDelivr CDN (`index.css` `@font-face`).

**`font-data` applies `font-variant-numeric: tabular-nums`** — columns of numbers align correctly without explicit `tabular-nums` everywhere.

### Type Scale

| Role | Classes | Example |
|------|---------|---------|
| Page / module title | `font-display text-2xl font-bold` | "Morning Brief" |
| Hero KPI value | `font-data text-3xl font-bold` | "$2.4M" |
| Section heading | `text-lg font-semibold` | "Corn — Net Position" |
| Card label | `text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]` | "UNPRICED EXPOSURE" |
| Card value | `font-data text-2xl font-bold` | "485,000 bu" |
| Body / table cell | `text-sm` | Contract details |
| Small / helper | `text-xs` | Timestamps, footnotes |

**Weight ladder:** bold (KPI values, titles) → semibold (section headers, column headers) → medium (labels, nav) → regular (body text).

---

## Color Tokens

All colors are CSS custom properties defined in `src/index.css`. Use `var(--token)` in Tailwind arbitrary values. Do not hardcode hex values in components.

### Design Token Reference

#### Light Mode (`:root`)

| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | `#F8FAFC` | Page background |
| `--bg-surface` | `#FFFFFF` | Cards, panels |
| `--bg-surface-raised` | `#F1F5F9` | Hover states, elevated surfaces |
| `--bg-inset` | `#E2E8F0` | Table headers, inset areas |
| `--border-default` | `#CBD5E1` | Card borders, dividers |
| `--border-subtle` | `#E2E8F0` | Table row dividers |
| `--text-primary` | `#0F172A` | Headings, values, primary content |
| `--text-secondary` | `#475569` | Body text, table cells |
| `--text-muted` | `#94A3B8` | Labels, helper text, placeholders |
| `--accent` | `#2563EB` | Interactive elements, links, active states |
| `--accent-hover` | `#1D4ED8` | Accent hover state |
| `--positive` | `#16A34A` | Profit, long positions, success |
| `--negative` | `#DC2626` | Loss, short positions, error |
| `--warning` | `#D97706` | Urgency, overdue, amber alerts |
| `--info` | `#2563EB` | Informational, non-urgent |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.06)` | Subtle card depth |
| `--shadow-md` | `0 4px 12px rgba(15,23,42,0.08)` | Modal, elevated panel |
| `--shadow-lg` | `0 8px 24px rgba(15,23,42,0.1)` | Overlay, command palette |

#### Dark Mode (`.dark`)

| Token | Value | Note |
|-------|-------|------|
| `--bg-base` | `#0B1120` | Deep navy — not pure black |
| `--bg-surface` | `#131B2E` | Card surface |
| `--bg-surface-raised` | `#1A2540` | Hover / elevated |
| `--bg-inset` | `#0A0E1A` | Table header inset |
| `--border-default` | `#1E2D4A` | Card borders |
| `--border-subtle` | `#162236` | Table row dividers |
| `--text-primary` | `#F1F5F9` | Primary content |
| `--text-secondary` | `#94A3B8` | Body / table cells |
| `--text-muted` | `#475569` | Helper text |
| `--accent` | `#3B82F6` | Interactive / active |
| `--accent-hover` | `#60A5FA` | Accent hover |
| `--positive` | `#4ADE80` | Profit, long |
| `--negative` | `#F87171` | Loss, short |
| `--warning` | `#FBBF24` | Warning |
| `--info` | `#60A5FA` | Info |

### Commodity Colors

Used in `@theme` block (Tailwind color tokens). Used across all charts, badges, and commodity indicators. **Never repurpose for semantic meaning.**

| Commodity | Hex | Tailwind Token |
|-----------|-----|----------------|
| Corn | `#EAB308` | `--color-corn` |
| Soybeans | `#22C55E` | `--color-soybeans` |
| Wheat | `#F59E0B` | `--color-wheat` |
| Barley | `#3B82F6` | `--color-barley` |
| Milo | `#A855F7` | `--color-milo` |
| Oats | `#14B8A6` | `--color-oats` |
| Soybean Meal | `#EC4899` | `--color-soybean-meal` |
| Cottonseed | `#F97316` | `--color-cottonseed` |
| Commodity Other | `#6B7280` | `--color-commodity-other` |

### Semantic Color Usage

| Context | Token | Class pattern |
|---------|-------|---------------|
| Positive / profit / long | `--positive` | `text-[var(--positive)]`, `bg-[var(--positive)]/10` |
| Negative / loss / short | `--negative` | `text-[var(--negative)]`, `bg-[var(--negative)]/10` |
| Warning / overdue / amber | `--warning` | `text-[var(--warning)]`, `bg-[var(--warning)]/10` |
| Interactive element | `--accent` | `text-[var(--accent)]`, `bg-[var(--accent)]` |
| Muted label | `--text-muted` | `text-[var(--text-muted)]` |

---

## Spacing

| Context | Token | Value |
|---------|-------|-------|
| Card padding | `p-4` | 16px |
| Page section padding | `p-6` | 24px |
| Grid gap (standard) | `gap-4` | 16px |
| Grid gap (compact) | `gap-3` | 12px |
| Vertical section flow | `space-y-6` | 24px |
| Vertical item flow | `space-y-4` | 16px |
| Sidebar nav spacing | `space-y-1` | 4px |
| Button padding | `px-3 py-1.5` | 12px / 6px |
| Nav item padding | `px-3 py-2.5` | 12px / 10px |
| Table header cell | `px-3 py-2.5` | standard |
| Table body cell | `px-3 py-2` | compact |

---

## Layout

### App Shell

```
┌─────────────────────────────────────────────┐
│ Header (h-14)          logo  search  actions │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Main content (flex-1 overflow-y) │
│  w-56    │                                   │
│ (desktop)│  [Module content scrolls here]    │
│          │                                   │
├──────────┴──────────────────────────────────┤
│ Footer (h-7)                                 │
└─────────────────────────────────────────────┘
```

- Header: `h-14 shrink-0`
- Sidebar: `w-56` desktop / `w-14` tablet icon rail / slide-out drawer mobile
- Main: `flex-1 overflow-y-auto`
- Footer: `h-7 shrink-0`

### Grid Patterns

| Pattern | Classes |
|---------|---------|
| KPI cards 4-up | `grid grid-cols-2 md:grid-cols-4 gap-4` |
| KPI cards 3-up | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` |
| Two-column | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| Three-column | `grid grid-cols-1 md:grid-cols-3 gap-4` |
| Chart + table (50/50) | `grid grid-cols-1 lg:grid-cols-2 gap-4` |

### Module Layout Pattern

Every analytics module follows this top-to-bottom hierarchy:

1. **Zone 1 — Summary row**: 3–5 StatCards, most important at left. `py-4 px-6` (orientation zone)
2. **Zone 2 — Alert badges**: Red/amber issues immediately below summary
3. **Zone 3 — Chart**: Visual pattern recognition (bar/line/pie)
4. **Zone 4 — Detail table**: Sortable contract-level data below fold. `py-1.5 px-3` cells (working zone)

Use subtle background shifts between zones: `bg-[var(--bg-surface)]` for header, `bg-[var(--bg-base)]` for stats band, `bg-[var(--bg-surface)]` for table.

### Border Radius

| Element | Class |
|---------|-------|
| Cards / panels | `rounded-lg` |
| Buttons / badges | `rounded-lg` |
| Pills / progress bars / dots | `rounded-full` |
| Table container | `rounded-lg` |

---

## Components

### StatCard

KPI metric card with optional delta indicator. Uses CSS tokens throughout.

```tsx
Props: label, value, delta?, deltaDirection? ('up'|'down'|'neutral'), colorClass?

Container: rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4
Label:     text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide
Value:     mt-1 text-2xl font-bold text-[var(--text-primary)]     ← add font-data for numbers
Delta:     mt-1 text-sm font-medium
  Up:      text-[var(--positive)]  with ↑ prefix
  Down:    text-[var(--negative)]  with ↓ prefix
  Neutral: text-[var(--text-muted)]
```

**Planned upgrades (DESIGN_BRIEF P0–P2):**
- Hover lift: `hover:-translate-y-px hover:shadow-md transition-all duration-150`
- Number count-up animation on data load (400ms, ease-out)
- Sparkline (24px tall) from M2M snapshot history at card bottom

### AlertBadge

Severity indicator pill. Prop is `level`, not `severity`.

```tsx
Props: level ('critical'|'warning'|'info'|'ok'), children

Container: inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
Critical:  bg-[var(--negative)]/10  text-[var(--negative)]  border-[var(--negative)]/20
Warning:   bg-[var(--warning)]/10   text-[var(--warning)]   border-[var(--warning)]/20
Info:      bg-[var(--info)]/10      text-[var(--info)]      border-[var(--info)]/20
Ok:        bg-[var(--positive)]/10  text-[var(--positive)]  border-[var(--positive)]/20
```

### DataTable

TanStack React Table v8 wrapper with CSS token styling.

```tsx
Container:   overflow-x-auto border border-[var(--border-default)] rounded-lg
Header row:  bg-[var(--bg-inset)] sticky top-0
Header cell: px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider
             cursor-pointer hover:bg-[var(--bg-surface-raised)]
Body row:    divide-y divide-[var(--border-subtle)] hover:bg-[var(--bg-surface-raised)]
Body cell:   px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap
Footer row:  bg-[var(--bg-inset)] font-semibold
Empty:       p-8 text-center text-[var(--text-muted)]
```

Sort indicators: ` ↑` / ` ↓` appended inline to header text.

**No zebra striping.** Use hover highlight only (inspired by Linear).

**Planned upgrades (DESIGN_BRIEF):**
- Column visibility dropdown
- Per-column filter inputs
- Compact mode: `py-1.5` rows (36px vs 44px default)
- Sticky first column on horizontal scroll

### ExportButton

Secondary action. Consistent across all modules.

```tsx
px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border-default)]
bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] transition-colors
text-[var(--text-secondary)]
Icon: h-4 w-4 with gap-1.5
```

### SegmentedControl

Tabbed view switcher for modules with multiple views.

```tsx
Props: segments: { key, label }[], activeKey, onChange, size?

WAI-ARIA: role="tablist" on container, role="tab" on each button
Class: no-print (hidden in print mode)
Active tab: bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm
Inactive:   text-[var(--text-muted)] hover:text-[var(--text-secondary)]
```

Used by: NetPositionDashboard, MarkToMarket, UnpricedExposureReport, DeliveryTimeline.

### AlertBellButton + AlertDrawer

Bell icon in header. Red badge with `criticalCount`. Opens slide-out panel from right.

```tsx
AlertDrawer: groups alerts by severity (critical → warning → info)
Badge: absolute positioned, bg-[var(--negative)] text-white, rounded-full
```

---

## Navigation

### Sidebar

- Active item: `bg-blue-600/10 text-[var(--accent)]` + left border accent (2px) — not background fill
- Inactive hover: `text-[var(--text-secondary)] hover:bg-[var(--bg-surface-raised)]`
- Icons: Emoji (P3 TODO: replace with SVG icons)
- Per-module alert badges: red pill for critical, amber for warning
- Unvisited blue dots: session-level tracking (resets on page refresh)

### Sidebar Groups

- **main**: Morning Brief, Net Position, Unpriced Exposure, Delivery Timeline, Basis Spread, Customer Concentration, Risk Profile
- **market**: Daily Inputs, Price-Later, Mark-to-Market, Freight Efficiency
- **tools**: Scenario, Data Health

### Routing

Hash-based: `#morning-brief`, `#net-position`, etc.
Supports query params: `#delivery-timeline?filter=overdue`

### Command Palette

`Cmd+K` / `Ctrl+K`. Searches 4 groups (max 8 results each): Modules, Contracts, Entities, Quick Actions.
Min 2 chars to trigger. Arrow keys navigate, Enter selects, Escape closes.

---

## Dark Mode

- Toggle stored in `localStorage`, applied as `class="dark"` on `<html>`
- All tokens switch via `.dark` block in `index.css`
- Page background: deep navy `#0B1120` (not pure black)
- Charts use custom dark theme colors for axes, grid, and tooltips
- Print stylesheet forces light mode regardless of user preference

---

## Print

- Hide interactive chrome: `.no-print` class on sidebar, header, command palette, sliders, cross-links
- Force light color scheme
- Table font reduced to 10px
- Main content full-width (sidebar removed from layout)
- Print date and data timestamp: "Printed 2026-03-30 from data uploaded at 7:30 AM" (planned)

---

## Delight Roadmap

| Priority | Feature | Effort | Status |
|----------|---------|--------|--------|
| P0 | Morning Brief card stagger animation (50ms delay, 800ms total) | 2h | Planned |
| P0 | StatCard hover lift (`-translate-y-px` + shadow) | 30m | Planned |
| P1 | Number count-up animations on data load (400ms ease-out) | 3h | Planned |
| P1 | Page transition: fade + slide-up 8px on module switch (150ms) | 1h | Planned |
| P1 | Table row left-border accent on hover | 30m | Planned |
| P2 | Sparklines in StatCards (24px, from M2M snapshot history) | 4h | Planned |
| P2 | Settlement fetch per-commodity progress UI | 2h | Planned |
| P2 | Module keyboard shortcuts (1–9) | 2h | Planned |
| P3 | Exposure waterfall chart (Mixpanel-style funnel) | 4h | Planned |
| P3 | Sidebar SVG icons (replace emoji) | 3h | Planned |

**The signature moment:** When iRely data uploads and Morning Brief populates — KPIs animate in left-to-right (50ms stagger), numbers count up, alert badge counts up. Total ~800ms. Should feel like the dashboard "waking up" with the day's data.

---

## Per-Screen Design Targets

### Morning Brief
**Inspired by:** Plausible (single-screen overview) + Stripe (KPI cards) + Robinhood (signature moment)
- Single-screen executive summary — no scrolling needed
- Hero KPI: Total Unpriced Exposure at `text-3xl`, top-left
- Secondary KPIs: Book P&L, Net Position, Hedge Ratio, Overdue Contracts
- Alert banner below KPIs (exists, keep it)
- Stagger-animate cards on data load (50ms delay, 800ms total)

### Mark-to-Market
**Inspired by:** Stripe (KPI strip) + Robinhood (P&L trend) + Shadcn (data table)
- KPI strip: Total P&L (hero), Futures P&L, Basis P&L, Freight Impact
- P&L trend sparkline below KPIs (from snapshot history)
- Per-commodity expandable rows (click to see contracts)
- Inline scenario sliders (keep — they're great)
- Data table: add column visibility toggle

### Net Position
**Inspired by:** Koyfin (multi-panel) + TradingView (chart quality) + Linear (table density)
- Chart left 50% / table right 50% on desktop
- Bar chart: `--positive` for long, `--negative` for short, per commodity
- Table: compact rows (36px), `font-data` numbers, hover highlight

### Unpriced Exposure
**Inspired by:** Mixpanel (funnel) + Plausible (clear metrics)
- Exposure waterfall: Gross → In-Transit → HTA-Paired → True Open
- Urgency coding: `--negative` = overdue, `--warning` = ≤14 days, `--positive` = comfortable
- Per-entity breakdown with concentration warnings

### Delivery Timeline
**Inspired by:** Linear (timeline/Gantt) + Observable (interactive charts)
- Timeline bars for delivery windows
- This month / next month default view
- Stacked bar: inbound (`--positive`) vs outbound (`--negative`) per month

### Daily Inputs
**Inspired by:** Radix UI (form patterns) + Shadcn (input components)
- Clean form with clear section headings
- "Fetch Settlements" with per-commodity progress (not just spinner)
- Validation feedback inline (not modal alerts)

---

## What NOT to Do

1. **No decorative elements.** No gradients, blobs, or illustrations. The data IS the design.
2. **No multiple accent colors.** One blue `--accent`. Commodity colors are for data only.
3. **No over-animation.** 150–400ms max. No bouncing, no elastic, no spring physics.
4. **No increased white space.** More space between items is wrong for this app. Keep it dense but organized.
5. **No equal-weight sections.** Every screen needs a clear visual priority. Not all StatCards the same size.
6. **No Inter.** The three-font stack is DM Sans + Plus Jakarta Sans + Geist Mono. Do not regress to Inter.
7. **No hardcoded hex values.** Use `var(--token)` always. Exceptions: commodity colors which live in `commodityColors.ts`.
