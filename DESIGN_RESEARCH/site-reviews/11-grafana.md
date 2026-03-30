# Grafana

> Open-source monitoring and observability platform. Multi-panel dashboards for time-series data, alerting, and visualization. Used by DevOps and SRE teams. The public playground (play.grafana.org) showcases customizable panel layouts, dark themes, and dozens of visualization types.

**URL:** https://play.grafana.org
**Category:** Infrastructure Monitoring / Observability
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                        |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| Information Hierarchy          | 6     | Panels are equal-weight by default; hierarchy depends entirely on user configuration |
| Data Density                   | 9     | Extreme density; multiple panels with independent time ranges, queries, and refresh rates |
| Navigation                     | 6     | Folder/dashboard tree plus search; discovering specific dashboards requires knowing they exist |
| Summary vs Detail              | 5     | No built-in summary layer; dashboards jump straight to detail panels |
| Typography                     | 6     | Functional mono + sans pairing; panel titles are small and sometimes lost in dense layouts |
| Color Usage                    | 8     | Dark theme with excellent contrast ratios; traffic-light alerting (green/amber/red) is systemically used |
| White Space                    | 4     | Panels are packed edge-to-edge; gutters are minimal; density is the priority |
| Delight & Micro-interactions   | 6     | Crosshair sync across panels is genuinely useful; drag-to-zoom on time axis is smooth |
| Tables & Tabular Data          | 7     | Table panels support thresholds, color-coded cells, and sparkline columns |
| Charts & Data Visualization    | 9     | Best-in-class variety: time series, bar, gauge, stat, heatmap, histogram, candlestick, state timeline |

**Average: 6.6**

---

## Key Observations

### Information Hierarchy
Grafana's default dashboards have flat hierarchy -- every panel is the same size and visual weight unless the creator explicitly makes one larger. The playground's welcome page uses a "launchpad" grid of equal-sized icon tiles (Arcade, Featured Dashboards, Visualization Examples), which provides no guidance on what to look at first. Hierarchy in Grafana is an authoring decision, not a platform default.

### Data Density
Grafana is built for density. A typical monitoring dashboard shows 12-20 panels on a single screen, each with independent time-series data, thresholds, and refresh rates. Panels can be as small as a single stat number or as large as a full-width graph. The grid system (24 columns, arbitrary row height) enables precise packing. This density works because infrastructure monitoring demands simultaneous visibility of many signals.

### Navigation
The left sidebar provides access to dashboards, explore mode, alerting, and administration. Dashboards are organized in folders, and a search bar enables fuzzy matching. The weakness is discoverability: with potentially hundreds of dashboards, finding the right one requires either knowing its name or browsing folder trees. There are no "favorites" or "recently viewed" surfaces on the welcome page of the playground.

### Summary vs Detail
This is Grafana's biggest gap. There is no concept of a summary dashboard that rolls up data from child dashboards. Each dashboard is independent. Users work around this by creating "overview" dashboards manually, but the platform provides no structural support for summary-to-detail navigation. Drill-down links between dashboards exist but must be manually configured per panel.

### Typography
Panel titles use a small sans-serif that can feel lost against the data. Stat panels (large single-number displays) use a bold display weight that works well. The monospace font for axis labels and data values ensures alignment. Overall, typography is functional but unremarkable -- it does not help establish hierarchy the way Plausible's number-first approach does.

### Color Usage
The dark theme (default) uses a near-black background with panel backgrounds in a slightly lighter gray. This creates clear panel boundaries without explicit borders. The traffic-light system is deeply embedded: green for healthy, amber for warning, red for critical. Thresholds on gauges and stat panels change background color based on value. Series colors in charts default to a well-separated palette (green, blue, yellow, orange, red) that works against dark backgrounds.

### White Space
Grafana sacrifices white space for data density. Panel gutters are 4-8px. There is no breathing room between sections because Grafana does not have a section concept -- it has a flat grid of panels. This works on large monitors (infrastructure teams typically use 27"+ displays or wall-mounted screens) but creates visual overload on laptops. The lack of white space makes it hard to group related panels visually.

### Delight & Micro-interactions
The standout interaction is crosshair synchronization: hovering one time-series panel draws a vertical crosshair line on ALL panels at the same timestamp. This enables instant correlation across metrics ("CPU spiked at 2:14 PM -- did request latency spike too?"). Drag-to-zoom on the time axis is smooth and updates all synced panels. Panel-level dropdown menus support drill-down, inspect, and share actions. These are not decorative -- they are analytical power tools.

### Tables & Tabular Data
Grafana's table panel supports threshold-based cell coloring (similar to Koyfin's heat-map cells), sparkline columns (inline mini charts within a cell), sortable headers, and cell-level links. The table is treated as a first-class visualization type, not an afterthought. Column formatting supports units, decimals, and color mappings. The weakness is that tables cannot be independently filtered -- they show whatever the underlying query returns.

