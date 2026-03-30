# TradingView

> Chart-heavy trading platform with a massive user community. Complex toolbar UX made approachable. Multi-panel layouts, screener views. Power-user tool with a clean feel.

**URL:** https://www.tradingview.com
**Category:** Charting & Trading Platform
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                          |
| ------------------------------ | ----- | -------------------------------------------------------------- |
| Information Hierarchy          | 8     | Chart is king; everything else orbits around it                |
| Data Density                   | 7     | High density in charts but controlled elsewhere                |
| Navigation                     | 9     | Toolbar system is remarkably learnable for its complexity      |
| Summary vs Detail              | 6     | Weak on summaries; designed for deep-dive chart analysis       |
| Typography                     | 7     | Clean sans-serif, good number formatting, clear labels         |
| Color Usage                    | 8     | Dark default with precise accent colors; user-customizable     |
| White Space                    | 6     | Charts fill available space; sidebars and panels are compact   |
| Delight & Micro-interactions   | 8     | Smooth crosshairs, snappy tooltips, drawing tool animations    |
| Tables & Tabular Data          | 7     | Screener tables are functional; not as refined as charting     |
| Charts & Data Visualization    | 10    | Industry benchmark for interactive financial charting          |

**Average: 7.6**

---

## Key Observations

### Information Hierarchy
TradingView builds its entire hierarchy around the chart canvas. The chart occupies 70-80% of the viewport. Toolbars sit at the top and left edges. Panels (watchlist, details, alerts) are collapsible drawers that overlay or dock beside the chart. This single-artifact-focus approach makes the hierarchy immediately legible: the chart is the primary content, everything else is supporting.

### Data Density
On the chart itself, density is extremely high -- candlesticks, volume bars, indicator overlays, drawing annotations, and real-time price tickers all coexist. Outside the chart, density is moderate. The watchlist sidebar shows symbol, price, and change percentage in a compact row. The screener adds more columns but uses pagination rather than infinite scroll.

### Navigation
The toolbar is TradingView's masterpiece. Despite housing dozens of tools (drawing tools, indicators, time intervals, chart types), it remains approachable through progressive disclosure: the main toolbar shows the most common tools, with flyout menus for secondary options. Keyboard shortcuts are prominently documented. The search bar (/) provides universal navigation.

### Summary vs Detail
TradingView is weak here. There is no portfolio summary view, no P&L dashboard, no high-level overview. The platform assumes you already know what symbol you want to analyze. This is a deliberate trade-off for chart depth, but it means the "executive summary" pattern is entirely absent.

### Typography
A clean sans-serif (Trebuchet MS/system) with tabular number formatting. Price labels on chart axes are well-spaced and readable. Font sizes are consistent and the hierarchy is weight-driven: bold for current values, regular for historical. Nothing exceptional, but nothing broken.

