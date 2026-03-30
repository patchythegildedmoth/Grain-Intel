# PlanetScale (planetscale.com)

> "World's fastest and most scalable cloud databases."

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Information Hierarchy | 8 | Technical content organized cleanly: headline claim > benchmark proof > architecture detail |
| Data Density | 7 | Marketing pages are spacious; dashboard is moderately dense with database metrics |
| Navigation | 7 | Simple top nav with clear sections; documentation has good sidebar navigation; nothing groundbreaking |
| Summary vs Detail | 7 | Homepage leads with benchmark numbers; drill into docs for architecture depth; good layering |
| Typography | 8 | Clean sans-serif with excellent use of monospace for technical content; ASCII diagrams are a standout choice |
| Color Usage | 8 | Dark theme (#111111) with restrained accent colors; green for performance wins, subtle gradients |
| White Space | 8 | Generous spacing on marketing pages; dashboard balances density with readability |
| Delight & Micro-interactions | 7 | ASCII architecture diagrams, benchmark comparison animations, subtle hover states; tasteful restraint |
| Tables & Tabular Data | 7 | Benchmark comparison tables are clean; database management tables are functional but standard |
| Charts & Data Visualization | 9 | Latency percentile charts (p50/p95/p99) are exceptional -- clear, labeled, and immediately meaningful |
| **Average** | **7.6** | |

## Key Observations

### Information Hierarchy
PlanetScale's marketing pages follow a pattern: bold claim first ("4.6x faster"), then benchmark data to prove it, then technical architecture explanation. The dashboard mirrors this: database health status at top, key metrics in the middle, detailed query analytics below.

### Data Density
Marketing pages use large type and generous spacing to let benchmark numbers breathe. The dashboard is denser, showing database branches, query volume, rows read/written, and storage metrics. The density dial adjusts based on context -- marketing is sparse, product is moderate.

### Navigation
Top nav is minimal: Product, Pricing, Docs, Blog, Login. Documentation uses a well-structured sidebar with collapsible sections. The dashboard nav is a left sidebar with database > branches > settings hierarchy. Functional and clear, not innovative.

### Summary vs Detail
The homepage opens with headline performance numbers, then reveals benchmark methodology, then links to full documentation. The dashboard shows database summary cards (connections, queries/sec, storage) that expand into detailed time-series views. The layering works well.

### Typography
A clean sans-serif font for body text paired with monospace for all technical content: SQL queries, connection strings, CLI commands, and notably, ASCII architecture diagrams. The monospace usage is heavy but justified -- PlanetScale is a technical product where code-adjacent content dominates.

### Color Usage
The dark background (#111111) is slightly lighter than Linear's (#08090a), giving a warmer feel. Green is used for positive performance metrics. Gradients appear sparingly on marketing elements. The palette is restrained -- most of the visual interest comes from typography contrast (sans vs mono) rather than color.

### White Space
Marketing pages use 64-80px section gaps and centered content that maxes at 1024px width. The dashboard uses tighter spacing but still maintains clear separation between metric cards. The generous approach on marketing pages creates a premium, confident feel.

### Delight & Micro-interactions
The standout delight element is ASCII architecture diagrams that render in monospace font, giving the product a distinctive technical-but-elegant personality. Benchmark comparison sections use subtle animations on scroll. Performance numbers animate upward when they enter the viewport. The restraint is the delight -- nothing shouts.

### Tables & Tabular Data
Benchmark comparison tables use a clean format with PlanetScale's values highlighted. Database management tables (branches, deploy requests) are standard CRUD tables with status badges and timestamps. Functional but not pushing boundaries.

### Charts & Data Visualization
Latency percentile charts are PlanetScale's charting strength. They show p50, p95, and p99 latency lines simultaneously, clearly labeled, with the spread between percentiles visually communicating consistency. These charts answer the question "how fast AND how reliably" in a single view. The benchmark comparison charts use before/after bar pairs that make improvements immediately obvious.

## Steal This

### 1. Percentile Latency Chart Pattern (p50/p95/p99)
**Pattern:** Show multiple percentile lines on the same time-series chart to communicate both average performance and worst-case variability. The visual spread between p50 and p99 tells the reliability story at a glance.
**Grain Intel Mapping:** Apply this to basis tracking charts. Show p50 (median basis), p25/p75 (typical range), and p5/p95 (outlier range) for each commodity over time. A trader looking at corn basis sees not just the average but the spread -- a widening spread signals increasing volatility. This transforms a simple line chart into a risk indicator. Also applicable to delivery timing metrics and counterparty payment patterns.

### 2. ASCII/Monospace Diagrams for Technical Architecture
**Pattern:** Use monospace-rendered diagrams to explain system architecture and data flows. This creates a distinctive visual identity while being highly readable for technical audiences.
**Grain Intel Mapping:** Use monospace-rendered flow diagrams to show grain logistics chains: Elevator > Truck > Terminal > Export. Or show the data pipeline: iRely > ETL > Grain Intel > Dashboard. These diagrams help traders understand where their data comes from and how positions flow through the system. Place them in onboarding screens and documentation sections within the app.

### 3. Benchmark-Style Before/After Comparisons
**Pattern:** Show paired metrics (before vs after, competitor vs us, old vs new) side-by-side with the improvement highlighted. Color the winning metric green.
**Grain Intel Mapping:** Use this pattern for performance dashboards. Show: last month basis vs current basis, target margin vs actual margin, projected P&L vs actual P&L. Highlight favorable differences in green and unfavorable in red. This turns static metrics into a narrative of improvement or decline. Especially powerful for the weekly/monthly review modules.

### 4. Dark Theme with Warm Undertones
**Pattern:** Use #111111 or similar dark gray (not pure black #000) for backgrounds. This reduces eye strain on long sessions and creates a warmer, more approachable dark mode than pure black.
**Grain Intel Mapping:** If implementing a dark theme for Grain Intel, use PlanetScale's warm dark gray (#111111 or #0f1117) rather than Linear's cooler near-black (#08090a). Traders staring at positions for hours will appreciate the reduced contrast fatigue. Pair with slightly warm grays (#1a1a2e, #2d2d3f) for elevated surfaces like cards and modals.

### 5. Headline Number with Proof Pattern
**Pattern:** Lead with a single impressive metric in large type, then immediately follow with the methodology or comparison that validates it. The number hooks attention; the proof builds trust.
**Grain Intel Mapping:** Each module landing page should lead with one headline number: "Net Corn Position: +2.4M bushels" or "Weekly P&L: +$47,200" or "Open Contracts: 847." Below the headline, show the change from the previous period and a mini sparkline. The headline is the hook; the context is the proof. This solves the "hard to digest" problem by giving every module a clear entry point.

## Avoid This

- **Sparse marketing-page density for a working dashboard.** PlanetScale's marketing pages are beautifully spacious, but that spacing does not translate to a data-heavy trading tool. Study their dashboard density instead of their homepage density.
- **Monospace overuse.** ASCII diagrams work for a database product's technical personality. Grain Intel is a business tool for traders, not a developer console. Use monospace only for numeric values where column alignment matters (prices, basis, quantities), never for body text or labels.
- **Understated status indicators.** PlanetScale uses subtle color to indicate database health, which works for infrastructure monitoring. Grain trading positions need more urgent visual treatment -- a position moving against you needs to be unmissable, not subtle.
- **Limited table interactivity.** PlanetScale's tables are read-mostly, reflecting their use case (monitoring). Grain Intel tables need to be action-oriented: click to edit, inline status changes, bulk operations on selected rows. Do not copy PlanetScale's passive table approach.
