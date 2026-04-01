# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Grain Trading Intelligence Module for **Ag Source LLC**. A React SPA that parses iRely i21 contract exports (Excel), fetches CBOT futures prices via Yahoo Finance, integrates weather forecasts from Open-Meteo, and computes daily trading analytics across 16 modules including Morning Brief, Weather Dashboard, and Entity Location Map. Used by the grain merchandising team each morning to assess position, exposure, P&L, freight efficiency, weather risk, and geographic concentration before trading.

## Commands

```bash
npm run dev          # Vite dev server with hot reload (port 5173)
npm run build        # TypeScript check + Vite production build
npm run test         # Vitest single run (124 tests across 7 files)
npm run test:watch   # Vitest watch mode
```

Build serves at `/Grain-Intel/` base path (configured in vite.config.ts).

Cloudflare Worker deployment:
```bash
cd worker/yahoo-proxy && npx wrangler deploy
```
Deployed URL: `https://grain-intel-yahoo-proxy.agsource.workers.dev`

## Daily Trader Workflow

This is the designed-for morning routine (affects all UX decisions):

1. **Upload iRely Excel** → auto-navigates to Morning Brief
2. **Scan Morning Brief** → KPI cards are clickable, link to source modules. Alert bell shows count.
3. **Drill into red/amber alerts** → click bell for Alert Drawer, or click KPI to go to source module. Use cross-module links ("View unpriced contracts →") to navigate between related modules.
4. **Go to Daily Inputs** → click "Fetch Settlements" to pull CBOT prices via Yahoo Finance
5. **Upload basis Excel** (Sell Basis, In-Transit, HTA-Paired, Freight tabs)
6. **Click Save All** → persists market data
7. **Check Mark-to-Market** → see book P&L, per-commodity breakdown. Use inline scenario sliders for quick what-if analysis.
8. **Check Weather Dashboard** → Morning Brief card shows weather risk severity. Click through to Weather module for 7-day forecasts, soil moisture, and historical correlation ("last time this happened, corn moved $X").
9. **Print Morning Brief** for team meeting (print-optimized layout)

Power user shortcuts: `Cmd+K` opens Command Palette to search contracts, entities, or modules instantly. Breadcrumbs show current location and allow quick navigation back.

Order of Steps 4-5 doesn't matter — settlements and basis are independent and don't overwrite each other.

## Architecture

React 19 SPA. Vite + TypeScript + Tailwind CSS v4 + Zustand + TanStack Table + Recharts.

### Data Pipeline

```
iRely Excel → parseExcel(buffer) → filterContracts() → validateData() → transformContracts()
    ↓
useContractStore (Contract[] with derived fields)
    ↓
13 analytics hooks (pure useMemo, no side effects)
    ↓
13 module components render results
```

### Three Zustand Stores + IndexedDB

- **useContractStore** (`grain-intel-store` in localStorage) — iRely contract data, validation results. Only `previousSnapshot` persists; contracts reload fresh each session (intentional — forces data freshness).
- **useMarketDataStore** (`grain-intel-market-data` in localStorage) — daily market inputs (sell basis, settlements, in-transit, HTA-paired, freight tiers), 365-day rolling history (auto-pruned), M2M snapshot history for sparkline trends, Yahoo Finance proxy URL. History keyed by date string (e.g., "2026-03-20").
- **useWeatherStore** (in-memory only, no persistence) — real-time weather forecasts and risk assessments. 30-minute cache TTL. Stores `forecasts[]`, `risks[]`, `lastFetched` timestamp. No localStorage — always fetches fresh on load.
- **useEntityLocationStore** (`grain-intel-entity-locations` in localStorage) — entity geocoded locations + elevator location. Separate from market data because entity locations are semi-permanent reference data.
- **IndexedDB** (`grain-intel-historical`) — historical weather and price archives for correlation engine. 4 object stores: `weather-history`, `price-history`, `cash-prices`, `fetch-metadata`. Needed because 10+ years of data exceeds localStorage's 5-10MB limit (~37MB). Gap-aware fetching via `fetch-metadata` store.

### Hook Pattern

Every analytics hook follows: subscribe to store selectors → compute in `useMemo` → return structured output (summaries + details + alerts). Most hooks are pure — no side effects, no fetching. Exception: `useWeatherRisk` and `useHistoricalCorrelation` trigger async fetches.

