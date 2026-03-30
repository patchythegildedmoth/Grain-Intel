# Cross-Site Comparison

## Common Patterns Across Best Sites (10+ of 15 do this)

### 1. KPI Strip at Top
Every dashboard leads with 3-6 large numbers. Plausible shows 6. Stripe shows 3. Radix shows 9 financial KPIs. The pattern: big number, small label above, delta indicator below.

**Grain Intel implication**: Morning Brief already does this. Strengthen it. Make the numbers bigger, the labels smaller, the deltas more prominent.

### 2. Left Sidebar Navigation
13 of 15 sites use a left sidebar. Linear, Notion, Mixpanel, Grafana all have collapsible sidebars with icon-only mode. TradingView uses top toolbar. Plausible uses none (single-page).

**Grain Intel implication**: Current sidebar is solid. Add keyboard shortcuts per-module (1-9 keys).

### 3. Dark Mode Support
12 of 15 offer dark mode. Linear, TradingView, Grafana, PlanetScale default to dark. Stripe, Plausible, Notion default to light. Shadcn, Radix, Tailwind UI support both.

**Grain Intel implication**: Already supported. Consider making dark mode the default for traders (easier on eyes during long sessions).

### 4. Monospace for Numbers
11 of 15 use monospace or tabular-nums for financial/metric data. Stripe, Linear, Vercel, Shadcn, Radix all use tabular-nums. TradingView and Koyfin use dedicated monospace fonts for prices.

**Grain Intel implication**: Already added Geist Mono with tabular-nums in the design system update. Use it consistently across all dollar amounts and bushel counts.

### 5. Subtle Borders Over Heavy Lines
14 of 15 use subtle 1px borders or no borders at all. Linear uses barely-visible borders. Stripe uses thin gray borders. Nobody uses thick borders or colored borders on cards.

**Grain Intel implication**: Reduce border visibility. Use `border-subtle` token more, rely on spacing and background color to separate sections.

### 6. Single Accent Color
13 of 15 use a single primary accent (blue, green, purple, or brand-specific). Linear uses violet. Stripe uses indigo. Robinhood uses green. Vercel uses white-on-black. Nobody uses multiple competing accents.

**Grain Intel implication**: Current blue accent (#2563EB) is correct. Keep it as the sole accent. Don't let commodity colors compete.

## Unique Innovations Worth Adopting

### 1. Plausible: Everything on One Screen
Plausible fits an entire analytics dashboard on one screen with no scrolling. Six KPIs at top, two tables side by side, map below. No tabs, no drill-down, no navigation. Just the data.

**Grain Intel opportunity**: The Morning Brief could adopt this. Make it a single-screen executive summary that requires zero interaction. The trader should be able to glance and know the state of the book.

### 2. Linear: Keyboard-First Everything
Linear maps every action to a keyboard shortcut. Cmd+K for search, C for create, X for assign. The entire app is usable without touching the mouse. Status changes via keyboard.

**Grain Intel opportunity**: Map module navigation to number keys (1 = Net Position, 2 = Unpriced, etc.). Add shortcuts for common actions (S = save, F = fetch settlements, P = print).

### 3. Robinhood: The Signature Chart
Robinhood's single green line chart IS the brand. It's the first thing you see, it moves in real-time, and it communicates portfolio health in one glance. No axes, no grid, just the line.

**Grain Intel opportunity**: Create a "signature view" for the Morning Brief. A single visual that communicates total book health. Maybe a net position bar chart with green/red that the trader sees first every morning.

### 4. Stripe: The Metric Card Pattern
Stripe's metric cards show: large number (primary), percentage change (secondary, green/red), trend sparkline (tertiary). Three layers of information in one compact card. Time period selector above.

**Grain Intel opportunity**: Upgrade StatCard to include sparkline trends from M2M snapshot history. Show the direction of change, not just the current value.

### 5. Mixpanel: Interactive Funnel Visualization
Mixpanel shows funnel steps as connected bars that narrow. You can see exactly where users drop off. The visualization tells a story of loss at each step.

**Grain Intel opportunity**: The delivery timeline could use a funnel-like visualization showing contracts moving from "open" to "in transit" to "delivered." The exposure waterfall (gross → less in-transit → less HTA-paired → true open) could be a literal waterfall chart.

### 6. Shadcn: The Data Table Pattern
Shadcn's data table has: column visibility toggle, filtering per column, row selection, pagination, and column resizing. All built on TanStack Table (which Grain Intel already uses).

**Grain Intel opportunity**: Add column visibility toggle and per-column filtering to DataTable component. Traders should be able to hide columns they don't care about.

## Category Leaders by Grain Intel Relevance

| Need | Best Example | Why |
|------|-------------|-----|
| Financial KPI display | **Stripe** | Cleanest money presentation, perfect hierarchy |
| Data-dense tables | **Linear** | Dense but not overwhelming, excellent row design |
| Chart integration | **TradingView** | Charts that feel native, not plugged-in |
| Single-screen overview | **Plausible** | Proves you can show everything without tabs |
| Component patterns | **Shadcn/ui** | Uses same stack (React + Tailwind + TanStack) |
| Delight and feel | **Robinhood** | Makes financial data feel alive |
| Typography system | **Vercel** (Geist) | Clean hierarchy with purpose-built font |
| Navigation pattern | **Linear** | Keyboard-first, fast switching, Cmd+K |
| Color system | **Radix UI** | Semantic + accent with clear light/dark tokens |
| Overall app design | **Linear** | Best balance of density, clarity, and craft |

## Anti-Patterns to Avoid

1. **Grafana's density without hierarchy** — Grafana packs tons of data but gives no guidance on what to look at first. Every panel has equal visual weight.
2. **TradingView's toolbar complexity** — Power tools exposed everywhere creates cognitive overload for daily-use dashboards (fine for active trading).
3. **Notion's flexibility paralysis** — Too many layout options can make a dashboard feel unfinished. Grain Intel should be opinionated about layout.
4. **Koyfin's theme variety** — 6 different themes sounds fun but dilutes brand identity. One light, one dark is enough.
5. **Generic card grids** — Multiple sites (Mixpanel, some Tailwind UI templates) default to 3-column card grids. This is the most recognizable "default dashboard" pattern. Avoid it.
