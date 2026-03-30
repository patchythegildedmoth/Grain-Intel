# Plausible

> Privacy-focused web analytics alternative to Google Analytics. Radical simplicity: one-page dashboard showing all key metrics. Open source, lightweight, no cookie banners required. Live demo at plausible.io/plausible.io.

**URL:** https://plausible.io
**Category:** Web Analytics
**Reviewed:** 2026-03-30

---

## Scores

| Dimension                      | Score | Notes                                                        |
| ------------------------------ | ----- | ------------------------------------------------------------ |
| Information Hierarchy          | 9     | Everything on one screen with clear visual priority from top KPIs to detail tables |
| Data Density                   | 7     | Fits substantial data into a single view without scrolling; tables are compact |
| Navigation                     | 6     | Almost no navigation needed (one page), but filtering and date range are the only controls |
| Summary vs Detail              | 7     | Top-level KPIs with expandable breakdowns; limited deep-dive capability |
| Typography                     | 8     | Large, bold metric numbers with excellent readability; clean body text |
| Color Usage                    | 6     | Minimal color; mostly monochrome with a single blue accent. Effective but not expressive |
| White Space                    | 9     | Masterful use of space to separate sections; the page feels open despite showing real data |
| Delight & Micro-interactions   | 5     | Minimal; real-time visitor count pulses subtly, but otherwise static |
| Tables & Tabular Data          | 7     | Clean source/page tables with percentage bars; simple but effective |
| Charts & Data Visualization    | 6     | Single area chart for visitor trend; functional but limited in variety |

**Average: 7.0**

---

## Key Observations

### Information Hierarchy
Plausible achieves what most dashboards fail at: a single screen that tells the whole story. The top row shows the visitor trend chart spanning the full width. Below it, six KPI metrics sit in a horizontal row. Below that, source tables, top pages, countries, and browser breakdowns are arranged in a two-column grid. The eye naturally flows top-to-bottom, from trend to numbers to breakdowns. No clicks required to get the full picture.

### Data Density
For a "simple" analytics tool, Plausible packs meaningful density into its layout. The live demo shows 168 current visitors, 283K uniques, 477K visits, 1.9M pageviews, bounce rate, and visit duration -- all above the fold. Below the fold, four breakdown tables each show 5-10 rows with percentage bars. The total information on screen rivals tools with three times the UI complexity.

### Navigation
Navigation is almost nonexistent by design. There is a date range picker and a filter bar -- that is it. You cannot create custom dashboards, rearrange panels, or add widgets. This is both the product's strength (zero learning curve) and its ceiling (power users hit the wall quickly). The single-page approach means the URL is the dashboard.

### Summary vs Detail
The KPI row is the summary layer. Clicking any KPI (e.g., "Unique Visitors") adds it as a filter or toggles the chart to show that metric's trend. Clicking a source in the table filters the entire dashboard to that source. This filter-as-drill-down pattern is simple but surprisingly effective for progressive disclosure without page navigation.

### Typography
Metric numbers are the typographic hero. The current visitor count uses a large, bold display weight that immediately anchors the eye. The six KPI values below use a slightly smaller but still prominent size. Labels are small, muted, and uppercase -- they do not compete with the numbers. This number-first typography is exactly right for a data dashboard.

### Color Usage
Plausible's palette is intentionally sparse: white background, dark text, a single blue for the area chart fill and accent elements. Percentage bars in tables use a light blue fill. There is no red/green semantic coloring, no multi-color chart segments, no gradient effects. The restraint makes the few colored elements (the blue chart, active filters) stand out clearly.

### White Space
This is Plausible's most transferable design decision. Each section -- chart, KPIs, source tables, page tables -- is separated by generous vertical space. Within sections, items have comfortable padding. The two-column table layout uses a visible gap between columns. The result is a page that feels calm and scannable even though it contains dozens of data points. White space is doing the work that borders and dividers do in denser dashboards.

### Delight & Micro-interactions
Minimal by philosophy. The real-time visitor count has a subtle pulse animation (a green dot that blinks). Hovering the trend chart shows a tooltip with the exact date and value. Filter pills appear with a quick fade. That is the extent of the motion design. Plausible treats delight as unnecessary for a tool that aims to be glanced at, not explored.

### Tables & Tabular Data
The source and page tables use a distinctive pattern: each row has the item name on the left and a horizontal percentage bar on the right, with the count overlaid on the bar. This makes relative proportions immediately visible without needing a chart. Sorting is by count (descending) with no option to change. The tables are simple but the percentage bar pattern is clever and space-efficient.

