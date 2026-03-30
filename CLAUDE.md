# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Grain Trading Intelligence Module for **Ag Source LLC**. A React SPA that parses iRely i21 contract exports (Excel), fetches CBOT futures prices via Yahoo Finance, and computes daily trading analytics across 13 modules including Morning Brief. Used by the grain merchandising team each morning to assess position, exposure, P&L, freight efficiency, and risk before trading.

## Commands

```bash
npm run dev          # Vite dev server with hot reload (port 5173)
npm run build        # TypeScript check + Vite production build
npm run test         # Vitest single run (93 tests across 6 files)
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
8. **Print Morning Brief** for team meeting (print-optimized layout)

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

### Two Zustand Stores

- **useContractStore** (`grain-intel-store` in localStorage) — iRely contract data, validation results. Only `previousSnapshot` persists; contracts reload fresh each session (intentional — forces data freshness).
- **useMarketDataStore** (`grain-intel-market-data` in localStorage) — daily market inputs (sell basis, settlements, in-transit, HTA-paired, freight tiers), 365-day rolling history (auto-pruned), M2M snapshot history for sparkline trends, Yahoo Finance proxy URL. History keyed by date string (e.g., "2026-03-20").

### Hook Pattern

Every analytics hook follows: subscribe to store selectors → compute in `useMemo` → return structured output (summaries + details + alerts). All hooks are pure — no side effects, no fetching.

**13 hooks total:**
- `useNetPosition`, `useUnpricedExposure`, `useDeliveryTimeline`, `useBasisSpread`, `useCustomerAnalysis`, `useRiskProfile` — original 6 analytics modules
- `useScenario` — What-If scenario calculations
- `useDataHealth` — data validation stats
- `usePriceLaterExposure` — carry cost on Basis contracts, per-penny basis risk on HTA
- `useMarkToMarket` — orchestrates M2M (calls resolveContractM2M → aggregateM2M → generateM2MAlerts)
- `useFreightEfficiency` — freight tier analysis, margin recovery, cost trends
- `useDailyInputScaffold` — auto-generates Daily Inputs form rows from open contracts
- `useGlobalAlerts` — aggregates alerts from all hooks into a single prioritized feed

### M2M Architecture (Decomposed)

The Mark-to-Market calculation is split across 4 pure utility files for testability:

```
useMarkToMarket.ts (hook — thin orchestrator, 63 lines)
  ├── resolveContractM2M.ts  — per-contract M2M resolution (pricing type switch, freight adjustment)
  ├── aggregateM2M.ts        — groups into commodity summaries, FM breakdowns, exposure waterfall
  └── m2mAlerts.ts           — generates severity-tagged alerts with entity context
      └── m2mCalc.ts         — core formulas (calcPricedPurchaseM2M, calcBasisM2M, etc.)
```

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

4 largest modules use `SegmentedControl` component to eliminate long-scroll layouts:

| Module | Tabs | Default |
|--------|------|---------|
| NetPositionDashboard | Overview · Charts · Tables | Overview |
| MarkToMarket | Executive Summary · P&L by Month · Contract Detail | Executive Summary |
| UnpricedExposureReport | Summary · By Futures Month · Contracts | Summary |
| DeliveryTimeline | Overview · This Month · Next Month | Overview |

Summary StatCards remain visible above tabs. Tab state is local `useState` (not persisted).

### Store Versioning

Both Zustand stores use `version` + `migrate` for schema evolution:
- **useContractStore** v1: ensures `exposure` field on `previousSnapshot`
- **useMarketDataStore** v1: migrates `freightCosts` → `freightTiers`, adds missing fields

Both stores have `onRehydrateStorage` error handlers that clear corrupted localStorage.

### Routing

Hash-based SPA routing via `window.location.hash`. Supports query params for filtered navigation (e.g., `#delivery-timeline?filter=overdue`).

Module IDs (13 total): `morning-brief`, `net-position`, `unpriced-exposure`, `delivery-timeline`, `basis-spread`, `customer-concentration`, `risk-profile`, `daily-inputs`, `price-later`, `mark-to-market`, `freight-efficiency`, `scenario`, `data-health`.

Sidebar groups: **main** (Morning Brief through Risk Profile), **market** (Daily Inputs, Price-Later, M2M, Freight Efficiency), **tools** (Scenario, Data Health).

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

### Expired Contracts

Expired futures months (e.g., Corn Sep 2025 in March 2026) will fail to fetch. This is expected. The zero-price filter ensures they show "Unable to mark" instead of fake losses.

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

- **StatCard**: KPI metric. Props: `label, value, delta?, deltaDirection? ('up'|'down'|'neutral'), colorClass?`
- **AlertBadge**: Severity pill. Props: `level` (`critical`/`warning`/`info`/`ok`). NOT `severity`.
- **DataTable**: TanStack Table wrapper with sorting, sticky headers, dark mode
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
- **Single user**: No auth, no multi-user. State is per-browser via localStorage.
- **CBOT month codes assume standard expiration**: No handling for early exercise or delivery.
- **Milo has no CBOT futures**: Skipped in Yahoo Finance fetch. Scenario sliders show $0 impact because all Milo contracts are fully Priced (no Basis or HTA exposure to model).

## Completed Plan

The interactive navigation plan at `.claude/plans/cozy-humming-coral.md` is fully implemented. All 6 phases shipped:

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Segmented Controls (4 modules) | ✅ Complete |
| 3 | Alert Drawer + Global Alert System | ✅ Complete |
| 4 | Command Palette (Cmd+K search) | ✅ Complete |
| 6 | Breadcrumbs + Cross-Module Links | ✅ Complete |
| 7 | Inline Scenario Sliders (M2M) | ✅ Complete |
| 9 | Sidebar Badges + Unvisited Dots | ✅ Complete |

## Deployment

**GitHub Pages**: https://patchythegildedmoth.github.io/Grain-Intel/

Deploys automatically via GitHub Actions on push to `main`. The workflow builds with Vite and publishes the `dist/` folder. Takes ~1-2 minutes after push.

**Localhost** (`npm run dev`): Always up-to-date with current source. Vite hot-reloads on save.

To deploy: commit changes, push to main. GitHub Actions handles the rest.

## Module Roadmap
See `docs/DASHBOARD_MODULES_PLAN.md` for the full feature plan and current status.
- Check the status tracker table at session start
- Work on the current 🟡 module or ask which to start next
- Update the tracker status and Notes column when completing work