### Charts & Data Visualization
Grafana offers the widest variety of visualization types of any platform reviewed. Time series (the default), bar charts, gauges, single stats, heatmaps, histograms, candlestick charts, state timelines, node graphs, geomap, and more. Each type supports thresholds, annotations, and custom color mappings. The time-series panel alone supports line, bar, and point modes with fill opacity, gradient fills, stack normalization, and multiple Y-axes. This is the benchmark for visualization breadth.

---

## Steal This

### 1. Crosshair Synchronization Across Charts
**Pattern:** Hovering any time-series chart in Grafana draws a synchronized vertical crosshair on all other time-series charts at the same X-axis position (timestamp). Tooltips appear simultaneously on every chart showing the value at that point. This enables instant visual correlation across metrics.
**Grain Intel Mapping:** When the Morning Brief or any module shows multiple time-series charts (e.g., Net Position trend + Unpriced Exposure trend + Basis Spread trend), synchronize the hover crosshair across all of them. If a trader hovers over March 15 on the position chart, the basis chart and exposure chart should also highlight March 15. Recharts supports this via a shared `CategoricalChartState` or by syncing `activeTooltipIndex` across chart instances using a shared React context. This is a high-value, low-effort feature that makes multi-chart modules dramatically more useful.

### 2. Threshold-Based Color Coding on Stat Panels
**Pattern:** Grafana's stat panels (single big number displays) change their background color based on configurable thresholds. A "CPU Usage: 87%" stat turns red when the value exceeds 80%, amber between 60-80%, and green below 60%. The thresholds are defined per panel and the color transition is immediate.
**Grain Intel Mapping:** Morning Brief StatCards should adopt threshold-based backgrounds. Define thresholds per KPI: Unpriced Exposure > 100K bu = red background tint, 50K-100K = amber, < 50K = green. Net Position swing > 50K bu day-over-day = red. Data freshness > 24 hours = amber. Use Tailwind's `bg-red-50 dark:bg-red-950/30` for critical, `bg-amber-50 dark:bg-amber-950/30` for warning. These subtle background tints communicate severity faster than reading the number itself. The thresholds already exist in `src/utils/alerts.ts` -- connect them to card styling.

### 3. Drag-to-Zoom on Time Axes
**Pattern:** On any Grafana time-series chart, click-and-drag horizontally to select a time range, and the chart zooms to that range. All synced panels zoom together. Double-click resets to the original range. This enables rapid temporal investigation without touching date picker controls.
**Grain Intel Mapping:** Any Recharts time-series chart (M2M snapshot trends, basis spread history, delivery timeline) should support this interaction. Recharts provides a `ReferenceArea` component that can be rendered during a drag operation, then the chart's domain is updated to the selected range on mouse-up. Pair this with crosshair sync for a powerful analysis workflow: "I see a spike on March 12, let me drag-zoom all charts to March 10-14 to investigate." Add a "Reset Zoom" button that appears only when zoomed. This is a significant UX upgrade over static date range dropdowns.

### 4. Traffic-Light Alert Coloring System
**Pattern:** Grafana uses green/amber/red consistently across every visualization type: gauge arcs change color at thresholds, table cells change background, stat panels change color, chart series change color at threshold lines. The traffic-light metaphor is universal and immediate.
**Grain Intel Mapping:** Standardize the alert color system across all 14 modules. Currently, alerts exist but their visual treatment varies. Define three global semantic colors (critical=red-500, warning=amber-500, ok=emerald-500) and apply them consistently: StatCard backgrounds, table row highlights, chart threshold lines, sidebar badge colors, and alert drawer icons. Create a shared `getAlertColor(level)` utility that returns the correct Tailwind class. The existing `AlertBadge` component uses severity levels -- extend this color system to every data component that has alert context.

---

## Avoid This

### Flat Panel Grid Without Visual Grouping
Grafana's dashboards are flat grids with no concept of sections or groups. Related panels (e.g., three network metrics) look the same as unrelated panels placed nearby. Grain Intel should group related data visually -- use section headers, shared backgrounds, or card grouping to show that "these three cards are all about Corn" or "this section covers delivery status." The Segmented Control tabs already help within modules; extend grouping to the Morning Brief.

### Configuration-Heavy Default Experience
Grafana requires significant configuration to produce a useful dashboard: choosing panels, writing queries, setting thresholds, arranging the grid. The playground's welcome page is a blank launchpad, not a working dashboard. Grain Intel must ship with a fully configured, working dashboard on first load. The data comes from iRely uploads, so the dashboard should populate immediately after the first file upload with zero panel configuration.

### Tiny Panel Titles
Grafana's panel title text is small (often 12-13px) and gets lost against the chart data below it. On dense dashboards, it can be hard to tell what a panel is showing without reading the title carefully. Grain Intel module headers and section titles should be bold, clearly sized, and visually distinct from the data they describe. Use `text-lg font-semibold` minimum for section headers within modules.

### Multi-Dashboard Navigation Sprawl
Grafana users often end up with dozens of dashboards organized in folders, and finding the right one requires remembering its name. Grain Intel's module list is fixed at 14 -- do not introduce a concept of "custom dashboards" or "saved views" that would create navigation sprawl. The 14 modules plus Morning Brief overview is the product. Keep it closed.
