# Design Research Synthesis

## The Core Insight

After reviewing 15 best-in-class dashboards, one pattern emerges above all others: **the best dashboards are calm.** They don't shout. They don't compete for attention. They present information with such clear hierarchy that the user's eye goes exactly where it needs to go without any effort.

Grain Intel's problem isn't that it has too much data. It's that every piece of data gets equal visual weight. When everything is important, nothing is.

---

## 5 Design Principles (Derived from Research)

### 1. Lead with the Number That Matters Most
*Inspired by: Plausible, Stripe, Robinhood*

Every screen has one number that answers the question the trader came to ask. On Morning Brief, it's total unpriced exposure. On M2M, it's total book P&L. On Net Position, it's the largest net long or short.

That number should be the biggest, boldest thing on the screen. Everything else supports it.

### 2. Hierarchy Through Typography, Not Color
*Inspired by: Linear, Vercel, Stripe*

The top sites create visual hierarchy almost entirely through font size, weight, and spacing. Color is reserved for meaning (green = positive, red = negative, blue = interactive). Background colors are muted (cool grays, near-whites).

Grain Intel should use:
- Font size for hierarchy (big = important)
- Font weight for emphasis (semibold headings, regular body)
- Color only for semantic meaning (commodity codes, positive/negative, alerts)

### 3. One Screen, One Decision
*Inspired by: Plausible, Linear, Stripe*

Each module view should answer one question without scrolling. The Morning Brief answers "What do I need to worry about?" Net Position answers "Where am I long and short?" M2M answers "What's my book P&L?"

If the trader needs to scroll to find the answer, the layout needs work. Push detail below the fold, summary above.

### 4. Density is a Feature, Clutter is a Bug
*Inspired by: TradingView, Linear, Koyfin*

High data density is desirable for power users. But density needs structure. Linear shows 50+ issues on screen without feeling crowded because every issue has exactly the same visual pattern. TradingView shows 100+ data points per chart because the grid, axes, and spacing are perfectly calibrated.

Grain Intel should be dense but patterned. Every table row should look identical. Every card should have the same internal layout. Consistency creates density without clutter.

### 5. Delight is Responsiveness
*Inspired by: Robinhood, Linear, Vercel*

Delight in a data dashboard means: hover states that respond instantly, numbers that feel alive (count up), transitions that guide the eye, and interactions that acknowledge the user's action. Not decoration. Not animation for its own sake.

---

## Specific Recommendations by Grain Intel Screen

### Morning Brief
- **Layout**: Plausible-style single-screen overview. No scrolling needed.
- **Typography**: Hero number (total unpriced exposure) at 36px bold. KPIs at 24px. Labels at 11px uppercase.
- **Color**: Stripe-style metric cards. Green/red deltas. Blue accent for interactive elements.
- **Delight**: Numbers count up on load. Cards stagger-animate in (50ms delay between each).
- **Remove**: Cross-module link text below cards (use the cards themselves as links, which they already are).

### Net Position
- **Layout**: Linear-style compact table with commodity groupings.
- **Typography**: Commodity names at 14px semibold. Numbers at 13px mono.
- **Charts**: TradingView-style bar chart. Green for long, red for short. Crosshair on hover.
- **Steal**: Koyfin's multi-panel layout (chart left, table right, or chart top, table bottom).

### Mark-to-Market
- **Layout**: Stripe-style KPI strip (total P&L, futures P&L, basis P&L) at top. Expandable commodity detail below.
- **Typography**: Total P&L at 32px bold. Per-commodity at 16px. Contract detail at 13px mono in tables.
- **Charts**: Robinhood-style P&L trend line (using M2M snapshot history). Single line, green if positive, red if negative.
- **Delight**: Inline scenario sliders show live recalculation. Number changes animate.