**16 hooks total:**
- `useNetPosition`, `useUnpricedExposure`, `useDeliveryTimeline`, `useBasisSpread`, `useCustomerAnalysis`, `useRiskProfile` — original 6 analytics modules
- `useScenario` — What-If scenario calculations
- `useDataHealth` — data validation stats
- `usePriceLaterExposure` — carry cost on Basis contracts, per-penny basis risk on HTA
- `useMarkToMarket` — orchestrates M2M (calls resolveContractM2M → aggregateM2M → generateM2MAlerts)
- `useFreightEfficiency` — freight tier analysis, margin recovery, cost trends
- `useDailyInputScaffold` — auto-generates Daily Inputs form rows from open contracts
- `useGlobalAlerts` — aggregates alerts from all hooks into a single prioritized feed
- `useWeatherRisk` — joins weather forecasts + entity locations + contract positions → risk badges and alerts
- `useHistoricalCorrelation` — orchestrates IndexedDB + historical fetchers + correlation engine for weather-price analogs
- `useEntityMap` — joins entity geocoded locations with contract data for map visualization

### M2M Architecture (Decomposed)

The Mark-to-Market calculation is split across 4 pure utility files for testability:

```
useMarkToMarket.ts (hook — thin orchestrator, 63 lines)
  ├── resolveContractM2M.ts  — per-contract M2M resolution (pricing type switch, freight adjustment)
  ├── aggregateM2M.ts        — groups into commodity summaries, FM breakdowns, exposure waterfall
  └── m2mAlerts.ts           — generates severity-tagged alerts with entity context
      └── m2mCalc.ts         — core formulas (calcPricedPurchaseM2M, calcBasisM2M, etc.)
```

### Weather Dashboard Architecture

```
Real-Time:
  Open-Meteo Forecast API → openMeteo.ts → useWeatherStore (30-min cache)
    → useWeatherRisk.ts → risk badges + alerts + Morning Brief card
    → WeatherDashboard.tsx (Overview | Forecast Charts | Soil & GDD | Historical)

Historical:
  Open-Meteo Archive API → historicalOpenMeteo.ts ─┐
  Yahoo Finance Historical → historicalYahoo.ts ───┤→ IndexedDB (grain-intel-historical)
                                                    ↓
                                              useHistoricalCorrelation.ts
                                                    ↓
                                              correlationEngine.ts (z-score matching)
                                                    ↓
                                              HistoricalCorrelationTab.tsx (lazy-loaded)
```

**Weather Risk Assessment** (`openMeteo.ts:assessRisk()`):

| Condition | Severity | Trigger |
|-----------|----------|---------|
| Drought (high) | high | totalPrecip < 5mm AND soilMoisture < 20% |
| Drought (moderate) | moderate | totalPrecip < 10mm AND soilMoisture < 30% |
| Freeze | varies | tempMin < 0-2°C in next 3 days (growing season only) |
| Excess rain (high) | high | totalPrecip > 100mm |
| Excess rain (moderate) | moderate | totalPrecip 75-100mm |

Weather alerts trigger when risk severity is HIGH/EXTREME and position exposure > 50,000 bushels.

**Growing Regions** (bounding boxes in `useWeatherRisk.ts`):
- Western Corn Belt: IA, NE, MN, SD, ND (lat 40-49, lon -104 to -90)
- Eastern Corn Belt: IL, IN, OH (lat 37-42, lon -90 to -80)
- Plains: KS, OK, TX (lat 26-40, lon -104 to -94)
- Delta: MO, AR, MS, LA (lat 29-40, lon -94 to -88)
- Southeast: TN, KY, GA, AL (lat 30-39, lon -88 to -81)

### Historical Correlation Engine

Z-score analog matching (`correlationEngine.ts`):

1. Compute historical mean/stddev for precip and temp across all years for a calendar window (month ± 2 weeks)
2. Compute z-scores: `precipZ = (actual - mean) / stddev`
3. Classify events: drought (precipZ < -1.5 + tempZ > -0.5), excess rain (precipZ > 1.5), freeze (minTemp < 0°C in growing season), heat stress (tempZ > 1.5 in growing season)
4. Match current forecast z-scores against historical events by Euclidean distance
5. Extract price response at 7d, 14d, 30d horizons. Price lookup tolerance: ±5 trading days.

**Analog matching**: similarity = max(0, 1 - distance/4). Minimum threshold: 0.3. Confidence: HIGH (5+ analogs, avg similarity > 0.7), MODERATE (3+ analogs or similarity >= 0.5), LOW (otherwise).

