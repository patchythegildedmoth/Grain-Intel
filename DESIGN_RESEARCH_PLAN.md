# Grain Intel Design Research Plan

## Objective

Conduct an exhaustive design review of 15 best-in-class dashboards to extract
their strongest design elements. Use these findings to redesign the Grain Intel
dashboard from cluttered and hard to digest into something clean, elegant, and
delightful to use.

## Current Problems to Solve

- Dashboard feels cluttered — too much competing for attention
- Hard to digest — no clear visual hierarchy telling you what matters
- No delight — functional but joyless, no reason to enjoy using it
- Generic design — looks like default Tailwind, not crafted

## Target Outcome

A design research report that:
1. Documents what makes each site excellent
2. Identifies specific, stealable design patterns
3. Maps each pattern to a specific Grain Intel improvement
4. Produces a synthesis design brief for the redesign

---

## Evaluation Framework

Rate every site on these 10 dimensions (1-10 scale). For each dimension,
capture specific observations and screenshot evidence.

### 1. Information Hierarchy
How does the site decide what's prominent and what's secondary? What do you
see first? Is there a clear reading order? How do they use size, weight,
color, and position to guide your eye?

### 2. Data Density
How much information fits on one screen without feeling crowded? Where is
the line between "rich" and "cluttered"? How do they achieve density without
overwhelming?

### 3. Navigation
How do you move between views? Sidebar? Tabs? Segmented controls? Breadcrumbs?
Command palette? How many clicks to get anywhere? Does it feel fast?

### 4. Summary vs. Detail
How do they show the big picture before drilling in? Are there summary cards
or KPI strips at the top? How do you go from overview to detail and back?

### 5. Typography
What fonts are used? How many font sizes? How do they create hierarchy with
text alone? Is the typography distinctive or generic? What's the body size?
What's the contrast ratio?

### 6. Color Usage
How many colors in the palette? How is color used for meaning (green/red for
positive/negative, status indicators, category coding)? Is color used
sparingly or liberally? Background color choices?

### 7. White Space & Breathing Room
Where do they let the design breathe? How much padding inside cards? How much
gap between sections? Does the layout feel spacious or compressed?

### 8. Delight & Micro-interactions
What makes this FEEL good to use? Hover effects? Transitions? Animations?
Loading states? Empty states with personality? Smooth scrolling? Subtle
shadows? Cursor changes? Sound? Anything that makes you smile?

### 9. Tables & Tabular Data
How do they present rows and columns? Row hover states? Sticky headers?
Column sorting? Alternating row colors or borders? How do they handle
many columns? Horizontal scrolling vs. column hiding vs. responsive
collapse?

### 10. Charts & Data Visualization
What chart types do they use? How are charts integrated with surrounding
content? Interactive tooltips? Axis labels? Color coding? Do charts tell
a story or just show numbers?

---

## Site List & Focus Areas

For each site, browse the public-facing dashboard or demo. Take screenshots
of: (a) the main dashboard/home view, (b) a table-heavy view, (c) a
detail/drill-down view, (d) navigation in its open state.

### Financial & Trading

**1. Koyfin (koyfin.com)**
- Focus: Financial data tables, chart integration, multi-panel layouts
- Relevance: Closest to what Grain Intel does — financial position data
- Browse: Main dashboard, watchlist view, a stock detail page

**2. TradingView (tradingview.com)**
- Focus: Chart design, toolbar UX, how complex tools feel approachable
- Relevance: Shows how to make power-user tools feel clean
- Browse: Main chart view, screener/table view, layout options

**3. Stripe Dashboard (dashboard.stripe.com — use public screenshots/demos)**
- Focus: Financial summary cards, transaction tables, clean metric display
- Relevance: Gold standard for presenting money data clearly
- Browse: Homepage overview, payments list, a single payment detail

**4. Robinhood (robinhood.com)**
- Focus: Delight and simplicity in financial data, the "fun" factor
- Relevance: Proof that financial dashboards can feel delightful
- Browse: Portfolio view, stock detail, the signature green line

### Operations & Business Intelligence

**5. Linear (linear.app)**
- Focus: Information density without clutter, keyboard-first design, typography
- Relevance: Best example of a power-user tool that feels elegant
- Browse: Issue board, issue list view, project overview, settings

**6. Notion (notion.so)**
- Focus: Flexible layouts, database views (table, board, calendar, gallery)
- Relevance: How to show the same data in multiple useful views
- Browse: A database in table view, board view, page layout

**7. Vercel Dashboard (vercel.com/dashboard — use public demos)**
- Focus: Deployment status, analytics, real-time metrics, transitions
- Relevance: How to show status and metrics cleanly, good animation patterns
- Browse: Project overview, deployment list, analytics view

**8. Planetscale Dashboard (planetscale.com — use public demos/screenshots)**
- Focus: Database management UI, making complex operations feel simple
- Relevance: How to present technical data to non-technical users
- Browse: Database overview, branches view, query insights

### Data Visualization & Analytics

