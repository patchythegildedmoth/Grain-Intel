# Changelog

All notable changes to this project will be documented in this file.

## [1.2.3.0] - 2026-04-01

### Changed
- **WCAG AA contrast fix** — footer text upgraded from `--text-muted` to `--text-secondary` for 4.5:1 contrast ratio on small text
- **Touch target improvements** — header bell button, re-upload button, and Cmd+K search bar paddings increased to meet 36px minimum tap target
- **Brand header bump** — "Ag Source Grain Intelligence" H1 increased from 18px to 20px for visual weight
- **Collapsible alert lists** — Mark-to-Market alerts and Delivery Timeline past-due sections now show 3 items by default with a "Show more" toggle, reducing visual noise on data-heavy screens
- **Improved empty states** — Weather and Crop Progress panels on Market Factors now show actionable buttons and navigation breadcrumbs instead of plain text
- **DESIGN.md typography correction** — updated from "three-font stack" to "two-font stack" reflecting actual usage (DM Sans body + Geist Mono data)

## [1.2.2.0] - 2026-04-01

### Fixed
- **Customer profitability freight adjustment** — FOB/Pickup sale contracts now have freight cost added back to locked basis before computing margin, using the same tier lookup (`freightTiers[contractNumber] ?? contract.freightTier`) already used by Mark-to-Market; previously, FOB customers appeared artificially unprofitable because their lower FOB basis was compared directly against a delivered buy basis

### Changed
- **Customers page layout** — replaced single long-scroll page with a `SegmentedControl` (Concentration / Profitability tabs); Concentration tab has the volume donut chart and concentration table; Profitability tab has four summary stat cards (customers w/ history, avg margin/bu, negative margin count, completed volume) and the profitability table; page header shortened to "Customers"

## [1.2.1.1] - 2026-03-31

### Fixed
- **SVG nav icons restored** — TopNavBar and SectionNav now use SVG icons from SidebarIcons.tsx instead of emojis; the nav restructure wrote fresh components that never adopted the SVG icons from the design delight pass
- **New group-level SVG icons** — Positions (clipboard), Market (dollar), Market Factors (globe), Tools (wrench) replace emoji in the top nav bar
- **Market Factors tab icons** — This Week (calendar), Weather (sun), Seasonal (line chart), Crop Progress (seedling) replace emoji in the section nav

## [1.2.1.0] - 2026-03-31

### Added
- **Historical Analogs z-score context** — "Matching against current conditions" header under the analog table shows current precip SD, temp SD, raw values, and event type; `Precip SD` and `Temp SD` columns added to the table so each row shows the historical year's deviation alongside raw values
- **`filterRollDays` utility** — generic `filterRollDays<T>` in `src/utils/isoWeek.ts`; compares each record against the last accepted value (not the previous raw record) to correctly handle consecutive roll days; replaces duplicated inline logic in SeasonalPatternsTab and ThisWeekTab
- **NASS concurrency limiter** — `usdaNass.ts` now caps NASS requests at 6 in-flight simultaneously; prevents browser connection queue exhaustion on first Crop Progress load (24 requests)

### Fixed
- **`SectionNav` React 19 concurrent mode** — `visitedRef.current.add(activeModule)` moved into `useEffect`; mutating a ref during render is unsafe when React may call the render function multiple times before committing
- **NASS API key input** — changed from `type="text"` to `type="password"` with `autoComplete="off"`; prevents the key from appearing in plaintext and stops browser autofill
- **ThisWeekTab roll-day filter bug** — old inline filter compared against `sorted[i-1]`, which could admit a second consecutive roll-day record; fixed by using shared `filterRollDays` (compares against last accepted)

## [1.2.0.0] - 2026-03-31

### Added
- **Market Factors hub** — new top-level navigation group with 4 sub-tabs: This Week, Weather, Seasonal Patterns, Crop Progress
- **Top navigation bar** — horizontal 4-group tab bar (Positions · Market · Market Factors · Tools) replaces the vertical sidebar; group-level alert rollup dots; arrow-key accessible
- **SectionNav** — secondary horizontal module rail; renders module links for Positions/Market/Tools, and hub sub-tabs for Market Factors
- **This Week tab** — 3-panel morning snapshot: weather risk severity, corn seasonal vs 5-year avg (signed %), crop condition Good+Excellent vs prior year; each panel navigates to its full tab
- **Seasonal Patterns tab** — Recharts line chart with 5-year mean ± 1 SD bands and current-year actuals; Corn, Soybeans, Wheat; ISO week x-axis with current week highlighted; roll-day discontinuity filter
- **Crop Progress tab** — USDA NASS weekly crop condition data; Corn, Soybeans, Winter Wheat; national + IL/IA/MN/NE/IN; div-based bar chart with current/prior year/5yr avg; per-metric Retry on failure
- **USDA NASS API key** — stored in Daily Inputs (same pattern as proxy URL); feeds Crop Progress tab
- **`/usda-nass` worker route** — Cloudflare Worker now proxies NASS QuickStats in addition to Yahoo Finance; NASS API key passed via `X-NASS-Api-Key` header (never in URL logs); Origin allowlist (prod + localhost)
- **`crop-progress` IndexedDB store** — added to `grain-intel-historical` DB (version 2); 7-day TTL cache with partial-fetch tracking
- **`src/utils/isoWeek.ts`** — shared `getISOWeek()` + `parseLocalDate()` utility; eliminates triplicated code; `parseLocalDate` prevents timezone-induced week shifts for users west of UTC

