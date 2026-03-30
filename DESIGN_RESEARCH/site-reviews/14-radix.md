# Radix UI

> "Start building your app now." Open source component library by WorkOS. Unstyled, accessible primitives (Radix Primitives) plus a styled component layer (Radix Themes). Live examples include team management cards, notification settings with push/email/slack toggles, pricing tiers, sign-up forms, credit card displays, invoices, financial KPI dashboards (MRR, OpEx, etc.), recent activity feeds, and to-do lists.

**URL:** https://www.radix-ui.com
**Category:** Component Primitives + Themed Library
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                        |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| Information Hierarchy          | 8     | Strong separation between primary values and supporting context |
| Data Density                   | 7     | Themes layer adds comfortable density; primitives leave it to you |
| Navigation                     | 6     | Tab and dialog patterns are excellent; no opinionated nav layout |
| Summary vs Detail              | 8     | Financial dashboard examples show KPI row above detail panels |
| Typography                     | 8     | System font stack with precise weight scale; tabular nums in financial examples |
| Color Usage                    | 9     | 12-step color scales per hue with automatic dark mode pairing |
| White Space                    | 7     | Balanced defaults; neither cramped nor wasteful               |
| Delight & Micro-interactions   | 8     | Smooth transitions on dialogs, dropdowns, tooltips; spring-based easing |
| Tables & Tabular Data          | 6     | Basic table component; no sorting, filtering, or cell formatting built in |
| Charts & Data Visualization    | 5     | KPI numbers shown in examples but no chart primitives offered |

**Average: 7.2**

---

## Key Observations

### Information Hierarchy
Radix Themes enforces hierarchy through a `size` prop system (1-9) that scales font size, padding, and radius together. A `size="4"` heading paired with `size="2"` body text creates automatic visual layering. The financial dashboard example uses this well: MRR ($350K) is `size="6"` bold, the delta (+12.3%) is `size="2"` with a colored badge, and the time period label is `size="1"` muted text. Three tiers of importance from a single prop system.

### Data Density
The Themes layer defaults to moderate density -- more compact than shadcn, less packed than Koyfin. The pricing tier cards ($0 / $49 / $99) demonstrate how to present structured comparisons without feeling cluttered: each tier card has the same height, same internal spacing, and lets the content differences (feature lists) drive the visual distinction. For financial KPIs, the example packs MRR, OpEx, revenue, and activity into a single viewport with `gap-3` spacing.

### Navigation
Radix provides excellent low-level navigation primitives -- `Tabs`, `NavigationMenu`, `DropdownMenu`, `ContextMenu` -- but does not prescribe a page-level navigation layout. There is no sidebar component, no breadcrumb primitive, no command palette. This is by design: Radix builds the atoms, not the organisms. For Grain Intel, the primitives are useful for in-module navigation (segmented controls, context menus on table rows) but the page-level shell must come from elsewhere.

### Summary vs Detail
The financial dashboard example is the key reference. A horizontal row of KPI cards (MRR, OpEx, net revenue) sits above a two-column layout: recent activity feed on the left, to-do items on the right. Each KPI card acts as a summary anchor, and the panels below provide operational detail. The invoice example adds another pattern: a table of invoices with a click-to-expand detail row showing line items, payment status, and actions. Both patterns map directly to Grain Intel's needs.

### Typography
Radix Themes uses the system font stack by default but supports custom font injection. The type scale is tightly controlled: 9 size steps, 3 weight options (regular, medium, bold), and a `trim` prop that removes leading whitespace for pixel-perfect alignment in cards. Financial examples use `tabularNums` in the `Text` component -- a prop that enables `font-variant-numeric: tabular-nums` for column-aligned numbers. This is a small detail that makes a large difference in data tables.

### Color Usage
This is where Radix excels. Each color (blue, red, green, amber, etc.) has a 12-step scale designed for specific use cases: steps 1-2 for backgrounds, 3-5 for borders, 6-8 for solid fills, 9-10 for hover/active states, 11-12 for text. Dark mode is not an inversion but a separate 12-step scale designed for dark backgrounds. The result: you pick `green` for positive and `red` for negative, and the 12-step scale guarantees accessible contrast in both light and dark mode without manual color-picking.

### White Space
Radix Themes defaults sit between shadcn (generous) and Koyfin (minimal). Card padding is `p-4`, gap between elements is `gap-3`, and section margins are `gap-5`. The notification settings example shows how toggles, labels, and descriptions can be packed tightly within a card while the card itself has comfortable outer margins. This two-layer spacing strategy (tight inside, loose outside) is effective for information-rich interfaces.

### Delight & Micro-interactions
Radix Primitives include built-in animation support. `Dialog` scales up from 95% with a 150ms ease-out. `DropdownMenu` fades in with a slight Y-axis slide matching the trigger direction. `Tooltip` has configurable delay (default 700ms) with a quick fade. The `HoverCard` component (used in team management examples) shows a rich preview on hover with a spring-based entrance animation. These are not flashy but they make state changes feel intentional rather than instant.

### Tables & Tabular Data
The `Table` component in Radix Themes provides styled `thead`, `tbody`, `tr`, `th`, `td` with consistent padding and border treatment. Row hover states and striped rows are available via props. However, there is no sorting, filtering, column resizing, or cell formatting. The invoice table example shows static data with a clean layout. For Grain Intel, the visual styling is usable but TanStack Table remains necessary for interactivity. The Radix Table is a visual layer, not a data layer.