**Fetching strategy**: Progressive on-demand. Nothing fetched until user clicks Historical tab. Loads 2 years initially (~7MB, ~20-30s), then 5yr/10yr via "Load More". Gap-aware via `fetch-metadata` IndexedDB store.

**Continuous contract symbols** for historical prices (not monthly): Corn→ZC=F, Soybeans→ZS=F, Wheat→ZW=F, Oats→ZO=F, Soybean Meal→ZM=F.

### Entity Location Map Architecture

Leaflet + Nominatim geocoding for geographic visualization of entity positions:

- **useEntityLocationStore** — Zustand with persist, keyed by entity name (string match, `.trim()` + uppercase normalization)
- **useEntityMap** hook — joins entity locations + contracts + freight tiers → `MapEntity[]` with bushels, commodity breakdown, freight mix
- **Nominatim** (`nominatim.ts`) — geocoding with 1 req/sec rate limit, US-only (`countrycodes=us`), batch support with AbortController
- **Map tiles**: Light (OpenStreetMap) / Dark (CartoDB dark_all), switched via `key` prop on TileLayer
- **Marker sizing**: Log-scale proportional to bushels (6px-20px radius)
- **Marker color**: Primary commodity color from `commodityColors.ts`

### Global Alert System

`useGlobalAlerts` hook aggregates alerts from all 8 analytics hooks into `GlobalAlert[]` with `{ level, message, module, moduleId, commodity? }`. Sorted by severity (critical → warning → info). Returns `criticalCount`, `warningCount`, and `byModule` map.

Used by: `AlertDrawer` (slide-out panel from right), `AlertBellButton` (red badge in header), sidebar per-module badge counts.

### Command Palette (Cmd+K)

`CommandPalette` component in `src/components/layout/CommandPalette.tsx`. Opens via `Cmd+K`/`Ctrl+K` or the search icon in the header.

Searches 4 groups (max 8 results each):
1. **Modules** — sidebar nav items by label
2. **Contracts** — `contracts[]` by `contractNumber`
3. **Entities** — unique entity names from contracts
4. **Quick Actions** — Upload File, Fetch Settlements, Toggle Dark Mode, Export Data

Fuzzy match via case-insensitive `includes()`. Min 2 chars to trigger. Arrow keys navigate, Enter selects, Escape closes. `NAV_ITEMS` is exported from `Sidebar.tsx` so the palette reuses the same module list.

### Breadcrumbs & Cross-Module Links

**Breadcrumb** (`src/components/shared/Breadcrumb.tsx`): Renders `Home / [Group] / [Module]` path. Shown on all modules except Morning Brief. "Home" links back to Morning Brief. Group is derived from sidebar group (Analytics, Market Data, Tools).

**CrossModuleLink** (`src/components/shared/CrossModuleLink.tsx`): Inline navigation links at the bottom of module pages. Used in:
- `NetPositionDashboard` — "View unpriced contracts" → Unpriced Exposure
- `UnpricedExposureReport` — "Check delivery timeline", "Run what-if scenario"
- `MarkToMarket` — "Run what-if scenario"

Modules that use cross-links accept an `onNavigate: (moduleId: string) => void` prop, passed from `App.tsx`.

### Inline Scenario Sliders

`InlineScenarioSlider` (`src/components/shared/InlineScenarioSlider.tsx`): Range input with label, live value display, and reset button. Props: `label, value, min, max, step, onChange, formatValue?, defaultValue`.

Used in `MarkToMarket.tsx` Executive Summary tab as a collapsible "What-If Scenario" drawer with per-commodity futures and basis sliders. Only visible when market data is loaded (`hasMarketData`). Uses `useScenario` hook.

### Sidebar Enhancements

The sidebar (`Sidebar.tsx`) has two visual indicators:
- **Alert badges**: Per-module alert counts from `useGlobalAlerts().byModule`. Red badge for modules with critical alerts, amber for warnings. Shown as pill on desktop, dot on tablet icon rail.
- **Unvisited blue dots**: Session-level `useRef<Set<string>>` tracks which modules have been clicked. Unvisited modules show a small blue dot on their icon. Resets on page refresh.

### Segmented Controls (Tabbed Views)

5 modules use `SegmentedControl` component to eliminate long-scroll layouts:

