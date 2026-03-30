# Grain Intel Design Brief

*Derived from design research across 15 best-in-class dashboards.*
*See `DESIGN_RESEARCH/` for full site reviews, scorecard, and comparison data.*

---

## Problem Statement

Grain Intel is functional but feels cluttered, hard to digest, and generic. The trader opens it every morning and it works, but it doesn't feel like a tool built for them. It feels like default Tailwind with data plugged in.

## Design Vision

**Grain Intel should feel like a Bloomberg terminal designed by the Linear team.** Dense, fast, professional, calm. Every pixel serves the trader's morning workflow. When they open it at 6 AM, the dashboard should communicate the state of the book in 3 seconds, then get out of the way.

---

## Design Principles

1. **Lead with the number that matters most.** Every screen has one hero metric. It's the biggest, boldest element.
2. **Hierarchy through typography, not color.** Size and weight create hierarchy. Color is reserved for meaning.
3. **One screen, one decision.** The answer to the trader's question should be above the fold.
4. **Density is a feature, clutter is a bug.** Show more data, but with consistent patterns.
5. **Delight is responsiveness.** Fast interactions, smooth transitions, numbers that feel alive.

---

## Typography System (Implemented)

| Role | Font | Weight | Use |
|------|------|--------|-----|
| Display | Plus Jakarta Sans | 700-800 | Page titles, branding |
| Body | DM Sans | 400-600 | All UI text, labels, nav |
| Data | Geist Mono (tabular-nums) | 400-600 | Dollar amounts, bushels, percentages, timestamps |

## Color System (Implemented)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-base` | #F8FAFC | #0B1120 | Page background |
| `--bg-surface` | #FFFFFF | #131B2E | Cards, panels |
| `--accent` | #2563EB | #3B82F6 | Interactive elements, links |
| `--positive` | #16A34A | #4ADE80 | Profit, long positions |
| `--negative` | #DC2626 | #F87171 | Loss, short positions |
| `--warning` | #D97706 | #FBBF24 | Urgency, overdue |

Commodity colors preserved (Corn #EAB308, Soybeans #22C55E, etc.)

---

## Per-Screen Recommendations

### Morning Brief (Most Important)
**Inspired by**: Plausible (single-screen overview) + Stripe (KPI cards) + Robinhood (signature moment)

- Make it a single-screen executive summary. No scrolling needed.
- Hero KPI: Total Unpriced Exposure at 36px, center of the top row
- Secondary KPIs: Book P&L, Net Position, Hedge Ratio, Overdue Contracts
- Add sparklines to each KPI card from M2M snapshot history
- Alert banner below KPIs (already exists, keep it)
- Stagger-animate cards on data load (50ms delay each, 800ms total)

### Mark-to-Market
**Inspired by**: Stripe (financial KPIs) + Robinhood (P&L trend line) + Shadcn (data table)

- KPI strip at top: Total P&L (hero), Futures P&L, Basis P&L, Freight Impact
- P&L trend sparkline below KPIs (from M2M snapshot history)
- Per-commodity breakdown as expandable rows (click to see contracts)
- Inline scenario sliders (keep, they're great)
- Data table: add column visibility toggle

### Net Position
**Inspired by**: Koyfin (multi-panel) + TradingView (chart quality) + Linear (table density)

- Chart and table side-by-side on desktop (chart left 50%, table right 50%)
- Bar chart: green for long, red for short, per commodity
- Table: compact rows (36px height), monospace numbers, subtle row hover

### Unpriced Exposure
**Inspired by**: Mixpanel (funnel visualization) + Plausible (clear metrics)

- Exposure waterfall as a visual funnel (Gross → In-Transit → HTA-Paired → True Open)
- Urgency color coding: red = overdue, amber = <=14 days, green = comfortable
- Per-entity breakdown table with concentration warnings

### Delivery Timeline
**Inspired by**: Linear (timeline/Gantt) + Observable (interactive charts)

- Timeline bars showing contract delivery windows
- This month / next month as the default view
- Stacked bar chart: inbound (green) vs outbound (red) per month

### Daily Inputs
**Inspired by**: Radix UI (form patterns) + Shadcn (input components)

- Clean form with clear section headings
- "Fetch Settlements" with per-commodity progress indicator
- Validation feedback inline (not modal alerts)

---

## Component Upgrades

### StatCard v2
- Add sparkline trend (24px tall, inline at bottom of card)
- Hover: subtle lift (translateY -1px) + shadow increase
- Numbers: count-up animation on load (400ms)

### DataTable v2
- Column visibility dropdown (show/hide columns)
- Per-column filter inputs
- Compact mode option (36px rows vs 44px)
- Sticky first column on horizontal scroll
- No zebra striping (hover highlight only)

### Navigation Upgrades
- Number key shortcuts: 1-9 for modules
- Recent modules section in Cmd+K palette
- Active nav item: left accent border (2px) instead of background fill

---

## Delight Roadmap

| Priority | Feature | Effort |
|----------|---------|--------|
| P0 | Morning Brief card stagger animation | 2 hours |
| P0 | StatCard hover lift effect | 30 min |
| P1 | Number count-up animations | 3 hours |
| P1 | Page transition (fade + slide up) | 1 hour |
| P1 | Table row hover enhancement | 30 min |
| P2 | Sparklines in StatCards | 4 hours |
| P2 | Settlement fetch progress UI | 2 hours |
| P2 | Module keyboard shortcuts (1-9) | 2 hours |
| P3 | Exposure waterfall chart | 4 hours |
| P3 | Sidebar SVG icons (replace emoji) | 3 hours |

---

## What NOT to Do

1. **Don't add decorative elements.** No gradients, blobs, or illustrations. The data IS the design.
2. **Don't use multiple accent colors.** One blue accent. Commodity colors are for data only.
3. **Don't over-animate.** 150-400ms max. No bouncing, no elastic, no spring physics.
4. **Don't reduce data density.** More white space between items is wrong for this app. Keep it dense but organized.
5. **Don't copy Grafana's equal-weight panels.** Every section needs a clear visual priority.

---

## Next Steps

1. Run `/design-consultation` with this brief as input to generate the updated DESIGN.md
2. Implement P0 delight features (stagger animation, hover effects)
3. Upgrade StatCard and DataTable components per recommendations
4. Replace sidebar emoji with SVG icons
5. Add keyboard shortcuts for module navigation
