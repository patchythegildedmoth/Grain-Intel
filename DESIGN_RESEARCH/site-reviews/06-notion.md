# Notion (notion.so)

> "AI workspace that works for you."

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Information Hierarchy | 7 | Flexible but inconsistent -- user-created pages vary wildly; the product itself does not enforce hierarchy |
| Data Density | 7 | Database views can be dense (table view) or sparse (gallery view); user controls the dial |
| Navigation | 7 | Sidebar tree works for small workspaces, breaks down at scale; search is solid but not instant |
| Summary vs Detail | 9 | Same dataset rendered as table, board, calendar, timeline, or gallery -- best-in-class view switching |
| Typography | 8 | Clean serif/sans-serif toggle, generous line heights, readable at all sizes; heading hierarchy is clear |
| Color Usage | 6 | Mostly grayscale with pastel accents; database row colors feel arbitrary; no systematic color language |
| White Space | 8 | Generous margins and padding; content-width maxes at ~720px for reading; database views are wider |
| Delight & Micro-interactions | 7 | Slash command menu, smooth drag-and-drop for blocks, but many interactions feel slightly sluggish |
| Tables & Tabular Data | 8 | Database table view with filters, sorts, groups, and formula columns; good but not as snappy as Linear |
| Charts & Data Visualization | 4 | Charts are a recent addition and feel bolted on; no native chart sophistication |
| **Average** | **7.1** | |

## Key Observations

### Information Hierarchy
Notion is a blank canvas -- it provides heading levels (H1, H2, H3), toggle blocks, and callouts, but the user decides how to structure information. This means great pages look great and bad pages look terrible. The product does not enforce a hierarchy the way Linear or Vercel do.

### Data Density
Database table views can match Linear's density. But Notion's strength is that the same data can be viewed as a sparse gallery (one card per item with a cover image) or a compact table. The user picks the density appropriate to the task.

### Navigation
The left sidebar is a nested tree of pages and databases. It works at small scale but becomes unwieldy with hundreds of pages. Recently-added "Spaces" help organize team content. Search (Cmd+P) is functional but slightly slower than Linear's Cmd+K.

### Summary vs Detail
This is Notion's strongest design contribution. A single database can be viewed as: table (dense, scannable), board (kanban-style grouped cards), calendar (date-based layout), timeline (Gantt-style), gallery (visual cards), and list (minimal). Switching between views is a single click with no data re-fetch.

### Typography
Notion offers three typography modes: default (system sans), serif (Georgia-like), and mono. Body text is 16px with 1.5 line height -- optimized for reading, not density. Headings scale cleanly. The serif option gives documents a polished editorial feel.

### Color Usage
Colors are available as text highlights and database property colors, but there is no systematic palette. Status properties get colored badges, but the colors are user-chosen pastels that can clash. The overall feel is neutral gray with scattered color accents.

### White Space
Notion is generous with white space. Page content maxes at 720px width (with a "full width" toggle). Database views expand wider. The padding around blocks creates a calm, readable feel but sacrifices density compared to Linear.

### Delight & Micro-interactions
The slash command menu (/) is Notion's signature interaction -- type "/" and a categorized dropdown appears for inserting any block type. Drag handles appear on hover for reordering. The AI assistant has a smooth inline appearance. However, performance can lag on large pages, undermining the delight.

### Tables & Tabular Data
Database views support: filter groups with AND/OR logic, multiple sort levels, group-by with collapsible sections, relation/rollup columns, and formula columns. The filter builder UI is particularly well-designed -- visual, not code-based.

### Charts & Data Visualization
Charts were added recently and feel minimal. Basic bar, line, and donut charts can be created from database views, but customization is limited. No axis formatting, no dual-axis, no annotations. This is clearly not Notion's strength.

## Steal This

### 1. Multi-View Database Pattern
**Pattern:** One underlying dataset with multiple view representations (table, board, calendar, gallery) switchable via tabs. Each view has its own filter/sort configuration saved independently.
**Grain Intel Mapping:** Apply to the positions module. Same position data viewed as: table (for detailed scanning), board (grouped by commodity or delivery month), calendar (delivery dates), and chart (basis trends over time). Let traders switch views with one click. Each trader can save their preferred view configuration.

### 2. Filter Builder UI
**Pattern:** Visual filter construction with dropdowns for field, operator, and value. Support AND/OR groups. Filters are visible as pills above the data, removable with a click.
**Grain Intel Mapping:** Replace any generic filter inputs with Notion-style filter pills. For position tables: "Commodity is Corn" AND "Basis > -0.15" AND "Delivery Month is Jul 2026." Show active filters as removable pills above TanStack Table. Traders can see and modify their current filter state at a glance.

### 3. Slash Command / Block Insertion Menu
**Pattern:** Type "/" anywhere to get a contextual menu of insertable content types. Categorized, searchable, with keyboard navigation.
**Grain Intel Mapping:** Adapt this for a dashboard builder mode. In a customizable dashboard view, type "/" to insert: position summary card, basis chart, P&L widget, contract table, or notes block. This gives traders the ability to compose their own dashboard layout without a complex drag-and-drop editor.

### 4. Toggle Between Density Modes
**Pattern:** The same content area can switch between "comfortable" (more white space, larger type) and "compact" (tighter rows, smaller type) modes.
**Grain Intel Mapping:** Offer two density modes across all Grain Intel modules. "Overview" mode with larger cards and more spacing for morning review. "Trading" mode with compressed tables and minimal padding for active market hours. A single toggle in the header switches the entire interface.

## Avoid This

- **Blank canvas paralysis.** Notion's flexibility is its weakness for focused tools. Grain Intel should not be an open-ended workspace -- it should have opinionated defaults for each of the 14 modules. Traders should not need to design their own layouts from scratch.
- **Performance degradation at scale.** Notion noticeably slows on pages with large databases. Grain Intel must handle thousands of contract rows without lag. Prioritize TanStack Table's virtualization over Notion-style rendering.
- **Arbitrary color usage.** Notion lets users pick any color for any label, leading to rainbow chaos. Grain Intel should enforce a constrained semantic color palette: green for gains, red for losses, blue for information, yellow for warnings. No user-chosen label colors.
- **Charts as an afterthought.** Notion's charts feel tacked on. For Grain Intel, charts are core to the value proposition. Invest in Recharts configuration deeply rather than treating visualization as a secondary feature.
