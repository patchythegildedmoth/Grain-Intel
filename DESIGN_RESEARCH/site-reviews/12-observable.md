# Observable

> Data visualization platform and collaborative notebook environment. Known for D3.js integration, community-built visualizations, and the Observable Framework for publishing data apps. Used by NYT, Washington Post, MIT, and HuggingFace. Dark-themed hero showcases heatmaps, stock charts, dot plots, distributions, and network graphs.

**URL:** https://observablehq.com
**Category:** Data Visualization Platform
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                        |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| Information Hierarchy          | 7     | Hero section establishes visual priority; notebook layout is inherently linear |
| Data Density                   | 5     | Notebook format is spacious by design; one visualization per section |
| Navigation                     | 6     | Sidebar for notebooks, explore page for discovery; finding specific visualizations requires search |
| Summary vs Detail              | 4     | Notebooks are detail-first; no summary layer or overview mode |
| Typography                     | 9     | Beautiful editorial typography; serif headlines, proportional body text, code in mono |
| Color Usage                    | 9     | Dark hero with vibrant, carefully chosen chart palettes; each example uses color as a storytelling tool |
| White Space                    | 8     | Generous vertical rhythm in notebooks; charts float in ample space |
| Delight & Micro-interactions   | 9     | Interactive chart examples, brush-to-filter, live scrubbing, animated transitions between states |
| Tables & Tabular Data          | 5     | Tables exist but are secondary to visualizations; basic rendering |
| Charts & Data Visualization    | 10    | Best-in-class; D3-powered custom visualizations set the standard for the industry |

**Average: 7.2**

---

## Key Observations

### Information Hierarchy
The Observable homepage uses a dark hero section with a curated gallery of chart examples that immediately establishes the product's identity: beautiful data visualization. Below the hero, sections are organized by use case (framework, notebooks, community). Within a notebook, hierarchy is linear -- each cell builds on the one above it, like a document. This editorial flow works for storytelling but is not directly applicable to dashboards, where users need to scan multiple data points simultaneously.

### Data Density
Observable optimizes for comprehension over density. Each visualization gets its own section with surrounding explanation text. A typical notebook page shows 2-3 charts with narrative between them. This is the opposite of Grafana's pack-everything-in approach. The low density is intentional -- Observable treats data visualization as communication, not monitoring.

### Navigation
The platform has two navigation modes: a sidebar for personal notebooks and projects, and an explore/search interface for community content. Within a notebook, navigation is vertical scrolling. There are no tabs, panels, or multi-view layouts. The Framework product (for publishing data apps) adds more traditional page navigation, but the core notebook experience is a single scrollable document.

### Summary vs Detail
Notebooks start with detail and build toward insight -- the reverse of a dashboard. There is no summary card or KPI row at the top. The closest equivalent is a notebook's title and introduction paragraph, which provides verbal context but not numerical summary. This detail-first approach works for analytical exploration but would not serve a trader's morning scan.

### Typography
This is Observable's standout design dimension. The platform uses a serif font for notebook titles and narrative text, creating an editorial, magazine-like feel. Code cells use a clean monospace. Chart labels and annotations use a proportional sans-serif at smaller sizes. The mix of serif and sans creates a visual richness that most data tools completely ignore. Font sizes follow a clear modular scale with consistent vertical rhythm.

### Color Usage
Observable's chart examples are masterclasses in color. The hero section shows: a heatmap using a sequential blue-to-yellow palette, a stock chart using a diverging green/red scheme, dot plots using categorical hues with careful lightness separation, and distribution charts using transparency to show overlap. Each chart's color palette is chosen to serve its specific data type. There is no single brand palette forced onto all visualizations -- color is treated as a per-chart design decision.

### White Space
Notebooks use generous vertical spacing between cells. Charts have comfortable padding and do not touch the edges of their containers. The margin between a chart and its title, and between a chart and the next narrative paragraph, creates a reading rhythm. This spacing signals that each visualization deserves individual attention rather than being glanced at as part of a wall of data.

### Delight & Micro-interactions
Observable's interactive examples are the gold standard. Brushing a region on a scatter plot filters a connected histogram in real-time. Scrubbing a timeline updates a map. Hovering a chart element highlights related elements in linked views. Transitions between data states are animated with smooth interpolation. These interactions are not decoration -- they are analytical tools that enable exploration. The linked-views pattern (where interacting with one chart filters or highlights another) is particularly powerful.

### Tables & Tabular Data
Tables in Observable notebooks are rendered as simple HTML tables or through the Inputs.table helper, which provides sorting and pagination. They lack the advanced features of TanStack Table (column resizing, virtual scrolling, heat-map cells). Tables are treated as data display, not as interactive analysis surfaces. This is a weakness if you need table-heavy workflows.

### Charts & Data Visualization
Observable is the benchmark. Built on D3.js, the platform supports every visualization type imaginable: standard charts (bar, line, scatter, area), statistical charts (box plot, violin, density), geographic (choropleth, cartogram), network (force-directed, arc diagram), and custom types. The Observable Plot library simplifies common charts while maintaining D3's power. Chart quality -- axis formatting, label placement, color choice, annotation -- is consistently excellent across community examples. This is what publication quality looks like.

---

## Steal This

