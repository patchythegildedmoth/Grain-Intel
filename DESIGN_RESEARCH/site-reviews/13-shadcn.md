# shadcn/ui

> "The Foundation for your Design System." Open source component library built on Radix primitives and Tailwind CSS. Ships copy-paste components rather than an npm dependency. Dashboard examples, authentication templates, task managers, payment forms, settings panels. Dark/light mode. Neutral theme option.

**URL:** https://ui.shadcn.com
**Category:** Component Library / Design System
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                        |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| Information Hierarchy          | 9     | Masterful use of card grouping, section headers, and visual weight to create clear reading order |
| Data Density                   | 6     | Intentionally sparse; favors clarity over packing data        |
| Navigation                     | 7     | Sidebar + breadcrumb pattern is clean but limited to one depth level |
| Summary vs Detail              | 8     | Dashboard examples show KPI cards above detail tables; good progressive disclosure |
| Typography                     | 9     | Inter with careful size/weight scale; tabular nums for data; excellent readability |
| Color Usage                    | 8     | Neutral-first palette with semantic accents; dark mode is first-class |
| White Space                    | 9     | Generous padding and margins create breathing room without feeling empty |
| Delight & Micro-interactions   | 7     | Subtle hover transitions, focus rings, toast animations; restrained but present |
| Tables & Tabular Data          | 7     | Clean column alignment, row hover states, but no advanced features like heat maps |
| Charts & Data Visualization    | 5     | Minimal chart examples; relies on Recharts with default styling |

**Average: 7.5**

---

## Key Observations

### Information Hierarchy
shadcn/ui achieves hierarchy through card containment rather than visual noise. Each logical group lives in a `Card` with `CardHeader` / `CardContent` / `CardFooter` slots. Headers use a bold title + muted description pair that immediately signals importance. Nested within cards, secondary information uses smaller text and lighter color -- never competing with the primary metric. The dashboard example stacks KPI cards in a row, then a full-width chart, then a detail table -- top-down reading matches information priority perfectly.

### Data Density
This is a deliberate trade-off. shadcn/ui components breathe -- generous `p-6` card padding, `gap-4` between elements, `text-sm` for secondary content. For a SaaS settings panel this is ideal, but a trading dashboard would need to tighten spacing significantly. The framework supports it (Tailwind classes are fully customizable) but the defaults lean toward comfort over density.

### Navigation
The sidebar component uses collapsible groups with icons and text labels. Active states are clear (background highlight + bold text). The pattern supports nested items but examples only go one level deep. No mega-menu or command palette is built in, though the `cmdk` library integration is documented separately.

### Summary vs Detail
The dashboard example is the strongest reference: four stat cards (Revenue, Subscriptions, Sales, Active Now) sit above a line chart and a recent-sales list. Each card has a title, value, and delta indicator. This summary layer gives you the pulse before you scroll into detail. The task example adds a second pattern -- a filterable table with row actions that expand to a detail pane.

### Typography
Inter is the default with a well-tuned scale: `text-2xl font-bold` for card values, `text-sm font-medium` for labels, `text-xs text-muted-foreground` for metadata. Tabular numbers (`font-variant-numeric: tabular-nums`) are used in the dashboard example, ensuring columns of numbers align vertically. Letter-spacing is slightly tightened on headings, slightly loosened on small text. The type system works because it is simple -- only size and weight vary, never the typeface.

### Color Usage
The HSL-based CSS custom property system (`--primary`, `--muted`, `--destructive`, etc.) is the real innovation. Colors are defined as raw HSL values and composed via Tailwind, making theme switching trivial. The neutral theme option desaturates everything to grays and uses a single accent color (typically zinc or slate). Semantic colors are reserved: red for destructive, green for success, amber for warning. This prevents the "rainbow dashboard" problem where every element competes for attention.

### White Space
White space is treated as a design element, not wasted space. Card padding (`p-6`), inter-card gaps (`gap-4` to `gap-6`), and section margins create rhythm. The dashboard example has roughly 40% white space on a 1440px viewport -- aggressive for a data tool, but it makes the remaining 60% instantly scannable. Empty areas guide the eye along the intended reading path.

### Delight & Micro-interactions
Restrained but thoughtful. Button hover states darken by 10% with a 150ms ease. Focus rings appear only on keyboard navigation (`:focus-visible`). Dropdown menus animate in with a scale + fade (50ms). Toast notifications slide in from the bottom-right with a spring easing. The "Syncing..." indicator in the team management card uses a subtle pulsing dot. None of these demand attention, but they collectively make the interface feel responsive rather than static.

### Tables & Tabular Data
The DataTable component wraps TanStack Table with styled headers, row hover highlights, and column sorting indicators. Pagination is clean with page-size selector. Missing: conditional cell formatting, inline sparklines, column pinning, and row grouping. The table is competent but not specialized for financial data -- it needs augmentation for a trading context.

### Charts & Data Visualization
Charts are not a strength. The dashboard example shows a single area chart with Recharts defaults. No multi-series, no axis customization, no annotations. shadcn/ui recently added a chart component with better theming, but it is thin compared to purpose-built visualization libraries. For Grain Intel, the chart components would need significant custom work.