| Module | Tabs | Default |
|--------|------|---------|
| NetPositionDashboard | Overview · Charts · Tables | Overview |
| MarkToMarket | Executive Summary · P&L by Month · Contract Detail | Executive Summary |
| UnpricedExposureReport | Summary · By Futures Month · Contracts | Summary |
| DeliveryTimeline | Overview · This Month · Next Month | Overview |
| WeatherDashboard | Overview · Forecast Charts · Soil & GDD · Historical | Overview |

Summary StatCards remain visible above tabs. Tab state is local `useState` (not persisted).

### Store Versioning

Both Zustand stores use `version` + `migrate` for schema evolution:
- **useContractStore** v1: ensures `exposure` field on `previousSnapshot`
- **useMarketDataStore** v1: migrates `freightCosts` → `freightTiers`, adds missing fields

Both stores have `onRehydrateStorage` error handlers that clear corrupted localStorage.

### Routing

Hash-based SPA routing via `window.location.hash`. Supports query params for filtered navigation (e.g., `#delivery-timeline?filter=overdue`).

Module IDs (16 total): `morning-brief`, `net-position`, `unpriced-exposure`, `delivery-timeline`, `basis-spread`, `customer-concentration`, `risk-profile`, `daily-inputs`, `price-later`, `mark-to-market`, `freight-efficiency`, `weather`, `entity-map`, `scenario`, `data-health`.

Sidebar groups: **main** (Morning Brief through Risk Profile), **market** (Daily Inputs, Price-Later, M2M, Freight Efficiency, Weather), **tools** (Entity Map, Scenario, Data Health).

## Domain Knowledge

### Key Terminology

- **Balance**: Remaining unfilled bushels on a contract — always use this for position sizing, never total quantity
- **Futures Month**: The CBOT contract month a position is hedged against (e.g., "2026-05 (May 26)")
- **Delivery Month**: Derived from contract `endDate`, the month grain is physically delivered — NOT the same as futures month
- **Basis**: Premium or discount to futures ($/bu). Buy basis is what the elevator paid over futures. Sell basis is what they sell at.
- **Carry**: The cost of holding unpriced grain over time. In a carry market (spread > 0), waiting costs money. In an inverted market (spread < 0), waiting is a benefit.
- **FOB / Picked Up**: Buyer picks up grain at the seller's location. The basis does NOT include freight. Must deduct freight cost from delivered sell basis when marking to market.
- **Delivered / Dlvd**: Seller delivers grain to buyer. Basis includes freight. These two terms are equivalent (normalized in code).
- **HTA (Hedge-to-Arrive)**: Futures are locked, basis is floating. Risk is in basis movement.
- **Basis Contract**: Basis is locked, futures are floating. Risk is in futures movement.

### Organic Filter

Contracts with `basis >= 3.0` are excluded entirely. Organic/specialty grain trades at 3x+ conventional basis and operates in a separate market. The threshold is in `filterContracts.ts`. Organic count is tracked in validation for visibility.

### Contract Statuses

- **Open / Re-Open**: Active contracts used in all analytics
- **Complete / Short Close**: Completed contracts used in historical analysis (basis spreads)
- **Cancelled**: Filtered entirely, never shown

### Commodity Sort Order

Corn → Soybeans → Wheat → Barley → Milo → Oats → Soybean Meal → Cottonseed → Commodity Other. Hard-coded in `commodityColors.ts` based on Ag Source's typical volume. All tables and charts respect this order.

## M2M Calculation Rules

Mark-to-Market compares each open contract's locked price against current market value.

### Formulas by Pricing Type

| Type | Formula | Futures P&L | Basis P&L | Quantity Field |
|------|---------|-------------|-----------|----------------|
| **Priced Purchase** | (market - cashPrice) × balance | (currentFutures - contractFutures) × balance | (currentSellBasis - contractBasis) × balance | balance |
| **Priced Sale** | (cashPrice - market) × balance | (contractFutures - currentFutures) × balance | (contractBasis - currentSellBasis) × balance | balance |
| **Basis** | basis P&L only | null (unpriced) | (currentBasis - contractBasis) × pricedQty | pricedQty |
| **HTA** | futures P&L only | (currentFutures - contractFutures) × balance | null (unpriced) | balance |
| **Cash** | total P&L only, no decomposition | null | null | balance |

**Sale contracts are REVERSED** — a sale profits when the locked price is ABOVE current market.

### Critical Edge Cases