### 1. Linked Brush-to-Filter Across Visualizations
**Pattern:** Observable notebooks frequently link two or more charts so that brushing (click-and-drag selecting) a region on one chart filters the data shown in another. For example, brushing a date range on a line chart updates a bar chart to show only data from that range. The interaction is bidirectional and instantaneous.
**Grain Intel Mapping:** Link the Net Position trend chart with the Unpriced Exposure breakdown table. When a trader brushes a date range on the position trend line, the table below updates to show only contracts with futures months in that range. In Recharts, implement this with a `ReferenceArea` component for the brush selection and pass the selected range to the table's filter state via a shared React context or Zustand slice. This is more powerful than Grafana's crosshair sync because it actually filters data rather than just highlighting a timestamp.

### 2. Per-Chart Color Palette Selection
**Pattern:** Observable treats color as a per-visualization design decision. A heatmap uses a sequential palette. A comparison chart uses a diverging palette. A categorical chart uses distinct hues. The color scheme serves the data type, not the brand.
**Grain Intel Mapping:** Currently, Grain Intel uses commodity colors everywhere, which is correct for commodity breakdowns. But not every chart is a commodity breakdown. The M2M waterfall chart should use a diverging green-to-red palette (profit vs loss). The delivery funnel should use a sequential palette (light to dark as contracts progress). The risk profile radar chart should use a single-hue sequential scale. Create a `chartPalettes.ts` utility with named palettes: `commodity` (existing), `diverging` (green-gray-red), `sequential` (light-to-dark blue), and `categorical` (for non-commodity dimensions like entity or pricing type). Select the palette per chart based on what the data represents.

### 3. Editorial Typography for Morning Brief Narrative
**Pattern:** Observable uses serif fonts for narrative text, creating a reading experience that feels considered and trustworthy. The mix of serif body text and sans-serif data labels creates a visual distinction between story and data.
**Grain Intel Mapping:** The Morning Brief header section and any narrative summary text (e.g., "Your net position is 45K bu long in Corn, up 12K from yesterday") should use a serif font like Source Serif 4 or Merriweather, while data values, table content, and chart labels remain in the existing sans-serif. This creates a subtle editorial quality that makes the Morning Brief feel like a curated daily report rather than a raw data dump. Limit the serif to Morning Brief headlines and summary sentences -- do not use it in data tables or chart axes. Add the font to the Tailwind config as `font-serif` and apply it to the Morning Brief's introductory text components only.

### 4. Animated State Transitions on Data Change
**Pattern:** When Observable charts update (due to a filter change, brush selection, or data reload), elements transition smoothly between states. Bars grow or shrink, dots slide to new positions, lines morph. The animation duration is typically 300-500ms -- fast enough to feel responsive, slow enough to convey what changed.
**Grain Intel Mapping:** When a trader uploads a new iRely file or fetches new settlements, the Morning Brief KPIs and charts should animate from their old values to the new ones rather than snapping instantly. StatCard numbers should count from the previous value to the new value. Bar charts should grow or shrink bars smoothly. This gives the trader a visual cue about what changed -- "I see the Net Position bar growing, so we added long contracts." Recharts supports `isAnimationActive` and `animationDuration` props. For StatCard numbers, use a lightweight tween (e.g., `useSpring` from framer-motion or a custom `requestAnimationFrame` counter). Key: animate on data change, not just on first load.

### 5. Chart Annotation Layer
**Pattern:** Observable charts frequently include annotations -- text labels pointing to notable data points, threshold lines with labels, shaded regions marking events. These annotations are part of the chart, not tooltips. They persist and tell a story without requiring hover interaction.
**Grain Intel Mapping:** Add persistent annotation support to key Recharts charts. On the Net Position chart, draw a `ReferenceLine` at the zero axis labeled "Flat." On the Unpriced Exposure chart, draw a `ReferenceArea` shading the 14-days-to-delivery urgent zone in light red. On the M2M chart, add a `ReferenceLine` at $0 P&L labeled "Breakeven." These static annotations provide context that would otherwise require the trader to remember thresholds. Recharts' `ReferenceLine`, `ReferenceArea`, and `Label` components support this natively. Keep annotations sparse -- 1-2 per chart maximum to avoid clutter.

---

## Avoid This

### Notebook-Style Linear Layout for Dashboards
Observable's top-to-bottom scrolling layout works for analytical narratives but is wrong for a trading dashboard. Traders need to see multiple data points simultaneously, not read them in sequence. Do not adopt the linear notebook pattern for any Grain Intel module. Keep the card-and-grid layout where related metrics are visible side by side.

### D3 Complexity for Standard Charts
Observable's chart quality comes from D3.js, which provides pixel-level control but requires significant implementation effort. Grain Intel uses Recharts, which trades some customization for development speed. Do not switch to D3 for standard bar, line, and area charts -- the quality improvement would not justify the maintenance cost. Reserve D3 consideration only for a truly custom visualization (e.g., a Sankey diagram for grain flow) that Recharts cannot produce.

### Community / Exploration Focus
Observable's product centers on exploration and community sharing. Grain Intel is a closed operational tool for a specific trading team. Do not add notebook-style exploration, community sharing, or "remix this chart" features. The tool should be opinionated about what to show and how, not a canvas for data exploration. Every view should have a clear purpose tied to the daily trading workflow.

### Dark Theme as Default
Observable's hero section uses a dark theme that showcases colorful charts beautifully. But Grain Intel is used in bright office environments during morning meetings and is printed for team distribution. The dark theme should remain an option (it already exists), but light theme must be the default and the primary design target. Charts should be designed to look good on white backgrounds first, dark second.