### Unpriced Exposure
- **Layout**: Mixpanel-style funnel showing exposure breakdown (gross → in-transit → HTA-paired → true open).
- **Typography**: Exposure amounts at 20px bold per commodity. Urgency badges at 11px.
- **Color**: Red highlight for overdue, amber for urgent (<=14 days).
- **Table**: Shadcn-style data table with column toggles and filtering.

### Delivery Timeline
- **Layout**: Two-panel (this month / next month) with Gantt-style timeline bars.
- **Charts**: Stacked bar (inbound green, outbound red) by month. Observable-style interactive tooltips.
- **Steal**: Linear's timeline/Gantt view for delivery date ranges.

### Daily Inputs
- **Layout**: Clean form layout inspired by Radix UI form patterns.
- **Typography**: Section headings at 16px semibold. Input labels at 13px medium. Values in mono.
- **Delight**: "Fetch Settlements" shows per-commodity progress, not just a spinner.
- **Steal**: Shadcn's form patterns (inline validation, clear error states).

### Freight Efficiency
- **Layout**: PlanetScale-style performance comparison. Tier breakdown as horizontal bars.
- **Tables**: Cost per bushel in mono font. Margin recovery percentages with color coding.

### Basis Spread
- **Charts**: TradingView-style spread chart with futures curve overlay.
- **Layout**: Chart dominant (60% of screen), supporting data below.

### Customer Concentration
- **Charts**: Radix-style donut chart for top 10 entities.
- **Layout**: Entity table with concentration percentages. Red highlight at >25%.

---

## Component Pattern Recommendations

### StatCard (Upgraded)
```
┌─────────────────────────┐
│ UNPRICED EXPOSURE        │  ← 11px, uppercase, muted
│ $2.4M                   │  ← 24px, semibold, primary
│ ↑ 12% vs yesterday      │  ← 12px, green/red, mono
│ ▁▂▃▅▇█▇▅▃ (sparkline)  │  ← 24px tall, inline
└─────────────────────────┘
```
Add sparkline from M2M snapshot history. Show trend, not just current value.

### DataTable (Upgraded)
- Column visibility toggle (dropdown showing/hiding columns)
- Per-column search/filter
- Sticky first column on horizontal scroll
- Zebra striping OFF (use hover highlight instead, like Linear)
- Row height: 40px (current) → 36px (denser)

### AlertBadge (Current is Good)
Keep the current dot + text pattern. Add subtle pulse animation on critical alerts.

### SegmentedControl (Current is Good)
The inset pill pattern is solid. Keep it.

---

## Typography Recommendation

**Already implemented in design-system-v2:**
- Display: Plus Jakarta Sans (headings, branding)
- Body: DM Sans (all body text, labels, navigation)
- Data: Geist Mono with tabular-nums (dollar amounts, bushel counts, percentages)

This stack matches the best sites reviewed. Linear uses a similar approach (SF Pro for body, monospace for data). Stripe uses their custom font but follows the same display/body/data pattern.

---

## Color System Recommendation

**Already implemented in design-system-v2:**
- Background: Cool slate (#F8FAFC light, #0B1120 dark)
- Surface: White light, deep navy dark
- Accent: Blue (#2563EB) for interactive elements
- Semantic: Green for positive, red for negative, amber for warning
- Commodity colors: Preserved (Corn yellow, Soybeans green, etc.)

This matches the research findings. Stripe, Linear, and Plausible all use restrained color with semantic meaning.

---

## What to Remove or De-emphasize

1. **Emoji icons in sidebar** — Replace with simple SVG icons (Linear and Vercel don't use emoji). Emoji feels casual for a trading tool.
2. **Rounded-xl on everything** — Already changed to rounded-lg. Keep it.
3. **Heavy borders** — Use more subtle borders and rely on spacing to separate sections.
4. **Equal-weight sections** — Morning Brief sections should have clear visual hierarchy. Not all StatCards should be the same size.
5. **Ghost preview opacity** — The 40% opacity ghost cards on the upload screen are too faint. Use 60% or add a label "Sample Data" to make it clearer this is a preview.