- **Zero-price settlements**: Treated as missing, not $0. Contracts show "Unable to mark". This prevents expired contract months (which fail to fetch) from creating massive fake P&L.
- **FOB/Pickup freight**: Per-contract freight tier (A-L letter from Freight Excel tab or iRely column) is looked up to get $/bu cost, then deducted from the delivered sell basis BEFORE M2M calculation. No tier assigned = no adjustment (same as delivered).
- **Basis CAN be zero or negative**: This is a legitimate market condition. Don't filter it out.
- **Missing market data**: Contracts with no settlement or no sell basis show "Unable to mark" and are excluded from totals.

### Exposure Waterfall

```
Total Net Position (long - short bushels)
  Less: In-Transit (locked margin, doesn't move with market)
  Less: HTA-Paired (basis-only risk, not full market risk)
  = True Open Exposure (full futures + basis market risk)
```

### Carry Cost

```
Spread = Deferred Month Settlement - Nearby Month Settlement
Days Between ≈ (calendar month difference) × 21 trading days
Daily Rate = Spread / Days
Daily Carry Cost = Unpriced Bushels × Daily Rate
```

Positive daily carry = cost (carry market). Negative = benefit (inverted market, displayed green).

### Freight Tier System

FOB/Pickup contracts need freight deducted from sell basis for accurate M2M. Each contract is assigned a tier letter:

| Tier | $/bu | Tier | $/bu |
|------|------|------|------|
| A | $0.00 | G | $0.75 |
| B | $0.25 | H | $0.85 |
| C | $0.35 | I | $0.95 |
| D | $0.45 | J | $1.05 |
| E | $0.55 | K | $1.15 |
| F | $0.65 | L | $1.25 |

Pattern: A=0, B=$0.25, then 10-cent increments. Defined in `src/utils/freightTiers.ts`.

**Two sources** (priority: Excel upload > iRely column):
1. **Freight tab** in the market data Excel template — for existing contracts
2. **"Freight Tier" column** in iRely export (optional 19th column) — for new contracts

M2M calc: `effectiveSellBasis = deliveredSellBasis - getFreightCost(tier)`

### Per-Penny Basis Risk

`Unpriced HTA Bushels × $0.01` = dollar change per cent of basis movement. E.g., 50K bu × $0.01 = $500/penny.

## Yahoo Finance Integration

### Symbol Construction

`{root}{monthCode}{2-digit year}.CBT` → e.g., `ZCK26.CBT` = Corn May 2026

Commodity → Root mapping: Corn→ZC, Soybeans→ZS, Wheat→ZW, Oats→ZO, Soybean Meal→ZM

Non-CBOT commodities (Barley, Milo, Cottonseed, Commodity Other) are skipped with an info message.

### Price Units — Critical

Yahoo Finance returns grain prices in **cents per bushel** (e.g., 460.5 for corn). The code divides by 100 to get dollars (4.605). **Soybean Meal is an exception** — it trades in $/ton and does NOT get divided.

The conversion map (`CENTS_PER_BUSHEL_COMMODITIES`) is in `yahooFinance.ts`. If a new grain commodity is added, it must be added to this map.

### Proxy

Cloudflare Worker at `worker/yahoo-proxy/index.js`. Forwards `?symbol=` to Yahoo Finance and adds CORS headers. Free tier (100K req/day). The proxy URL is stored in `useMarketDataStore.proxyUrl` and persists in localStorage.

**Historical mode**: The proxy also accepts `period1` and `period2` (Unix timestamps) + `interval=1d` for historical OHLCV data. Used by `historicalYahoo.ts` with continuous contract symbols (ZC=F, ZS=F, etc.) to fetch 10+ years of price data. Backwards compatible — original 5-day range behavior unchanged when period params are absent.

### Expired Contracts

Expired futures months (e.g., Corn Sep 2025 in March 2026) will fail to fetch. This is expected. The zero-price filter ensures they show "Unable to mark" instead of fake losses.

## Open-Meteo Integration

### Forecast API (Real-Time)

`https://api.open-meteo.com/v1/forecast` — free, no API key required.

Fetches daily data for 7 days: `precipitation_sum`, `temperature_2m_max`, `temperature_2m_min`, `soil_moisture_0_to_1cm`. Timezone: America/Chicago.

**Batch deduplication**: Locations within 0.25° lat/lon are deduplicated to avoid redundant fetches. Max 5 concurrent requests with retry logic.

**GDD formula**: `max(0, (tempMax + tempMin) / 2 - 10)` (base 10°C).

### Historical Archive API

`https://archive-api.open-meteo.com/v1/archive` — ERA5 reanalysis data from 1940-present.

