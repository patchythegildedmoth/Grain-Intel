# Grain Trading Module — Enhancement Ideas & Feature Roadmap

**Last Updated:** March 2026

---

## Module Status Tracker

| # | Module | Category | Status | Notes |
|---|--------|----------|--------|-------|
| 1 | Elevator / Entity Location Map | Maps | ✅ Done | Leaflet + Nominatim geocoding, CSV bulk import |
| 2 | Freight Tier Heatmap | Maps | ✅ Done | Integrated into Entity Map as concentric rings |
| 3 | Delivery Flow Map | Maps | ⬜ Not Started | |
| 4 | USDA Report Integration | Market Data | ⬜ Not Started | |
| 5 | Basis History Charts | Market Data | ⬜ Not Started | |
| 6 | Futures Curve Visualization | Market Data | ⬜ Not Started | |
| 7 | Weather Dashboard Panel | Market Data | ✅ Done | Open-Meteo API, 4-tab module, risk badges. Historical correlation tab placeholder pending IndexedDB layer. |
| 8 | Historical P&L Trend Dashboard | Analytics | ⬜ Not Started | |
| 9 | Contract Aging Report | Analytics | ⬜ Not Started | |
| 10 | "What Changed" Diff View | Analytics | ⬜ Not Started | |
| 11 | Alerts Timeline / History | Analytics | ⬜ Not Started | |
| 12 | Customizable Morning Brief | UX | ⬜ Not Started | |
| 13 | Commodity Drill-Down Navigation | UX | ⬜ Not Started | |
| 14 | Keyboard Shortcuts & Quick Nav | UX | ✅ Done | Command Palette (Cmd+K), breadcrumbs, cross-module links |
| 15 | Notification Badges on Sidebar | UX | ✅ Done | Per-module alert counts + unvisited blue dots |
| 16 | Print / PDF Morning Report | UX | ⬜ Not Started | |
| 17 | Automated iRely Import | Data Integration | ⬜ Not Started | |
| 18 | Ethanol / DDG / Soybean Oil Tracking | Data Integration | ⬜ Not Started | |
| 19 | Peer Basis Comparison | Data Integration | ⬜ Not Started | |

---

## Interactive Maps

### 1. Elevator / Entity Location Map 🟡

Plot customer entities on a map showing where grain is being bought and sold geographically. Color-code markers by net position (long = green, short = red), and size them by bushel volume. Clicking a pin reveals that entity's contracts, concentration percentage, and P&L.

- **Libraries:** Mapbox GL JS or Leaflet (both free-tier friendly, no backend needed)
- **Data source:** Entity addresses from iRely contracts, geocoded on first use
- **Use case:** Quickly identify geographic concentration risk and spot opportunities in underserved areas

### 2. Freight Tier Heatmap ✅

Overlay freight tiers (A–L) on a regional map centered around your facilities. Visualize where your cheapest versus most expensive grain originates. Helps spot if you're over-buying from high-cost freight zones.

- **Visualization:** Concentric color bands radiating from facility locations, with cooler colors for cheaper tiers and warmer colors for expensive tiers
- **Benefit:** Optimize procurement strategy by highlighting freight cost inefficiencies

### 3. Delivery Flow Map

Animated lines showing grain flow: inbound (purchases) versus outbound (sales) by geography. Line thickness represents bushel volume. Useful for spotting logistical bottlenecks and balancing facility throughput.

- **Animation:** Flowing particles along routes to indicate direction and volume
- **Filters:** Toggle by commodity, delivery month, or freight term

---

## Market Data Enhancements

### 4. USDA Report Integration

Pull WASDE (World Ag Supply & Demand Estimates), Crop Progress, and Export Sales data via the USDA NASS/ERS APIs (free, no authentication required). Show upcoming report dates on the Morning Brief with countdown timers — these reports move markets.

- **Morning Brief card:** "Next WASDE: March 28 (4 days)" with color-coded urgency
- **Historical context:** Show how previous reports impacted prices for context on potential volatility
- **APIs:** USDA NASS QuickStats, USDA ERS, USDA FAS GATS

### 5. Basis History Charts

Surface historical basis trends as sparklines on the Basis Spread module. The 365-day market data history already exists in localStorage. Traders can see at a glance whether basis is tighter or wider than the same period last year.

- **Display:** "Basis is 15 cents tighter than this time last year" inline with current spread data
- **Chart type:** Overlay current year vs. prior year basis curves using Recharts ComposedChart

### 6. Futures Curve Visualization

Plot the full futures curve (nearby through deferred months) per commodity. Overlay your net position at each delivery month. Shows carry/inversion structure alongside your exposure — critical for spread trading decisions.

- **Dual axis:** Price on left axis, net bushels on right axis
- **Insight:** Immediately see if you're long in carry months or short in inverse months

### 7. Weather Dashboard Panel

Embed weather data from NOAA or Open-Meteo APIs for key growing regions. Drought monitors, precipitation forecasts, and growing degree day accumulations all drive grain prices. Even a simple "weather risk" card on the Morning Brief adds significant value.

- **Data sources:** Open-Meteo (free, no API key), NOAA Climate Data Online, US Drought Monitor
- **Morning Brief integration:** "7-day precip outlook: Below normal for Western Corn Belt" with severity badge

