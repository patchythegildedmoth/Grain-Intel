# Changelog

All notable changes to this project will be documented in this file.

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
