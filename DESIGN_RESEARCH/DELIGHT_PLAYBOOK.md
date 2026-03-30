# Delight Playbook for Grain Intel

How to make a grain trading dashboard feel delightful without sacrificing professionalism.

## Principle: Delight Through Clarity

The biggest source of delight in a data dashboard isn't animation. It's **the feeling of instantly understanding your position.** A trader who opens Grain Intel and knows the state of the book in 3 seconds is delighted. That's the primary delight target.

Secondary delight comes from the small things that make software feel alive and responsive.

---

## 1. Page Transitions

**Current state**: No transitions. Modules pop in instantly (jarring).

**Recommendation (inspired by Linear + Vercel)**:
- Fade-in on module switch: `opacity 0→1` over 150ms with `ease-out`
- Content slides up 8px during fade: `transform: translateY(8px)` → `translateY(0)`
- Implementation: wrap module content in a `<motion.div>` or CSS `@starting-style` transition
- DO NOT animate the sidebar or header. Only the main content area transitions.

**Cost**: ~30 lines of CSS. Zero libraries needed with CSS `@starting-style`.

---

## 2. Hover States and Micro-interactions

**Current state**: Basic hover color changes on buttons and nav items.

**Recommendations**:

### StatCards (inspired by Stripe)
- On hover: subtle `translateY(-1px)` lift + shadow increase
- Transition: 150ms ease-out
- Cursor: pointer (they're clickable on Morning Brief)

### Table Rows (inspired by Linear)
- On hover: background color shift (current `bg-surface-raised`)
- Add: row border-left highlight on hover (2px accent color, appears on hover)
- The highlighted row should feel "selected" without clicking

### Sidebar Nav Items (inspired by Linear)
- Active item: left border accent (2px) instead of background color change
- On hover: subtle background + text color shift (already doing this)

### Charts (inspired by TradingView + Robinhood)
- Tooltip follows cursor smoothly (not snapping to data points)
- Crosshair line appears on hover (vertical line across chart)
- Tooltip shows comparison to previous period

---

## 3. Loading States with Personality

**Current state**: No loading states (data loads instantly from localStorage).

**Recommendations**:

### Settlement Fetch (Yahoo Finance)
- Show per-commodity progress: "Fetching Corn... Soybeans... Wheat..."
- Each commodity name appears as the fetch completes
- Use a progress bar that fills per-commodity (not a spinner)
- On complete: brief green flash on the "Save" button

### Excel Upload
- Parse progress shown as: "Reading rows... Filtering... Validating..."
- Count animation: numbers tick up as rows are processed
- On complete: smooth transition from upload view to Morning Brief

---

## 4. Empty States That Are Useful

**Current state**: Ghost preview cards on upload screen (good start).

**Recommendations (inspired by Notion + Linear)**:

### No Market Data
Instead of "No data to display" in M2M tables:
- "Upload today's market data to see P&L calculations"
- Single "Go to Daily Inputs" button
- Subtle illustration of a chart being drawn (optional)

### No Alerts
Instead of just "No alerts":
- "All clear. Your book looks healthy." with a green checkmark
- Show last time alerts were checked: "As of 7:42 AM"

### First Visit
- Brief animated walkthrough: "Here's your morning routine" with 4 steps highlighted
- Dismissable, remembered via localStorage

---

## 5. Number Animations

**Inspired by Robinhood + Stripe**:

### KPI Values
- When data loads or changes, numbers should count up to their final value
- Duration: 400ms, ease-out
- Only animate on first load or significant change (>5%)
- Use `requestAnimationFrame` for smooth counting

### Delta Indicators
- ↑/↓ arrows fade in with a slight bounce (translateY -4px → 0)
- Green/red color applied simultaneously
- Duration: 200ms

### Implementation
```typescript
function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  // Count from 0 to value over 400ms on mount
  // Count from previousValue to value on change
}
```

---

## 6. Sound and Haptic Feedback

**Not recommended for v1.** Grain trading is a quiet, focused activity. Sound would be disruptive. Revisit only if the app moves to mobile (vibration on alert).

---

## 7. Print Polish

**Current state**: Print mode works but is purely functional.

**Recommendations**:
- Add "Grain Intel" watermark in footer of printed pages
- Add print date and data timestamp: "Printed 2026-03-30 at 7:45 AM from data uploaded at 7:30 AM"
- Add page breaks between modules if printing multiple
- QR code linking back to the live dashboard (optional, low priority)

---

## 8. Command Palette Delight (inspired by Linear)

**Current state**: Cmd+K opens palette with fuzzy search.

**Recommendations**:
- Add recently visited modules section at top (before search results)
- Add "Quick Actions" section: "Save Market Data", "Fetch Settlements", "Export All"
- Keyboard shortcut hints next to each module (1-9)
- On empty query: show all modules with keyboard hints (currently shows all, add hints)

---

## 9. Alert System Delight

**Current state**: Red bell badge, slide-out drawer.

**Recommendations (inspired by Linear)**:
- Alert count badge animates when count changes (brief scale-up 1.2x → 1.0x, 150ms)
- New alerts slide in from top of drawer (not just appear)
- Dismissed alerts fade out (not just disappear)
- Critical alerts: subtle red pulse on the bell icon (CSS animation, 2s loop)

---

## 10. The Signature Moment

Every great product has one. Robinhood has the green line. Stripe has the purple gradient. Linear has the speed.

**Grain Intel's signature moment should be: the Morning Brief landing.**

When the trader uploads their iRely data and the Morning Brief populates:
- KPI cards animate in sequence (left to right, 50ms stagger)
- Numbers count up from 0 to their values
- Alert badge counts up
- The whole thing takes about 800ms
- It should feel like the dashboard is "waking up" with the day's data

This is the moment the trader sees every morning. Make it feel alive.

---

## Implementation Priority

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Morning Brief landing animation | High | Medium | P0 |
| StatCard hover lift | High | Low | P0 |
| Number count animations | High | Medium | P1 |
| Page transitions (fade+slide) | Medium | Low | P1 |
| Table row hover enhancement | Medium | Low | P1 |
| Settlement fetch progress | Medium | Medium | P2 |
| Alert count animation | Low | Low | P2 |
| Command palette shortcuts | Medium | Low | P2 |
| Empty state improvements | Medium | Medium | P3 |
| Print polish | Low | Low | P3 |