### Color Usage
The dark theme uses a near-black background (#131722) with subtle grid lines. Candlestick colors (green up, red down) are customizable but default to high-contrast choices. Indicator lines use distinct hues (blue, orange, purple) that remain distinguishable in dense overlays. The color system is functional and avoids aesthetic frivolity.

### White Space
Minimal within the chart canvas by design. The areas around the chart -- toolbars, panels -- use just enough padding to keep controls from feeling cramped. The overall effect is purposeful density rather than clutter.

### Delight & Micro-interactions
This is where TradingView stands out from other financial tools. Crosshair movement is silky smooth. Tooltips snap into position with micro-animations. Drawing tools have satisfying click-drag feedback. Zooming and panning feel physics-based. The screener loading state uses a shimmer skeleton. These micro-interactions transform a data-heavy tool into something that feels responsive and alive.

### Tables & Tabular Data
The screener provides sortable, filterable columns with conditional formatting. Tables are functional but less polished than the charting experience. Column headers are clickable for sorting, and filters use dropdown selectors. Row hover highlights are present but minimal. Tables feel like a secondary citizen compared to charts.

### Charts & Data Visualization
The gold standard. Candlestick, line, area, Heikin Ashi, Renko, and more chart types. Real-time streaming data. Indicator overlays (50+). Drawing tools with snap-to logic. Multi-chart layouts (2x2, 3x1). Comparison mode overlays multiple symbols. Time interval switching is instant with cached data. Annotations persist across sessions.

---

## Steal This

### 1. Progressive Disclosure Toolbars
**Pattern:** The main toolbar shows 6-8 primary actions. Each icon has a small dropdown arrow for related sub-tools. Hovering reveals a tooltip with the action name and keyboard shortcut. Deep features are accessible but never crowd the default view.
**Grain Intel Mapping:** The module filter bars currently show all options at once. Redesign them as compact toolbars with primary filters visible (commodity, date range) and secondary filters (location, counterparty, status) in a "More Filters" dropdown. This reduces visual clutter while keeping power accessible.

### 2. Crosshair + Synchronized Tooltips
**Pattern:** Moving the cursor over a chart shows a crosshair that tracks both axes. A tooltip displays the exact data point values. When multiple charts are visible, crosshairs synchronize across all panels at the same timestamp.
**Grain Intel Mapping:** In any module that shows time-series data (P&L over time, delivery schedules, price history), implement a crosshair with a floating tooltip showing the exact values. If the dashboard view shows multiple charts side by side, synchronize the crosshairs so hovering over one chart highlights the same date on all others. Recharts supports this with `Tooltip` and custom cursor components.

### 3. Keyboard-First Navigation
**Pattern:** Pressing `/` opens a universal search. `Ctrl+K` opens a command palette. Most tools have single-key shortcuts. A keyboard shortcut overlay (`?`) lists all available shortcuts.
**Grain Intel Mapping:** Add a command palette (Ctrl+K) that searches across modules, contracts, counterparties, and commodities. This gives power users a way to navigate without touching the mouse. Libraries like `cmdk` (by Pacocas) integrate cleanly with React.

### 4. Skeleton Loading States
**Pattern:** When data is loading, TradingView shows a shimmer animation that mirrors the expected layout -- chart area gets a pulsing gradient, table rows show gray blocks in the shape of data.
**Grain Intel Mapping:** Replace the current loading spinner with skeleton screens that match each module's layout. The Contracts table should show gray rows with column-width blocks. The P&L chart should show a gray area chart shape. This reduces perceived load time and prevents layout shift. Tailwind's `animate-pulse` class on gray blocks achieves this with zero dependencies.

### 5. Sticky Price/Value Bar
**Pattern:** A thin bar at the top of the chart canvas always shows the current price, daily change, and key stats (open, high, low, volume) regardless of scroll position or zoom level.
**Grain Intel Mapping:** Each module should have a sticky summary bar at the top showing the 3-4 most critical numbers for that module (e.g., net position, total P&L, contract count). This bar remains visible even when the user scrolls through a long table below. Use Tailwind's `sticky top-0` with a z-index and subtle bottom border.

---

## Avoid This

### Chart-Centric Tunnel Vision
TradingView assumes every user interaction starts and ends with a chart. There is no concept of a portfolio overview, a daily summary, or an alert digest. Grain Intel users need the opposite: the summary comes first, the chart is supporting evidence. Do not build Grain Intel as a charting tool that happens to have tables; build it as a decision-support dashboard that happens to include charts.

### Overwhelming Toolbar Depth
While progressive disclosure works for TradingView's audience (technical traders who will invest hours learning the tool), Grain Intel's audience needs faster onboarding. Limit toolbar depth to two levels maximum -- primary visible, secondary in one dropdown. No flyout menus from flyout menus.

### Community/Social Features as Core UX
TradingView deeply integrates community ideas, published scripts, and social trading into the interface. This adds complexity that grain traders do not need. Keep Grain Intel focused on first-party data from iRely without social or community layers.
