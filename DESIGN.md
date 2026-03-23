# Grain-Intel Design System

## Typography

**Font family:** Inter (system-ui, -apple-system fallback)

| Use | Class | Example |
|-----|-------|---------|
| Page title | `text-2xl font-bold` | "Morning Brief" |
| Section heading | `text-lg font-semibold` | "Corn — Net Position" |
| Card label | `text-xs font-medium uppercase tracking-wide` | "UNPRICED EXPOSURE" |
| Body / table cell | `text-sm` | Contract details |
| Small / helper | `text-xs` | Timestamps, footnotes |
| Monospace data | `font-mono` | Dollar amounts in tables |

**Weight usage:** bold (titles, KPI values) → semibold (section headers) → medium (labels, nav) → regular (body)

---

## Color Palette

### Commodity Colors

Used across **all** charts, badges, and commodity indicators. Never use these for non-commodity meaning.

| Commodity | Hex | Tailwind | CSS Variable |
|-----------|-----|----------|--------------|
| Corn | #EAB308 | yellow-500 | `--color-corn` |
| Soybeans | #22C55E | green-500 | `--color-soybeans` |
| Wheat | #F59E0B | amber-500 | `--color-wheat` |
| Barley | #3B82F6 | blue-500 | `--color-barley` |
| Milo | #A855F7 | purple-500 | `--color-milo` |
| Oats | #14B8A6 | teal-500 | `--color-oats` |
| Soybean Meal | #EC4899 | pink-500 | `--color-soybean-meal` |
| Cottonseed | #F97316 | orange-500 | `--color-cottonseed` |
| Commodity Other | #6B7280 | gray-500 | `--color-commodity-other` |

### Semantic Colors

| Meaning | Light Text | Dark Text | Light BG | Dark BG |
|---------|-----------|-----------|----------|---------|
| Success / Long | `text-green-600` | `text-green-400` | `bg-green-100` | `bg-green-900/30` |
| Danger / Short | `text-red-600` | `text-red-400` | `bg-red-100` | `bg-red-950` |
| Warning | `text-amber-600` | `text-amber-400` | `bg-amber-100` | `bg-amber-900/30` |
| Info | `text-blue-600` | `text-blue-400` | `bg-blue-100` | `bg-blue-900` |
| Neutral | `text-gray-700` | `text-gray-300` | — | — |
| Muted | `text-gray-500` | `text-gray-400` | — | — |

### Surface Colors

| Surface | Light | Dark |
|---------|-------|------|
| Page background | `bg-gray-100` | `bg-gray-950` |
| Card / panel | `bg-white` | `bg-gray-800` |
| Sidebar / secondary | `bg-gray-50` | `bg-gray-900` |
| Table header | `bg-gray-50` | `bg-gray-800` |
| Table footer | `bg-gray-100` | `bg-gray-800` |
| Border | `border-gray-200` | `border-gray-700` |

---

## Spacing

| Context | Token | Value |
|---------|-------|-------|
| Card padding | `p-4` | 16px |
| Page section padding | `p-6` | 24px |
| Grid gap | `gap-4` | 16px |
| Small grid gap | `gap-3` | 12px |
| Vertical section flow | `space-y-6` | 24px |
| Vertical item flow | `space-y-4` | 16px |
| Sidebar nav spacing | `space-y-1` | 4px |
| Button padding | `px-3 py-1.5` | 12px / 6px |
| Nav item padding | `px-3 py-2.5` | 12px / 10px |

---

## Layout

### App Shell

- Full screen: `flex flex-col h-screen`
- Header: `h-14 shrink-0` with `px-4 gap-4`
- Sidebar: `w-56 shrink-0` (desktop), `w-14` (tablet icon rail)
- Main content: `flex-1 overflow-y-auto`
- Footer: `h-7 shrink-0`

### Grid Patterns

| Pattern | Classes |
|---------|---------|
| KPI cards (4-up) | `grid grid-cols-2 md:grid-cols-4 gap-4` |
| KPI cards (3-up) | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` |
| Two-column layout | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| Three-column layout | `grid grid-cols-1 md:grid-cols-3 gap-4` |

### Border Radius

| Element | Class |
|---------|-------|
| Cards / panels | `rounded-xl` |
| Buttons / badges | `rounded-lg` |
| Progress bars / dots | `rounded-full` |
| Table container | `rounded-lg` |

---

## Components

### StatCard

KPI metric card with optional delta indicator.

```
Props: label, value, delta?, deltaDirection? ('up'|'down'|'neutral'), colorClass?
Container: rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4
Label:     text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide
Value:     text-2xl font-bold text-gray-900 dark:text-gray-100
Delta:     text-sm font-medium, green for up, red for down
```

### AlertBadge

Severity indicator pill.

```
Props: level ('critical'|'warning'|'info'|'ok'), children
Container: inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
Critical:  bg-red-100 text-red-800 border-red-200 / dark: bg-red-900 text-red-200 border-red-800
Warning:   bg-amber-100 text-amber-800 border-amber-200 / dark: bg-amber-900 text-amber-200 border-amber-800
Info:      bg-blue-100 text-blue-800 border-blue-200 / dark: bg-blue-900 text-blue-200 border-blue-800
Ok:        bg-green-100 text-green-800 border-green-200 / dark: bg-green-900 text-green-200 border-green-800
```

### DataTable

TanStack React Table wrapper.

```
Container:   overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg
Header row:  bg-gray-50 dark:bg-gray-800 sticky top-0
Header cell: px-3 py-2.5 text-xs font-semibold uppercase tracking-wider
Body row:    divide-y divide-gray-100 dark:divide-gray-800, hover:bg-gray-50 dark:hover:bg-gray-800/50
Body cell:   px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap
Footer:      bg-gray-100 dark:bg-gray-800 font-semibold
Empty:       p-8 text-center text-gray-400 dark:text-gray-500
```

### ExportButton

Secondary action button for CSV/Excel/print export.

```
Container: px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
Border:    border border-gray-300 dark:border-gray-600
Fill:      bg-white dark:bg-gray-800
Hover:     hover:bg-gray-50 dark:hover:bg-gray-700
Icon:      h-4 w-4 with gap-1.5
```

---

## Module Layout Pattern

Every analytics module follows this top-to-bottom hierarchy:

1. **Summary row** — 3-5 StatCards, most important at left
2. **Alert badges** — Red/amber issues immediately below summary
3. **Chart** — Visual pattern recognition (bar/line/pie)
4. **Detail table** — Sortable contract-level data below fold

---

## Dark Mode

- Toggle via `dark:` Tailwind variants throughout
- Stored in `localStorage` and applied as `class="dark"` on `<html>`
- All components support both themes
- Charts use custom dark theme colors for axes, grid, tooltips
- Print stylesheet forces light mode

---

## Print

- Hide elements with `.no-print` class
- Sidebar and header hidden
- Force light color scheme
- Table font reduced to 10px
- Main content full-width

---

## Navigation

### Sidebar Groups
- **Daily Workflow**: Morning Brief, Daily Inputs
- **Position & Risk**: Net Position, Unpriced Exposure, Price-Later, Mark-to-Market
- **Analytics**: Delivery Timeline, Basis Spread, Customer Concentration, Risk Profile
- **Tools**: Scenario Panel, Data Health

### Active State
- Active: `bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`
- Inactive hover: `hover:bg-gray-200 dark:hover:bg-gray-800`
- Icons: Emoji-based, `text-base`

### Routing
- Hash-based: `#morning-brief`, `#net-position`, etc.
- Supports query params for filtered navigation: `#delivery-timeline?filter=overdue`
