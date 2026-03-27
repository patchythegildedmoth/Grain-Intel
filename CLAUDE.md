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
2. **Scan Morning Brief** → KPI cards are clickable, link to source modules
3. **Drill into red/amber alerts** → investigate overdue contracts, net short positions
4. **Go to Daily Inputs** → click "Fetch Settlements" to pull CBOT prices via Yahoo Finance
5. **Upload basis Excel** (Sell Basis, In-Transit, HTA-Paired, Freight tabs)
6. **Click Save All** → persists market data
7. **Check Mark-to-Market** → see book P&L, per-commodity breakdown
8. **Print Morning Brief** for team meeting (print-optimized layout)

Order of Steps 4-5 doesn't matter — settlements and basis are independent and don't overwrite each other.

## Architecture

React 19 SPA. Vite + TypeScript + Tailwind CSS v4 + Zustand + TanStack Table + Recharts.

### Data Pipeline

```
iRely Excel → parseExcel(buffer) → filterContracts() → validateData() → transformContracts()
    ↓
useContractStore (Contract[] with derived fields)
    ↓
12 analytics hooks (pure useMemo, no side effects)
    ↓
12 module components render results
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

Used by: `AlertDrawer` (slide-out panel from right), `AlertBellButton` (red badge in header).

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
- **Sidebar**: Full width (w-56) on desktop, icon rail (w-14) on tablet, slide-out drawer on mobile
- **Guided empty state**: Ghost KPI preview shown when no data is loaded
- **Dark mode**: Tailwind `dark:` variants, `class="dark"` on `<html>`, print forces light mode
- **Commodity colors**: One color per commodity globally, never for semantic meaning
- See `DESIGN.md` for full design token reference

## Component Conventions

- **StatCard**: KPI metric. Props: `label, value, delta?, deltaDirection? ('up'|'down'|'neutral'), colorClass?`
- **AlertBadge**: Severity pill. Props: `level` (`critical`/`warning`/`info`/`ok`). NOT `severity`.
- **DataTable**: TanStack Table wrapper with sorting, sticky headers, dark mode
- **SegmentedControl**: Tabbed view switcher. Props: `segments: { key, label }[], activeKey, onChange, size?`. WAI-ARIA `role="tablist"`. `no-print` class.
- **AlertDrawer**: Slide-out panel from right. Props: `open, onClose, onNavigate`. Groups alerts by severity.
- **AlertBellButton**: Bell icon for header. Shows red badge with `criticalCount`. Uses `useGlobalAlerts`.
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

## In-Progress Plan (Remaining Phases)

The plan at `.claude/plans/cozy-humming-coral.md` has 4 remaining phases (Phases 1 and 3 are complete):

| Phase | Feature | Status | Dependencies |
|-------|---------|--------|-------------|
| 4 | Command Palette (Cmd+K search) | Not started | Standalone |
| 6 | Breadcrumbs + cross-module links | Not started | Phase 1 ✅ |
| 7 | Inline Scenario Sliders in M2M/Exposure | Not started | Phase 1 ✅ |
| 9 | Sidebar badges + unvisited module dots | Not started | Phase 3 ✅ |

All dependencies are met. New sessions can pick up from Phase 4.
