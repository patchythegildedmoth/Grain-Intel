# Vercel (vercel.com)

> "Build and deploy on the AI Cloud."

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Information Hierarchy | 9 | Clear top-down flow: project > deployment > logs; status is always the dominant visual element |
| Data Density | 7 | Moderate density -- prioritizes clarity over cramming; deployment lists are spaced generously |
| Navigation | 8 | Top nav with project tabs, clean breadcrumbs, contextual sub-navigation; straightforward IA |
| Summary vs Detail | 9 | Dashboard cards summarize; click-through reveals deployment details, logs, analytics in layers |
| Typography | 10 | Geist font family (Geist Sans + Geist Mono) is purpose-built; best typography in the SaaS space |
| Color Usage | 9 | Black/white base with semantic color only for status (green=success, red=error, yellow=building) |
| White Space | 9 | Generous but not wasteful; every section breathes; cards have consistent internal padding |
| Delight & Micro-interactions | 9 | Deployment shimmer animation, real-time log streaming, smooth page transitions, gradient accents |
| Tables & Tabular Data | 7 | Deployment lists and log tables are clean but not feature-rich; no column customization |
| Charts & Data Visualization | 8 | Analytics charts (Web Vitals, visitor counts, latency) are clean with good axis labeling and tooltips |
| **Average** | **8.5** | |

## Key Observations

### Information Hierarchy
Every Vercel page answers "what is the status?" first. The deployment list shows a colored dot (green/red/yellow) as the leftmost element. Project pages lead with the live deployment URL. Analytics pages lead with the headline number. The hierarchy is always: status > identifier > metadata.

### Data Density
Vercel chooses clarity over density. Deployment list rows are ~56px tall with generous padding. This is intentional -- deployments are not scanned like issues in Linear; each one matters individually. The tradeoff is fewer items visible without scrolling.

### Navigation
Top-level nav: Overview, Deployments, Analytics, Logs, Storage, Settings. Each section has contextual sub-tabs. Breadcrumbs show: Team > Project > Deployment. The information architecture is shallow (max 3 levels deep), which prevents users from getting lost.

### Summary vs Detail
The project overview page shows summary cards: latest deployment status, domain, framework, last commit. Clicking through to Deployments reveals a list. Clicking a deployment shows build logs, function logs, and output. Each layer adds detail without repeating the previous layer's content.

### Typography
Geist Sans is a custom font designed specifically for Vercel's UI. It has excellent legibility at small sizes, a slightly geometric character, and pairs perfectly with Geist Mono for code. Font weights are used precisely: 400 for body, 500 for labels, 600 for headings. This is the benchmark for SaaS typography.

### Color Usage
The palette is essentially black (#000), white (#fff), and grays, with three semantic colors: green (success/ready), red (error/failed), yellow (building/warning). Subtle gradient accents appear on marketing pages but the dashboard stays disciplined. The restraint makes status colors unmissable.

### White Space
Cards have 24px internal padding consistently. Sections are separated by 32-48px of vertical space. The overall feel is calm and structured. Nothing touches the edges. This white space strategy makes a complex product (deployments, domains, environment variables, integrations) feel simple.

### Delight & Micro-interactions
The deployment progress bar has a shimmer animation during builds. Real-time log streaming auto-scrolls with a "pause" toggle. Page transitions use subtle fade-in animations. The marketing site uses gradient mesh backgrounds that shift subtly. These details create a premium feel without being distracting.

### Tables & Tabular Data
Deployment lists are styled as card-like rows rather than traditional tables. Each row shows: status dot, commit message, branch, timestamp, and duration. The styling is clean but there is no sorting, filtering, or column customization -- a deliberate simplicity choice.

### Charts & Data Visualization
Analytics charts show Web Vitals (LCP, FID, CLS), visitor counts, and function execution times. Charts use a single accent color against a dark/light background. Tooltips show exact values on hover. Time range selector supports custom ranges. Clean and functional, though not groundbreaking.

## Steal This

### 1. Custom Font as Brand Identity
**Pattern:** Commission or adopt a distinctive font family (one sans, one mono) that becomes synonymous with the product. Use it at precise weights for different UI roles.
**Grain Intel Mapping:** Adopt a strong font pairing for Grain Intel. Geist is open source and would work, or consider Inter (already used by Linear) paired with JetBrains Mono for numeric data. Define exact weights: 400 body, 500 labels, 600 headings, 700 key metrics. Apply Geist Mono or a tabular-figures font for all numeric values (basis, prices, P&L) so columns align perfectly.

### 2. Status-First Information Hierarchy
**Pattern:** Every list item and card leads with a colored status indicator as the first visual element. The eye lands on status before reading any text.
**Grain Intel Mapping:** In every position row and contract card, lead with a status indicator: green dot for profitable/on-track, red for loss/at-risk, yellow for pending/expiring-soon. Before the trader reads the commodity name or basis value, they see the health status. This allows rapid scanning of a 50-row table to find problems instantly.

### 3. Shimmer/Progress Animations for Loading States
**Pattern:** Instead of generic spinners, use shimmer animations that match the shape of the content being loaded. During active processes (builds/deploys), show a progress bar with a subtle glow animation.
**Grain Intel Mapping:** When loading position data or refreshing market prices, show shimmer placeholders that match the table row shape. When running P&L calculations or generating reports, show a progress bar with a branded animation. This replaces the "generic loading" feel with something that says "the system is working for you."

### 4. Layered Summary-to-Detail Drill-Down
**Pattern:** Dashboard shows summary cards with one headline metric each. Click a card to see a focused detail view. Click within that to see raw data/logs. Each layer is a complete view, not a partial one.
**Grain Intel Mapping:** Module landing pages show 3-5 summary cards (total corn position, net basis, open contracts, P&L this week). Click "Corn Position" to see the full corn positions table with filters. Click a row to see the individual contract detail. Each layer works standalone -- traders can stop at any depth depending on their current need.

### 5. Consistent Card Padding and Section Spacing
**Pattern:** Define a spacing system (8px base grid) and apply it religiously. Cards always have 24px padding. Sections always have 32px gaps. No exceptions, no one-off adjustments.
**Grain Intel Mapping:** Implement a strict spacing scale in Tailwind: p-6 (24px) for all card interiors, gap-8 (32px) between dashboard sections, gap-4 (16px) between related elements. Apply this across all 14 modules with zero exceptions. Consistency alone will solve a large portion of the "cluttered" perception.

## Avoid This

- **Over-simplifying tables.** Vercel can afford minimal table features because developers inspect one deployment at a time. Grain traders need sorting, filtering, grouping, and column customization across hundreds of rows. Do not copy Vercel's table simplicity.
- **Low data density for a data-heavy product.** Vercel's generous spacing works for a deployment dashboard with 10-20 items. Grain Intel may display 100+ positions. Copy the spacing philosophy (consistent padding, clear separation) but use tighter values -- 16px card padding instead of 24px for data tables.
- **Black-and-white only.** Vercel's monochrome palette works for a developer tool where status is the only color-worthy data. Grain Intel needs richer color semantics: commodity-specific colors, gain/loss gradients, basis range heat maps. Use Vercel's restraint principle (color only where it carries meaning) but with a broader semantic palette.