---

## Analytics & Decision Tools

### 8. Historical P&L Trend Dashboard

Build a dedicated module showing P&L over time (daily, weekly, monthly), decomposed by commodity. The M2M snapshots already exist in the data store. A line chart with drill-down helps traders see trends like "we've been making money on corn basis but losing on soybean futures."

- **Views:** Total P&L trend, per-commodity breakdown, futures vs. basis decomposition
- **Time ranges:** 7-day, 30-day, 90-day, YTD toggles
- **Annotations:** Mark significant market events (WASDE reports, limit moves) on the timeline

### 9. Contract Aging Report

Visual timeline showing contract age from created date through today to delivery end. Flag contracts that have been open unusually long. A Gantt-chart style view grouped by commodity or entity highlights stale positions that may need attention.

- **Color coding:** Green for healthy, amber for aging, red for overdue or approaching delivery with unpriced bushels
- **Filters:** By commodity, entity, pricing type, or salesperson

### 10. "What Changed" Diff View

Compare today's upload to the previous snapshot. Show new contracts added, contracts completed, significant balance changes, and pricing type changes. A table of deltas with color-coded rows. The previousSnapshot data already exists in the contract store — extend it to show a meaningful diff.

- **Categories:** New contracts, completed contracts, balance changes > 5,000 bu, pricing type changes, new entities
- **Morning Brief integration:** Summary card showing "12 new contracts, 5 completed, 3 significant changes" with drill-down

### 11. Alerts Timeline / History

Log every alert that fires (unpriced exposure threshold breached, position swing, entity concentration warning, etc.) with timestamps. A timeline view lets traders distinguish "this alert has been active for 3 days" from "this is new today."

- **Persistence:** Store alert history in localStorage alongside market data history
- **Trend detection:** Flag alerts that are worsening day-over-day versus improving

---

## UX / Interface Improvements

### 12. Customizable Morning Brief

Let traders drag and drop which KPI cards appear on the Morning Brief and in what order. Different merchandisers prioritize different metrics. Store layout preferences in localStorage per user.

- **Implementation:** Use a lightweight drag-and-drop library (dnd-kit or react-beautiful-dnd)
- **Presets:** Offer default layouts ("Merchandiser View", "Management View") as starting points

### 13. Commodity Drill-Down Navigation

Click any commodity name anywhere in the app to open a "Commodity Detail" view: net position, unpriced exposure, basis spread, delivery timeline, and top entities — all filtered to that single commodity on one page.

- **Navigation:** Commodity names become clickable links throughout all modules
- **Benefit:** Eliminates the need to navigate between multiple modules and mentally filter for a single commodity

### 14. Keyboard Shortcuts & Quick Navigation

Add keyboard shortcuts for power users: number keys (1–9) to jump between modules, forward slash (/) to open a command palette for quick search, and Escape to return to the Morning Brief.

- **Command palette:** Search for contracts, entities, commodities, or module names from a single input
- **Discoverability:** Show shortcut hints in sidebar tooltips and a help overlay (Shift+?)

### 15. Notification Badges on Sidebar

Show red dots or count badges on sidebar navigation items when a module has critical alerts. Traders can see at a glance "Unpriced Exposure has 3 critical items" without navigating to that module.

- **Badge types:** Red dot for critical alerts, amber number for warning-level items
- **Data source:** Computed from existing alert thresholds in alerts.ts

### 16. Print / PDF Morning Report

One-click "Generate Morning Report" that produces a clean PDF of the Morning Brief plus key charts. Traders can email it to management or review it on paper during morning meetings. The existing print CSS provides a foundation to build on.

- **Content:** KPI cards, critical alerts, net position chart, unpriced exposure summary, and basis spread highlights
- **Format:** Curated single-page or two-page report optimized for quick executive review

---

## Data Integration Ideas

### 17. Automated iRely Import

Instead of manual Excel uploads, set up a watched folder or scheduled task that auto-imports the latest iRely export. Could use a simple Node script, a Power Automate flow, or a file system watcher to detect new exports and trigger the import pipeline.

- **Options:** Power Automate (already in your Microsoft stack), Node.js file watcher, or a simple scheduled task
- **Benefit:** Eliminates the manual step of exporting and uploading each morning, reducing the time to first insight

### 18. Ethanol / DDG / Soybean Oil Price Tracking

If Ag Source deals in byproducts, tracking crush margins (soybeans → meal + oil) or ethanol margins alongside grain positions gives a fuller picture of the value chain. Helps identify when downstream economics favor or discourage grain movement.

- **Crush spread:** Soybeans vs. (Soybean Meal + Soybean Oil) margin calculation
- **Ethanol margin:** Corn price vs. ethanol + DDG revenue per bushel

### 19. Peer Basis Comparison

If regional basis data is available (DTN, Barchart, or manually maintained competitor sheets), showing your posted basis versus the local market average helps traders know if they're competitive. A simple "Basis vs. Market" column alongside existing spread data.

- **Sources:** DTN Progressive Farmer, Barchart basis data, or manual competitor tracking
- **Display:** "Your basis: -25 | Market avg: -22 | Spread: -3" per commodity and delivery month