---

## Steal This

### 1. HSL Token System for Theme Switching
**Pattern:** Colors defined as raw HSL values in CSS custom properties (`--primary: 222.2 47.4% 11.2%`), composed in Tailwind via `hsl(var(--primary))`. Swapping themes means changing a handful of root variables -- no class refactoring needed. Dark mode inverts the lightness channel while keeping hue and saturation consistent.
**Grain Intel Mapping:** Replace the current hard-coded Tailwind color classes with an HSL token layer. Define `--surface`, `--surface-elevated`, `--text-primary`, `--text-muted`, `--border`, `--accent`, `--positive`, `--negative` as HSL custom properties in `index.css`. Dark mode becomes a single `:root.dark` override block. This also unlocks future theme options (high-contrast for projector displays, print-optimized) without touching component code. Commodity colors (`#EAB308` for Corn, etc.) remain hard-coded since they are semantic to the domain, not the theme.

### 2. Card Header / Content / Footer Slot Pattern
**Pattern:** Every card has three explicit slots: `CardHeader` (title + description), `CardContent` (primary content), `CardFooter` (actions or metadata). The header always has a bold title and a `text-muted-foreground` description beneath it. This enforces consistent visual rhythm across wildly different card contents.
**Grain Intel Mapping:** The Morning Brief KPI cards, module summary cards, and detail panels currently have ad-hoc internal layouts. Adopt a `<ModuleCard>` wrapper with `<ModuleCardHeader title="Net Position" description="Long/short by commodity" />`, `<ModuleCardContent>`, and `<ModuleCardFooter>`. This standardizes every module's visual structure and makes cross-module scanning predictable. The description slot solves the "what does this number mean?" problem for less-frequent users.

### 3. Muted Foreground for Secondary Text
**Pattern:** A dedicated `text-muted-foreground` class (mapped to `--muted-foreground` HSL token) creates a consistent secondary text layer. Labels, descriptions, timestamps, and metadata all use this single class. The effect is a two-tone page: high-contrast for values and actions, low-contrast for context.
**Grain Intel Mapping:** Currently, secondary text in Grain Intel uses a mix of `text-gray-500`, `text-gray-400`, `text-slate-500`, and dark-mode variants. Consolidate to a single `text-muted` utility mapped to an HSL token. Every label, unit indicator, delta description, and table header caption should use this class. The result: values and alerts pop, everything else recedes. This directly addresses the "cluttered, hard to digest" problem by creating visual layers.

### 4. Keyboard-First Focus Ring System
**Pattern:** Focus rings only appear on keyboard navigation (`:focus-visible`), never on mouse clicks. The ring uses `ring-2 ring-ring ring-offset-2 ring-offset-background` -- a consistent, theme-aware outline that adapts to dark mode automatically. This makes tabbing through a dashboard feel polished without adding visual noise during mouse use.
**Grain Intel Mapping:** The Command Palette (Cmd+K) already supports keyboard navigation, but individual module components (StatCards, table rows, filter controls) lack focus-visible styling. Add the shadcn focus ring pattern to all interactive elements. This is especially important for the daily workflow where a trader might tab through KPI cards to quickly scan values. Apply via a shared `focusRing` Tailwind utility class.

### 5. Toast Notification Pattern
**Pattern:** Non-blocking toast notifications slide in from the bottom-right with an icon, title, description, and optional action button. Auto-dismiss after 5 seconds. Stacks vertically if multiple fire. Uses `sonner` library under the hood.
**Grain Intel Mapping:** Currently, Grain Intel has no feedback mechanism for background operations (Yahoo Finance fetch completing, Excel parse finishing, market data saving). Add a toast system for: "Settlements fetched (5 commodities updated)", "Market data saved", "3 contracts missing freight tier", "Export complete". This replaces the need for inline success/error banners and gives the trader ambient awareness of system state without interrupting their reading flow.

---

## Avoid This

### Over-Generous Spacing for Data-Dense Contexts
shadcn/ui defaults (`p-6` cards, `gap-6` sections) are designed for SaaS settings pages, not trading dashboards. Adopting these spacing defaults wholesale would mean a trader sees 3-4 KPI cards where Koyfin would show 8-10. Grain Intel should use `p-3` to `p-4` card padding and `gap-2` to `gap-3` inter-element spacing -- tighter than shadcn defaults but looser than Koyfin's terminal density. The shadcn token system is the right foundation; the spacing values need recalibration.

### Unstyled Chart Defaults
The shadcn chart component inherits Recharts defaults with minimal customization. Grid lines are prominent, axis labels are small, and there is no annotation system. Grain Intel already uses Recharts -- adopting shadcn's chart wrapper would be a step backward from customized chart components. Keep the custom Recharts configuration and apply the HSL color token system to chart fills and strokes instead.

### Copy-Paste Architecture
shadcn/ui's distribution model (copy component source into your project) means no upstream updates. This is fine for a design system you own completely, but it means every bug fix or accessibility improvement must be manually merged. For Grain Intel, use shadcn as a reference implementation but keep components in a shared `ui/` directory with a clear upgrade path. Do not scatter shadcn source files across feature directories.