### Charts & Data Visualization
Radix does not provide chart components. The financial dashboard shows numeric KPIs with delta badges but no line charts, bar charts, or sparklines. This is a gap: for Grain Intel, charts are essential for trend visualization (P&L over time, delivery timelines, basis spreads). Recharts remains the charting layer, but the Radix color scale system can feed chart colors for consistent theming.

---

## Steal This

### 1. 12-Step Color Scale System
**Pattern:** Each hue (blue, green, red, amber, etc.) has 12 calibrated steps. Steps 1-2 are near-white backgrounds (e.g., `green-1` for a faint success background). Steps 9-10 are solid fills for buttons. Steps 11-12 are text-on-white. Each step has a dark-mode counterpart designed independently (not inverted). This means `red-9` is always a readable, accessible red regardless of mode.
**Grain Intel Mapping:** The current commodity color system (`#EAB308` for Corn, `#22C55E` for Soybeans) uses single hex values. Expand each commodity color into a 5-step scale: `corn-bg` (faint yellow for row highlights), `corn-border` (medium for card outlines), `corn-solid` (full for chart fills), `corn-text` (dark for labels), plus dark-mode variants. This allows commodity colors to be used as background tints in tables (e.g., a Corn row has a faint yellow tint) without accessibility violations. Define in CSS custom properties alongside the theme tokens.

### 2. Delta Badge Component
**Pattern:** KPI values are paired with a small badge showing the change direction and magnitude. The badge uses a colored background (`green-2` bg + `green-11` text for positive, `red-2` bg + `red-11` text for negative) and an arrow icon. The badge is always adjacent to the primary value, never separated by other elements. This creates an instant "good or bad?" signal.
**Grain Intel Mapping:** The Morning Brief StatCards show deltas as text below the value. Replace with a proper `DeltaBadge` component: colored pill with arrow + percentage, positioned inline-right of the primary metric. Use for: day-over-day position change, P&L movement, unpriced exposure change, basis spread shift. The colored background (not just colored text) provides enough visual weight to register in peripheral vision during a quick scan of the morning brief.

### 3. Notification Toggle Grid
**Pattern:** The notification settings example arranges toggle switches in a grid: rows are notification types (Comments, Activity, Mentions), columns are delivery channels (Push, Email, Slack). Each cell is a toggle switch. The pattern converts a complex permission matrix into a scannable grid with a single interaction per cell.
**Grain Intel Mapping:** Adapt for alert configuration. Rows: alert types (Position Swing, Unpriced Urgent, Carry Cost, Entity Concentration, etc.). Columns: severity levels (Critical, Warning, Info, Disabled). Each cell is a radio or toggle that sets the threshold for that alert type. This replaces the current hard-coded thresholds in `alerts.ts` with a user-configurable alert matrix. Store in localStorage alongside market data. The grid format makes it obvious which alerts are active and at what level.

### 4. HoverCard for Entity Context
**Pattern:** The team management example shows a `HoverCard` on user avatars: hovering reveals name, role, email, and recent activity in a floating panel. The card appears after a 700ms delay (preventing flicker on accidental hovers) and dismisses when the cursor leaves.
**Grain Intel Mapping:** Apply to entity names throughout Grain Intel. When a trader hovers over a counterparty name in any table (Contracts, Net Position, Customer Concentration), show a HoverCard with: total open bushels, commodity breakdown, number of active contracts, largest single contract, and concentration percentage. This provides context without requiring navigation to the Customer Concentration module. Use the existing `useCustomerAnalysis` hook data to populate the card. Radix `HoverCard` primitive handles positioning, delay, and dismiss logic.

### 5. Size Prop Scaling System
**Pattern:** A single `size` prop (1-9) scales font size, padding, border-radius, and icon size together. A `Button size="1"` is compact with small text and tight padding. A `Button size="3"` is standard. A `Button size="4"` is prominent. This eliminates the combinatorial problem of separately configuring size, padding, and text for every component variant.
**Grain Intel Mapping:** Create a size token system for the module card components: `compact` (for dense dashboard grid view with 8+ cards visible), `standard` (current Morning Brief layout), and `expanded` (for single-module focus view). Each size token adjusts card padding, stat value font size, label font size, and chart height proportionally. This enables a "density toggle" in the UI -- a single control that shifts the entire dashboard between overview density and detail density without per-component tweaking.

---

## Avoid This

### Unstyled Primitives Without a Design Opinion
Radix Primitives are intentionally unstyled -- they provide behavior (keyboard navigation, focus management, ARIA attributes) without visual design. Using raw primitives means writing all CSS from scratch for every component. Grain Intel already has a visual language established in `DESIGN.md`. Use Radix Primitives only where behavior complexity justifies it (Dialog, Tooltip, HoverCard, DropdownMenu) and keep the existing Tailwind styling approach for simpler components.

### No Built-In Layout System
Radix provides components, not page layouts. There is no sidebar, header, dashboard grid, or responsive shell. Attempting to build Grain Intel's layout from Radix atoms would be over-engineering. The current sidebar + main content layout is fine -- enhance it with Radix interaction primitives (better dropdowns, tooltips, hover cards) rather than rebuilding the shell.

### Overly Granular Theming for a Single-Product App
The 12-step scale per hue is designed for a design system serving many products. Grain Intel is a single product with a focused palette: commodity colors, semantic colors (positive/negative/warning), and surface colors. Implementing the full 12x12 color matrix (12 steps times 12+ hues) would be maintenance overhead. Take the concept (multiple steps per hue for different use cases) but implement only the 5-step commodity scale and a 3-step semantic scale.