### Charts & Data Visualization
A single area chart dominates the top of the page, showing the visitor trend for the selected date range. The fill is a translucent blue, the line is a darker blue. Hovering reveals date-specific values. There are no other chart types -- no bar charts, no pie charts, no funnels. The one-chart philosophy keeps the page focused but limits analytical depth.

---

## Steal This

### 1. Percentage Bars in Table Rows
**Pattern:** Each row in Plausible's source table shows a lightweight horizontal bar behind the text, where the bar width represents the row's percentage of the total. The numeric count sits at the right edge. This embeds a bar chart inside the table without using a separate visualization.
**Grain Intel Mapping:** Apply to the Customer Concentration module and commodity breakdown tables. When showing entity volume (e.g., "Cargill: 45,000 bu, 23% of Corn"), render a subtle background bar at 23% width using a Tailwind `bg-blue-100 dark:bg-blue-900/30` fill with the bushel count right-aligned. This replaces the need for a separate pie chart while keeping the table as the primary view. Implement as a custom TanStack Table cell renderer that calculates `(rowValue / maxValue) * 100` for the bar width.

### 2. Number-First Typography Hierarchy
**Pattern:** Plausible makes metric numbers the largest, boldest text on the page. Labels are small, muted, and uppercase. The visual weight ratio is roughly 3:1 between number and label. The eye goes to the number first, then reads the label for context.
**Grain Intel Mapping:** Morning Brief StatCards should adopt this ratio. Currently, the label and value have similar visual weight. Increase the value font size to `text-3xl font-bold` and reduce the label to `text-xs uppercase tracking-wide text-gray-500`. The delta indicator (up/down arrow with percentage) should sit between them at `text-sm`. This three-tier type stack (big number, small delta, tiny label) matches how traders actually scan: number first, change second, context third.

### 3. Single-Screen Dashboard as Default State
**Pattern:** Plausible's entire product fits on one screen without scrolling. Every piece of information is visible simultaneously. This is not a limitation -- it is a design commitment to "the glance."
**Grain Intel Mapping:** The Morning Brief should be designed to fit on a 1440x900 viewport without scrolling. Currently it requires scrolling to see all KPI cards and the alert summary. Reduce card count to the 6 most critical KPIs (Unpriced Exposure, Net Position, Deliveries Due, Basis Risk, P&L, Data Freshness), arrange in a 3x2 grid, and keep the alert summary compact (count badges, not full text). If the trader needs more detail, they click through. The morning scan should take 5 seconds of looking, not 15 seconds of scrolling.

### 4. Filter-as-Drill-Down Instead of Page Navigation
**Pattern:** Clicking a source name in Plausible's table does not navigate to a new page. It adds a filter pill to the top of the dashboard, and the entire page re-renders with data scoped to that filter. Clicking the X on the pill removes it. The URL updates to reflect the filter state.
**Grain Intel Mapping:** When a trader clicks "Corn" in any commodity breakdown table, instead of navigating to a filtered module page, add a filter pill to the module header (e.g., "Commodity: Corn [x]") and re-render all data in that module scoped to Corn. This keeps context -- the trader stays on the same module with all its sections, just filtered. Encode filters in the URL hash (e.g., `#net-position?commodity=Corn`) so they are shareable and back-button friendly. This pattern works naturally with the existing `useMemo` hooks -- add a filter parameter to the hook inputs and let React handle the re-computation.

---

## Avoid This

### Monochrome Color Scheme for Multi-Commodity Data
Plausible can get away with a single blue accent because its data is one-dimensional (visitor count over time). Grain Intel tracks 8+ commodities that must be visually distinct. Copying Plausible's minimal color approach would make it impossible to distinguish Corn from Soybeans from Wheat at a glance. Keep the established commodity color palette and use it consistently across all views.

### Single Chart Type Limitation
One area chart works for web analytics trends, but grain trading needs variety: bar charts for position comparisons, stacked bars for long/short breakdowns, line charts for price trends, and possibly waterfall charts for exposure decomposition. Do not adopt Plausible's one-chart philosophy. Each module should use the chart type that best fits its analytical purpose.

### No Customization Whatsoever
Plausible's fixed layout works for a product with one use case (web analytics) and one audience (site owners). Grain Intel serves a merchandising team where different traders may care about different modules. While the default layout should be opinionated and zero-config (steal that), there should be at least basic customization: collapsible sections, KPI card reordering, and the ability to hide modules the trader never uses.