### Changed
- Sidebar replaced by TopNavBar + SectionNav; `NAV_ITEMS` export preserved for Command Palette and Cmd+1–9 shortcuts
- `#weather` hash now resolves to Market Factors hub with Weather tab active (backward compatible); bookmarks rewritten to `#market-factors`
- Breadcrumb group labels updated: "main" → "Positions", new "Market Factors" group

### Fixed
- Roll-day filter in SeasonalPatternsTab now compares against last *accepted* price (not `sorted[i-1]`), preventing consecutive roll-day records from passing through
- `ThisWeekTab` async effects now have cancellation guards — prevents stale `setState` on fast tab switches
- Per-metric Crop Progress Retry sends 6 targeted requests instead of re-fetching all 24; partial cache state correctly persists across page reloads with amber banner

## [1.1.1.0] - 2026-03-30

### Added
- `AnimatedNumber` component: cubic ease-out count-up animation (400ms) for all KPI values on Morning Brief, triggered on mount and value change
- `StatCard` hero size variant (`size="hero"`, `text-3xl`) — Unpriced Exposure is now the visual anchor on Morning Brief
- `DataTable` compact mode prop (`compact?: boolean`): 36px rows (`py-1.5`) vs default 44px for dense data views
- Left accent border on DataTable row hover: first column gets `border-[var(--accent)]` via CSS group pattern
- Page transition animation: 150ms fade+slide-up on every module switch via `key={activeModule}` in AppShell
- Morning Brief 9-card stagger: 50ms delay increments across all KPI and M2M cards (0–400ms)
- Delta arrow bounce-in animation (`animate-delta-in`, 200ms) on all StatCard delta rows
- StatCard hover lift: `hover:-translate-y-px hover:shadow-md` with explicit transition properties
- Full design research corpus: 15 site reviews (Koyfin, TradingView, Stripe, Robinhood, Linear, Notion, Vercel, Planetscale, Mixpanel, Plausible, Grafana, Observable, Shadcn, Radix, Tailwind UI) + SCORECARD, COMPARISON, SYNTHESIS, DELIGHT_PLAYBOOK, DESIGN_BRIEF

### Fixed
- `AnimatedNumber` NaN guard: `safeValue()` prevents `$NaN`/`NaN%` when hooks return `0/0` (e.g. hedge ratio with no contracts)
- `AnimatedNumber` interrupted animation: `prevValueRef` now updates continuously in the rAF loop so mid-flight cancellation starts the next animation from the current displayed position, not from the last completed end value
- `AnimatedNumber` respects `prefers-reduced-motion`: checks `window.matchMedia` at module load and jumps to final value immediately for vestibular disorder accessibility
- Print layout: `@media print { animation: none }` prevents cards from printing at partial opacity when `Cmd+P` is pressed during the 300ms Morning Brief stagger
- `prefers-reduced-motion`: CSS `@media` block added for all three animation utility classes (`animate-page-transition`, `animate-card-in`, `animate-delta-in`)
- Upload card height: reduced from `min-h-[calc(100vh-4rem)]` (pushed ghost preview below fold) to `min-h-[42vh]`
- `transition-all` on StatCard replaced with `transition-[transform,box-shadow,border-color]` — prevents layout thrashing on properties not intended to animate
- Ghost card placeholder used `text-[var(--border-default)]` (semantically wrong border token on text) — fixed to `text-[var(--text-muted)]`
- Orphan words on mobile: `text-balance` added to upload headings prevents single-word last lines at 375px viewport
- Morning Brief hover borders changed from hardcoded `blue-300` to `var(--accent)` design token

### Changed
- `StatCard` values now use `font-data` (Geist Mono, `tabular-nums`) for non-jittery number rendering
- Morning Brief KPI hover borders unified to `var(--accent)` token (previously `blue-300`/`blue-600`)
- DESIGN.md fully rewritten to match actual implementation (CSS token system, three-font stack)

## [1.1.0.0] - 2026-03-30

### Changed
- Replaced hardcoded Tailwind gray palette with CSS custom property design tokens (light + dark mode)
- Switched body font from Inter to DM Sans
- Added Plus Jakarta Sans as display/heading font
- Added Geist Mono as data/tabular font with font-variant-numeric: tabular-nums
- Migrated all 14 module components to token-based color system
- Migrated all 8 shared components (StatCard, AlertBadge, DataTable, SegmentedControl, ExportButton, Breadcrumb, CrossModuleLink, InlineScenarioSlider)
- Migrated all 7 layout components (AppShell, Sidebar, CommandPalette, AlertDrawer, FileUpload, DarkModeToggle, ErrorBoundary)
- Updated App.tsx welcome screen with new design tokens
- Dark mode now uses deep navy (#0B1120) instead of gray-950
- Card border-radius reduced from rounded-xl to rounded-lg
- Added shadow tokens (sm/md/lg) for elevation hierarchy
- StatCard values now use tabular-nums mono font for aligned numbers

### Added
- CSS custom properties for full color system: bg-base, bg-surface, bg-surface-raised, bg-inset, border-default, border-subtle, text-primary, text-secondary, text-muted, accent, positive, negative, warning
- Google Fonts preconnect and loading for DM Sans + Plus Jakarta Sans
- Geist Mono web font loading via jsDelivr CDN
- .font-display and .font-data utility classes in index.css
- DESIGN.original.md backup of the original design system