Fetched in 2-year chunks, max 5 concurrent, gap-aware via IndexedDB `fetch-metadata` store. Fields: `precipitation_sum`, `temperature_2m_max`, `temperature_2m_min`.

## Entity Location Map Integration

### Nominatim Geocoding

`https://nominatim.openstreetmap.org/search` — free, requires User-Agent header (`GrainIntel/1.0`).

- US-only (`countrycodes=us`)
- Rate limit: 1 request/second (1100ms delay in batch mode)
- Batch geocode supports AbortController for cancellation
- CSV import: columns "Entity Name, Address" (or "Entity Name, City, State")

### Leaflet Map

- `leaflet` + `react-leaflet` packages
- Light tiles: OpenStreetMap / Dark tiles: CartoDB dark_all
- Icon fix required: default Leaflet marker icons need explicit import (webpack/vite strips them)

## Excel Template (Market Data)

Downloaded from Daily Inputs. Has 3-4 tabs:

| Tab | Columns | Notes |
|-----|---------|-------|
| **Sell Basis** | Commodity, Delivery Month, Basis, Futures Ref | Futures Ref auto-filled from iRely data |
| **In-Transit** | Commodity, Bushels | One row per commodity |
| **HTA-Paired** | Commodity, Bushels | One row per commodity |
| **Freight** | Contract Number, Commodity, Entity, Freight Term, Balance, Freight Tier | Only FOB/Pickup contracts (~170 rows). Tier letter A-L. Reference column shows tier costs. |

No Settlements tab — those come from Yahoo Finance fetch.

The parser (`parseMarketDataExcel.ts`) matches tabs by name keyword (case-insensitive) and columns flexibly. Missing tabs are skipped without error.

## Unpriced Exposure Logic

A contract is "unpriced" if:
- `unpricedQty > 0` (Basis contracts waiting for futures pricing) → "Futures Unpriced"
- Pricing type is HTA AND `balance > 0` (futures locked, basis floating) → "Basis Unpriced"

Signed exposure: +purchase, -sale. Net exposure = purchase - sale. Positive net = net long (exposed to price drops). Negative = net short (exposed to price increases).

## Data Validation

Anomalies tracked but non-blocking (warnings only, pipeline continues):
- Cash Price ≠ Futures + Basis (±$0.01 tolerance)
- Negative balance
- End date before start date
- Null counts for: futureMonth, futures, basis, cashPrice, freightTerm

Market data staleness: >24 hours since `lastUpdated` triggers stale warning.

## Alert Thresholds

Defined in `src/utils/alerts.ts`:
- Position swing: >50K bu day-over-day
- Unpriced urgent: ≤14 days to delivery
- Unpriced per commodity: >100K bu
- Net exposure per commodity: >75K bu
- Entity concentration: >25% of commodity volume
- Carry cost: >$500/day triggers warning
- Spread compression: >20% vs trailing average
- Outbound exceeds inbound: >20% monthly imbalance

## UI Conventions

- **Morning Brief KPIs are clickable** → navigate to source module with hover state
- **Lead KPI**: Unpriced Exposure (top-left on Morning Brief)
- **Module layout pattern**: Summary StatCards → AlertBadges → Chart → Detail Table
- **Sidebar**: Full width (w-56) on desktop, icon rail (w-14) on tablet, slide-out drawer on mobile. Per-module alert badges + blue unvisited dots.
- **Breadcrumbs**: `Home / [Group] / [Module]` shown on all modules except Morning Brief
- **Cross-module links**: "View in [Module] →" links at module bottoms for related navigation
- **Command Palette**: `Cmd+K` / `Ctrl+K` opens global search across modules, contracts, entities
- **Alert Drawer**: Bell icon in header with count badge. Click opens slide-out panel grouped by severity.
- **Guided empty state**: Ghost KPI preview shown when no data is loaded
- **Dark mode**: Tailwind `dark:` variants, `class="dark"` on `<html>`, print forces light mode
- **Commodity colors**: One color per commodity globally, never for semantic meaning
- **Print**: `.no-print` class hides interactive chrome (sidebar, header, command palette, sliders, cross-links)
- See `DESIGN.md` for full design token reference

## Component Conventions