**9. Mixpanel (mixpanel.com — use public demos)**
- Focus: Interactive chart design, funnel visualizations, segmentation
- Relevance: How to make data explorable and interactive
- Browse: Dashboard builder, funnel view, retention chart

**10. Plausible Analytics (plausible.io — live demo available)**
- Focus: Radical simplicity, light theme, minimal design that works
- Relevance: Proof that a data dashboard can be clean AND complete
- Browse: Main dashboard (they have a public live demo)

**11. Grafana (play.grafana.org — public playground)**
- Focus: Multi-panel dashboard layouts, how to arrange many data widgets
- Relevance: Grain Intel has multiple data modules — how to lay them out
- Browse: Default dashboard, a multi-panel layout, alerting view

**12. Observable (observablehq.com)**
- Focus: Data visualization with narrative, interactive charts
- Relevance: How to tell a story with grain position data
- Browse: Featured notebooks, a data dashboard example

### Design Systems & Component Patterns

**13. Shadcn/ui (ui.shadcn.com)**
- Focus: Component patterns — tables, cards, forms, navigation
- Relevance: Practical patterns you can directly implement
- Browse: Dashboard example, table component, card patterns, data table

**14. Radix UI (radix-ui.com)**
- Focus: Accessible component primitives, clean design patterns
- Relevance: Foundational patterns for all interactive elements
- Browse: Component docs, themes/theming page

**15. Tailwind UI (tailwindui.com — browse marketing pages for patterns)**
- Focus: Layout patterns, dashboard templates, application shells
- Relevance: Since Grain Intel already uses Tailwind
- Browse: Application UI section, dashboard examples

---

## Execution Process

### Step 1: Set up Firecrawl

If not already configured:
- Sign up at firecrawl.dev for API key (free tier: 500 credits)
- Install the Firecrawl MCP or use the API directly

### Step 2: For each site, execute this workflow

1. **Firecrawl scrape** — Capture the main pages as markdown + screenshots
   - Get the overall HTML structure, fonts used, color values
   - Extract any CSS variables or design tokens visible in the source

2. **`/browse` interactive exploration** — Visit the site in a real browser
   - Navigate through key views listed above
   - Take screenshots at each view
   - Test hover states, transitions, click interactions
   - Note any delight moments or micro-interactions
   - Test responsive behavior (resize the viewport)

3. **Score and document** — For each site, write a section in the research
   report covering:
   - Scores on all 10 dimensions (1-10)
   - 3-5 specific "steal this" design elements with screenshot evidence
   - How each stealable element maps to Grain Intel
   - Any patterns to AVOID (things that don't work)

### Step 3: Comparative Analysis

After all 15 sites are reviewed, create comparison tables:
- Top 3 sites per dimension (who does hierarchy best? typography? delight?)
- Common patterns across the best sites (what do 10+ of them do?)
- Unique innovations worth adopting (what does only one site do brilliantly?)

### Step 4: Grain Intel Design Brief

Synthesize everything into a single actionable document:

**4a. Design Principles** (3-5 rules derived from the research)
Example: "Lead with the number that matters most. Everything else supports it."

**4b. Specific Recommendations by Screen**
For each Grain Intel view (net position, mark-to-market, delivery timeline,
etc.), recommend:
- Layout pattern (stolen from which site)
- Typography choices (inspired by which site)
- Color usage (inspired by which site)
- Delight element to add
- What to remove or de-emphasize

**4c. Delight Playbook**
A dedicated section on how to make Grain Intel feel delightful:
- Page transitions and animations
- Hover states and micro-interactions
- Loading states with personality
- Empty states that are useful
- Sound or haptic feedback opportunities
- Easter eggs or subtle touches

**4d. Component Patterns**
Specific patterns to implement:
- How tables should look and behave
- How navigation should work
- How summary cards should be structured
- How charts should be styled

**4e. Typography and Color System**
- Recommended font pairing (display + body)
- Complete color palette with semantic meaning
- Light theme specification

---

## Output Files

All output should be written to the project directory:

1. `DESIGN_RESEARCH/` folder containing:
   - `screenshots/` — All captured screenshots, named by site
   - `site-reviews/` — Individual review for each site (15 files)
   - `COMPARISON.md` — Cross-site comparison tables
   - `SYNTHESIS.md` — The final design brief
   - `DELIGHT_PLAYBOOK.md` — Dedicated delight recommendations
   - `SCORECARD.md` — All sites scored on all dimensions

2. `DESIGN_BRIEF.md` in the project root — The final, actionable document
   that feeds into `/design-consultation` or Consul for the redesign

---

## Estimated Effort

- Time: 2-4 hours for autonomous execution
- Firecrawl credits: ~50-100 (well within free tier)
- Token usage: Heavy — recommend running on Opus for quality
- Output: ~15,000-25,000 words of structured research + screenshots

---

## How to Run

In Claude Code, with gstack and Firecrawl configured:

```
Read DESIGN_RESEARCH_PLAN.md and execute it autonomously. Go through every
site in the list, follow the evaluation framework exactly, and produce all
the output files described. Do not skip any site or any dimension. Take your
time — thoroughness matters more than speed.
```
