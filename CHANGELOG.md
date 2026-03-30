# Changelog

All notable changes to this project will be documented in this file.

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
