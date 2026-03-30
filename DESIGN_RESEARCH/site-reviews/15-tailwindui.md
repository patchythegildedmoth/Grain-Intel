# Tailwind UI (Tailwind Plus)

> "Build your next idea even faster." Premium component library from the Tailwind CSS team. 500+ UI blocks across Marketing, Application UI, and Ecommerce categories. Site templates (Oatmeal, Spotlight, Radiant). Catalyst UI kit with full React + Next.js components: Button, Input, Table, Sidebar, Checkbox, Combobox, Radio, Switch, Badge, Pagination. All built with Tailwind CSS, Headless UI, and React.

**URL:** https://tailwindui.com (now plus.tailwindcss.com)
**Category:** Premium UI Component Library
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                        |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| Information Hierarchy          | 9     | Best-in-class page-level hierarchy with clear hero/content/detail zones |
| Data Density                   | 5     | Marketing-first; application UI blocks are comfortable, not dense |
| Navigation                     | 9     | Sidebar, stacked, multi-column layouts with responsive breakpoints |
| Summary vs Detail              | 7     | Stats blocks and detail pages exist but are not tightly linked |
| Typography                     | 9     | Exquisite type pairings, size scales, and responsive scaling  |
| Color Usage                    | 8     | Controlled palettes with clear semantic assignments; strong dark variants |
| White Space                    | 8     | Strategic use of generous space balanced with content zones    |
| Delight & Micro-interactions   | 7     | Headless UI transitions are smooth; Catalyst adds hover/focus polish |
| Tables & Tabular Data          | 8     | Catalyst Table component with sort, sticky headers, responsive stacking |
| Charts & Data Visualization    | 4     | Stats blocks only; no chart components shipped                |

**Average: 7.4**

---

## Key Observations

### Information Hierarchy
Tailwind UI's application shell templates demonstrate professional-grade hierarchy. The stacked layout pattern places a global header (logo + nav + user menu), then a page header (title + action buttons), then content. Each zone has distinct background treatment: the global header uses a dark or branded surface, the page header uses a subtle separator line, and the content area is plain white or gray-50. This three-band approach makes it immediately clear where you are in the hierarchy.

### Data Density
Tailwind UI targets SaaS products and marketing sites, not data terminals. Application UI blocks (form layouts, detail pages, list views) use generous padding. The stats blocks show 3-4 metrics in a row with large type and supporting text -- readable but not dense. For a grain trading dashboard where 10+ metrics need to be visible simultaneously, the default density would need significant compression. The Catalyst Table component is the densest offering, with compact rows and minimal cell padding.

### Navigation
This is a major strength. Tailwind UI ships multiple navigation patterns: sidebar with icon + text, sidebar with collapsible groups, top navigation with dropdown menus, breadcrumb trails, tab bars, and stacked layouts. The sidebar pattern includes a mobile-responsive slide-out drawer with backdrop overlay and transition animations. The multi-column layout (sidebar + main + detail panel) is pre-built as a shell. Each pattern includes full responsive behavior from mobile through wide desktop.

### Summary vs Detail
Stats blocks present summary metrics (total subscribers, total revenue, average rate) in a horizontal row with supporting deltas. Detail pages show a full record with sections (profile info, activity log, settings). However, these are separate blocks -- there is no built-in click-to-drill pattern connecting a stat card to its detail view. The stats component and the detail page exist independently. Grain Intel would need to wire the navigation between them, but the visual patterns are strong references.

### Typography
Tailwind UI uses Inter as the default with fallback to the system stack. The type scale is responsive: headings that are `text-4xl` on desktop step down to `text-2xl` on mobile via `sm:` / `lg:` breakpoints. Weight pairs are intentional -- a `font-semibold` heading with a `font-normal` description beneath it, or a `font-bold` stat value with a `font-medium` label. Leading (line-height) is tuned per size: tighter on large headings (`leading-tight`), looser on body text (`leading-relaxed`). The result is typographically confident pages that feel designed, not generated.

### Color Usage
Palette discipline is the hallmark. Marketing templates use 2-3 colors maximum: a primary brand color, a neutral gray scale, and one accent for CTAs. Application UI blocks add semantic colors: green badges for "Active", red for "Overdue", amber for "Pending". The Catalyst UI kit defines color via a `color` prop that maps to Tailwind's palette: `<Badge color="lime">Active</Badge>`. Dark mode variants are shipped for every block, using `dark:` classes with carefully chosen surface and text colors that maintain contrast ratios.