- **StatCard**: KPI metric. Props: `label, value, numericValue?, formatValue?, delta?, deltaDirection? ('up'|'down'|'neutral'), colorClass?, size? ('default'|'hero')`. Use `size="hero"` for the lead KPI on each screen (renders `text-3xl`). Pass `numericValue` + `formatValue` to enable AnimatedNumber count-up.
- **AlertBadge**: Severity pill. Props: `level` (`critical`/`warning`/`info`/`ok`). NOT `severity`.
- **DataTable**: TanStack Table wrapper with sorting, sticky headers, dark mode. Props: `data, columns, footerRow?, compact?`. `compact=true` uses `py-1.5` rows (36px) vs default `py-2` (44px). First column gets left accent border on row hover via CSS group pattern.
- **AnimatedNumber**: Count-up span component. Props: `value, format, duration? (default 400ms), className?`. Uses cubic ease-out rAF loop. Respects `prefers-reduced-motion`. Guards against NaN values.
- **SegmentedControl**: Tabbed view switcher. Props: `segments: { key, label }[], activeKey, onChange, size?`. WAI-ARIA `role="tablist"`. `no-print` class.
- **AlertDrawer**: Slide-out panel from right. Props: `open, onClose, onNavigate`. Groups alerts by severity.
- **AlertBellButton**: Bell icon for header. Shows red badge with `criticalCount`. Uses `useGlobalAlerts`.
- **CommandPalette**: Modal overlay. Props: `open, onClose, onNavigate`. Searches modules, contracts, entities, actions.
- **Breadcrumb**: Navigation path. Props: `activeModule, activeTab?, onNavigate`. Hidden on Morning Brief.
- **CrossModuleLink**: Inline nav button. Props: `label, moduleId, onNavigate`. Arrow icon suffix.
- **InlineScenarioSlider**: Range input. Props: `label, value, min, max, step, onChange, formatValue?, defaultValue`. Shows reset when changed.
- Cards: `rounded-xl`. Buttons: `rounded-lg`. Progress bars: `rounded-full`.

## Commodity Colors

Used across all charts. Never repurpose for semantic meaning:
- Corn: `#EAB308`, Soybeans: `#22C55E`, Wheat: `#F59E0B`, Barley: `#3B82F6`
- Milo: `#A855F7`, Oats: `#14B8A6`, Soybean Meal: `#EC4899`, Cottonseed: `#F97316`

## Known Limitations

- **No real-time quotes**: Yahoo Finance provides end-of-day only. Real-time requires a paid data provider (P3 TODO).
- **No iRely API**: Data loaded via manual Excel export. API integration blocked by iRely access (P2 TODO).
- **Expired contracts can't be marked**: Yahoo Finance doesn't return prices for expired futures months. Zero-price settlements are filtered to prevent fake P&L. Must enter manually for historical view.
- **Organic threshold is hard-coded**: $3.00/bu in `filterContracts.ts`. If organic premiums change, this needs updating.
- **Freight tiers are fixed-step, not per-route**: Tiers A-L map to fixed $/bu costs (10c increments). No freight table by origin/destination. Excel dropdowns not supported by free SheetJS — traders type the letter manually with a reference column for guidance.
- **Single user**: No auth, no multi-user. State is per-browser via localStorage + IndexedDB.
- **CBOT month codes assume standard expiration**: No handling for early exercise or delivery.
- **Milo has no CBOT futures**: Skipped in Yahoo Finance fetch. Scenario sliders show $0 impact because all Milo contracts are fully Priced (no Basis or HTA exposure to model).
- **Weather requires entity locations**: Weather risk badges only work for entities with geocoded locations in `useEntityLocationStore`. Entities without locations show no weather data.
- **Historical correlation requires first fetch**: 2-year historical data takes ~20-30s to download on first use. Subsequent loads use cached IndexedDB data. Private browsing may block IndexedDB.
- **Soil moisture not in historical archive**: Open-Meteo ERA5 archive doesn't include soil moisture for bulk batch fetch. Drought classification uses precipitation z-score + temperature as proxy.
- **Entity name matching is exact**: Entity names from iRely must match geocoded names exactly (after trim + uppercase normalization). "JOHN SMITH" vs "John Smith" will match, but "JOHN SMITH INC" vs "JOHN SMITH" will not.

## Deployment

**GitHub Pages**: https://patchythegildedmoth.github.io/Grain-Intel/

Deploys automatically via GitHub Actions on push to `main`. The workflow builds with Vite and publishes the `dist/` folder. Takes ~1-2 minutes after push.

**Localhost** (`npm run dev`): Always up-to-date with current source. Vite hot-reloads on save.

To deploy: commit changes, push to main. GitHub Actions handles the rest.

