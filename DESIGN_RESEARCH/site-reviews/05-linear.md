# Linear (linear.app)

> "The product development system for teams and agents."

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Information Hierarchy | 9 | Masterclass in priority layering -- status, assignee, priority all scannable at a glance |
| Data Density | 10 | Packs enormous amounts of issues, metadata, and status into tight rows without feeling cluttered |
| Navigation | 9 | Keyboard-first with Cmd+K command palette; sidebar collapses cleanly; breadcrumb trail always visible |
| Summary vs Detail | 8 | List view gives scannable summaries; click-through reveals full issue detail in a sliding panel |
| Typography | 9 | System font stack at small sizes (13-14px), tight line heights, monospaced labels for IDs -- every character earns its space |
| Color Usage | 9 | Near-monochrome dark theme (#08090a) with color reserved exclusively for status (purple, yellow, green, blue) |
| White Space | 8 | Deliberately compressed vertically to maximize rows visible, but horizontal padding prevents claustrophobia |
| Delight & Micro-interactions | 8 | Smooth panel transitions, subtle hover highlights, satisfying drag-and-drop on kanban, keyboard shortcut toasts |
| Tables & Tabular Data | 10 | Best-in-class issue lists: sortable columns, inline-editable fields, grouped rows, resizable columns |
| Charts & Data Visualization | 6 | Cycle burndown and velocity charts exist but are minimal -- not the product's focus |
| **Average** | **8.6** | |

## Key Observations

### Information Hierarchy
Linear uses a consistent left-to-right priority order: icon (type) > identifier > title > labels > assignee > status. The eye can scan any single column across dozens of rows. Status chips use color to break the monochrome, making them the first thing you notice without reading.

### Data Density
The issue list view is the gold standard. Rows are 32-36px tall, yet each contains 6-8 fields. They achieve this through small type, icon-only columns (priority diamonds, assignee avatars), and aggressive truncation with tooltips. No wasted vertical space.

### Navigation
Cmd+K opens a command palette that searches issues, projects, teams, and actions. The left sidebar groups by team and project with collapsible sections. Keyboard shortcuts (C for create, X for select) mean power users rarely touch the mouse.

### Summary vs Detail
The list-to-detail transition is a right-sliding panel rather than a full page navigation. This preserves context -- you can still see the list behind the detail panel. Closing the panel returns you exactly where you were.

### Typography
System fonts (Inter on most systems) at 13px for body text. Issue identifiers use monospace. Section headers are subtle (12px, uppercase, muted color). The restraint is the point -- typography never competes with data.

### Color Usage
The dark background (#08090a) makes colored status badges pop. Priority uses a 4-level diamond icon system (urgent=orange, high=yellow, medium=white, low=gray). Labels get user-assigned colors but are small pills that do not dominate.

### White Space
Rows are tight but columns breathe. The sidebar has generous padding. The detail panel uses more white space than the list view, creating a visual shift that signals "you are now in reading mode."

### Delight & Micro-interactions
Dragging issues between kanban columns has a smooth snap animation. Keyboard shortcut hints appear on hover. The command palette has a polished search-as-you-type feel. Nothing flashy, but everything feels responsive and intentional.

### Tables & Tabular Data
Issue lists support: column reordering, column visibility toggles, grouping by any field, sub-grouping, inline status changes via dropdown, bulk selection with keyboard, and saved custom views. This is the feature Grain Intel should study most closely.

### Charts & Data Visualization
Cycle velocity and burndown charts use simple line/area charts. They are functional but basic -- Linear invests its design energy in the list and board views rather than charts.

## Steal This

### 1. Status-Color-Only Palette
**Pattern:** Use a near-monochrome UI where color appears only on status indicators and categorical labels. Everything else is grayscale.
**Grain Intel Mapping:** Apply to the 14-module dashboard. Make basis values, P&L changes, and position alerts the only colored elements. Background, borders, typography all stay in the gray/dark palette. This solves the "cluttered" problem by reducing visual noise to near zero, then letting data-carrying color punch through.

### 2. Compressed Tabular Rows with Icon Columns
**Pattern:** 32-36px row height. Replace text labels with icons where possible (priority diamonds, avatar circles, type icons). Truncate long text with ellipsis and tooltip.
**Grain Intel Mapping:** Apply to position tables and contract lists in TanStack Table. Commodity type could be an icon, delivery month a compact badge, and basis/futures values right-aligned numbers. This would double the visible rows in the same viewport height.

### 3. Command Palette Navigation (Cmd+K)
**Pattern:** A single search box that finds everything -- issues, projects, actions, settings. Eliminates the need to know where something lives in the nav hierarchy.
**Grain Intel Mapping:** Implement a Cmd+K palette that searches across all 14 modules: find a specific contract, jump to a commodity's basis chart, open a specific trader's P&L, or trigger an action like "export corn positions." This replaces hunting through module tabs.

### 4. List-to-Detail Sliding Panel
**Pattern:** Clicking a row opens a detail panel that slides in from the right, overlaying but not replacing the list view. The list remains visible and interactive behind a slight dim.
**Grain Intel Mapping:** Use this for contract detail views. Click a row in the positions table to slide in full contract details (terms, delivery schedule, basis history chart, counterparty info) without losing your place in the list. Back button or Escape returns to the exact scroll position.

### 5. Keyboard-First Interaction Model
**Pattern:** Every action has a keyboard shortcut. Navigation, selection, status changes, and creation all work without a mouse. Shortcuts are discoverable via hover tooltips and the command palette.
**Grain Intel Mapping:** Add shortcuts for the most common trader workflows: N for new ticket, arrows to navigate positions, Enter to open detail, number keys to switch modules. Traders working at speed during market hours will benefit enormously.

## Avoid This

- **Over-compressing for non-technical users.** Linear's density works because developers expect it. Grain traders scanning positions need slightly more breathing room than software engineers scanning issues. Start at 40px rows, not 32px.
- **Dark theme as the only option.** Linear defaults dark and it works for their audience. Grain traders often work in bright offices or on-site at elevators. Provide both themes with light as default.
- **Minimal charting.** Linear can get away with basic charts because their product is not about data visualization. Grain Intel's core value proposition IS data visualization -- basis trends, P&L curves, position exposure. Do not copy Linear's chart minimalism.