### White Space
Tailwind UI uses white space strategically rather than uniformly. Marketing sections have massive vertical padding (`py-24 sm:py-32`) to create section breaks. Application UI uses tighter spacing (`py-6`, `px-4 sm:px-6 lg:px-8`) but still generous compared to data tools. The key insight is variable density: the page header zone is airy (large title, breathing room), while the table content zone below is compact (tight rows, minimal padding). This variable density signals "context" vs "data" spatially.

### Delight & Micro-interactions
Headless UI provides the transition foundation: `Transition` components wrap menus, dialogs, and slide-overs with configurable enter/leave animations. Typical patterns: fade + scale for dialogs, slide from edge for side panels, fade + Y-translate for dropdown menus. Duration is fast (150-200ms). The Catalyst UI kit adds subtle hover effects on table rows (background shift), button press states (slight scale-down), and focus rings (ring-2 with ring-offset). These details are small but cumulative -- they signal a polished, intentional interface.

### Tables & Tabular Data
The Catalyst Table component is the most relevant offering. It provides: semantic `<Table>`, `<TableHead>`, `<TableBody>`, `<TableRow>`, `<TableCell>` components with Tailwind styling; sticky headers on scroll; row hover states; responsive behavior (horizontal scroll on small screens with sticky first column); and a companion `<Badge>` for status indicators in cells. Sort indicators (arrow icons in headers) are included in the design but the sorting logic is left to the consumer. The table design is clean and production-ready for moderate data volumes.

### Charts & Data Visualization
Tailwind UI does not ship chart components. The stats blocks are the closest to data visualization: large numbers with change indicators. Some marketing templates show decorative chart-like SVGs in hero sections, but these are illustrations, not data-driven. For Grain Intel, Recharts remains the charting layer. The value from Tailwind UI is in the surrounding chrome: how stat cards frame a chart, how a chart section relates to the table below it, and how axes labels and legends should be styled to match the type system.

---

## Steal This

### 1. Three-Zone Page Shell
**Pattern:** Global header (dark background, logo, nav, user actions) sits at the top. Below it, a page-specific header (white background, page title, action buttons like "Export" or "Filter") spans the full width. Below that, the scrollable content area holds the actual data. Each zone has distinct visual treatment so a user always knows where they are. The page header includes breadcrumbs on the left and action buttons on the right.
**Grain Intel Mapping:** Currently, Grain Intel has a sidebar + main content area with no clear page header zone. Add a `ModuleHeader` component that renders between the sidebar/top bar and the module content. It should contain: breadcrumb trail (already exists but is inline), module title, key action buttons (Export, Print, Refresh), and optionally a filter bar. This creates a stable anchor point -- the trader always knows which module they are in and has one-click access to actions. The Morning Brief header could additionally show the data timestamp ("iRely export: March 30, 2026 6:14 AM") for immediate data freshness context.

### 2. Responsive Sidebar with Mobile Slide-Out
**Pattern:** On desktop (lg+), a fixed sidebar shows icon + text labels in collapsible groups. On tablet (md), it collapses to an icon-only rail. On mobile (sm), it becomes a slide-out drawer triggered by a hamburger button, with a semi-transparent backdrop that closes on click. The transition between states uses Headless UI `Transition` with slide-from-left + fade for the backdrop. The sidebar state does not cause content reflow -- on desktop the main content has a fixed left margin.
**Grain Intel Mapping:** The current sidebar already handles desktop vs tablet vs mobile, but the transitions are basic. Adopt the Tailwind UI transition pattern: slide-in with a 200ms ease-out for mobile drawer, backdrop fade at 150ms. More importantly, adopt the "no content reflow" principle -- when the sidebar collapses from full to icon rail on tablet, the main content area should not jump. Use `ml-56` (full sidebar width) and `ml-14` (icon rail width) with a CSS transition on the margin change rather than a hard swap.