## Deploy Configuration (configured by /setup-deploy)
- Platform: GitHub Pages
- Production URL: https://patchythegildedmoth.github.io/Grain-Intel/
- Deploy workflow: .github/workflows/deploy.yml (auto-deploy on push to main)
- Deploy status command: gh run list --workflow=deploy.yml --limit=1
- Merge method: merge (direct push to main)
- Project type: web app (SPA)
- Post-deploy health check: https://patchythegildedmoth.github.io/Grain-Intel/

### Custom deploy hooks
- Pre-merge: npm run build && npm run test
- Deploy trigger: automatic on push to main
- Deploy status: gh run list --workflow=deploy.yml --limit=1
- Health check: curl -sf https://patchythegildedmoth.github.io/Grain-Intel/ -o /dev/null -w "%{http_code}"

## Module Roadmap

| # | Module | Category | Status | Notes |
|---|--------|----------|--------|-------|
| 1 | Entity Location Map | Maps | Done | Leaflet + Nominatim geocoding, CSV bulk import |
| 2 | Freight Tier Heatmap | Maps | Done | Integrated into Entity Map as concentric rings |
| 3 | Delivery Flow Map | Maps | Not Started | Animated lines showing inbound vs outbound grain flow by geography. Line thickness = bushel volume. Filters: commodity, delivery month, freight term. |
| 4 | USDA Report Integration | Market Data | Partial | Crop Progress tab done (NASS API). WASDE countdown, Export Sales, and historical report impact still not started. |
| 5 | Basis History Charts | Market Data | Not Started | Sparklines on Basis Spread module using 365-day history already in localStorage. Current year vs prior year overlay. |
| 6 | Futures Curve Visualization | Market Data | Not Started | Full futures curve (nearby through deferred) per commodity. Dual axis: price left, net bushels right. Shows carry/inversion alongside exposure. |
| 7 | Weather Dashboard | Market Data | Done | Open-Meteo API, 4-tab module, risk badges, historical correlation engine with IndexedDB |
| 8 | Historical P&L Trend | Analytics | Not Started | Daily/weekly/monthly P&L from M2M snapshots (already in store). Per-commodity decomposition, futures vs basis split. 7d/30d/90d/YTD toggles. |
| 9 | Contract Aging Report | Analytics | Not Started | Gantt-style timeline from created date to delivery end. Flag unusually long-open contracts. Color: green/amber/red by age. |
| 10 | "What Changed" Diff | Analytics | Not Started | Compare today's upload to previousSnapshot. Show new/completed contracts, balance changes >5K bu, pricing type changes. Morning Brief summary card. |
| 11 | Alerts Timeline | Analytics | Not Started | Log every alert with timestamps. Distinguish "active 3 days" from "new today". Persist in localStorage. Trend detection (worsening vs improving). |
| 12 | Customizable Morning Brief | UX | Not Started | Drag-and-drop KPI card ordering. Layout preferences in localStorage. Presets: "Merchandiser View", "Management View". |
| 13 | Commodity Drill-Down | UX | Not Started | Click any commodity name anywhere to open single-commodity detail view (position, exposure, basis, timeline, top entities on one page). |
| 14 | Keyboard Shortcuts & Quick Nav | UX | Done | Command Palette (Cmd+K), breadcrumbs, cross-module links, Cmd+1-9 |
| 15 | Notification Badges | UX | Done | Per-module alert counts + unvisited blue dots |
| 16 | Print / PDF Morning Report | UX | Not Started | One-click PDF of Morning Brief + key charts. KPI cards, critical alerts, net position chart, unpriced summary, basis highlights. 1-2 page executive format. |
| 17 | Automated iRely Import | Data Integration | Not Started | Blocked by iRely API access. Options: Power Automate, Node file watcher, scheduled task. |
| 18 | Ethanol / DDG / Soybean Oil | Data Integration | Not Started | Crush margin (soybeans vs meal + oil), ethanol margin (corn vs ethanol + DDG revenue). |
| 19 | Peer Basis Comparison | Data Integration | Not Started | Your posted basis vs local market average. Sources: DTN, Barchart, or manual competitor tracking. |

**Priority TODOs (not in roadmap above):**
- P2: Unit tests for all analytics hooks (Vitest infrastructure in place, zero hook test coverage)
- P3: Real-time streaming quotes (requires paid data provider — Polygon.io, Databento, etc. Current Yahoo Finance end-of-day is adequate for daily workflow)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