### 3. Stat Block with Trend Indicator
**Pattern:** A horizontal row of stat cards, each containing: metric name (`text-sm font-medium text-gray-500`), value (`text-2xl font-semibold`), and a trend indicator (green or red pill with arrow and percentage). Cards are separated by vertical dividers on desktop, stack vertically on mobile. The trend indicator uses the same inline layout as Radix's delta badge but with a more explicit directional arrow.
**Grain Intel Mapping:** Redesign the Morning Brief KPI row using this pattern exactly. Current StatCards have the right data but inconsistent visual treatment. Standardize: label on top (muted, small), value in the middle (bold, large, tabular-nums), trend pill on the bottom (colored background, arrow icon, delta value). Add vertical dividers between cards on desktop for visual grouping. The trend pill should use the semantic color tokens: `bg-emerald-50 text-emerald-700` for positive, `bg-red-50 text-red-700` for negative, with dark mode variants. Apply to: Net Position, Total Unpriced, P&L, Open Contracts count, and Delivery This Month.

### 4. Catalyst Badge System for Contract Status
**Pattern:** The `Badge` component accepts a `color` prop and renders a small colored pill. Used in tables for status columns: `<Badge color="green">Active</Badge>`, `<Badge color="red">Overdue</Badge>`, `<Badge color="yellow">Pending</Badge>`. The badge is sized to sit inline with table text without disrupting row height. Colors are constrained to the Tailwind palette for consistency.
**Grain Intel Mapping:** Contract status (Open, Complete, Short Close, Re-Open) and delivery status (On Track, At Risk, Overdue) currently render as plain text or basic colored text. Replace with badge pills: `Open` = green, `Re-Open` = blue, `Complete` = gray, `Short Close` = amber. Delivery: `On Track` = green, `At Risk` = amber, `Overdue` = red, `Delivered` = gray. Use in every table that shows status: Contract Detail, Delivery Timeline, Mark-to-Market. The consistent badge vocabulary means a trader learns the color language once and reads it everywhere.

### 5. Variable Density Layout Strategy
**Pattern:** Different zones of the same page use different spacing densities. The page header is airy (`py-8`, large font). The stats row is medium (`py-4`, moderate gaps). The table below is dense (`py-2` rows, minimal cell padding). This creates a visual funnel: broad context at the top, compressed data at the bottom. The transition between density zones is not jarring because each zone has distinct background treatment (white for header, gray-50 for stats, white for table with border).
**Grain Intel Mapping:** Apply this three-density approach to every module page. Zone 1 (Module Header): title, breadcrumb, action buttons with `py-4 px-6` -- the orientation zone. Zone 2 (Summary): StatCards with `py-3 gap-3` -- the pulse zone, answering "how are things?" Zone 3 (Detail): DataTable with `py-1.5` rows and `px-3` cells -- the working zone where traders dig into contracts. Separate zones with subtle background shifts (`bg-white` for header, `bg-gray-50/50` for summary, `bg-white` for table). This directly addresses the "cluttered" feedback by creating spatial hierarchy that guides the eye from overview to detail.

---

## Avoid This

### Marketing-First Spacing in Data Contexts
Many Tailwind UI blocks are designed for marketing pages where breathing room builds trust and readability. Sections with `py-24` or `py-32` padding are appropriate for landing pages but would waste critical viewport space in a trading dashboard. Use Tailwind UI's application UI blocks as spacing references, not the marketing blocks. The Catalyst table and form components have appropriate density; the hero sections and feature grids do not.

### Decorative Complexity
Some Tailwind UI templates include gradient mesh backgrounds, diagonal clip-paths, layered SVG patterns, and blur effects. These are visually impressive in a marketing context but create cognitive noise in a data-first interface. Grain Intel's value is in the data, not the chrome. Avoid decorative elements that compete with commodity colors, alert badges, and chart data for visual attention. Keep backgrounds flat, borders simple, and let the data be the most complex visual element on the page.

### Static Stats Without Drill-Down
Tailwind UI stats blocks are display-only -- they show a number and a trend but are not interactive. They do not link to a detail view, filter a table, or expand to show context. Adopting this pattern as-is would be a regression from Grain Intel's existing clickable Morning Brief KPIs. Every stat card in Grain Intel must remain interactive: clickable to navigate to the source module, hoverable to show a tooltip with the calculation breakdown. The visual pattern from Tailwind UI is the right starting point; the interactivity must come from Grain Intel's existing navigation system.
