# TODOS

## P2 — Test All Existing Hooks
**What:** Add unit tests for all 7 existing hooks (useNetPosition, useDeliveryTimeline, useBasisSpread, useCustomerAnalysis, useRiskProfile, useScenario, useDataHealth).
**Why:** Zero test coverage on core business logic. All hooks are pure `useMemo` computations — highly testable. Vitest infrastructure is now in place after the net exposure feature.
**Effort:** human: ~2 days / CC: ~30min
**Depends on:** Net exposure feature (ships Vitest infrastructure)

## P2 — Create CLAUDE.md
**What:** Create a project conventions doc covering the 9 global data rules, freight term normalization ("Deliver" = "Dlvd"), organic trade filter (basis >= 3.0), file structure guide, commodity color mapping, and hash routing conventions.
**Why:** Every new Claude session starts from scratch understanding these conventions. A CLAUDE.md would make future sessions ~3x faster to ramp up.
**Effort:** human: ~2hr / CC: ~10min
**Depends on:** Nothing

## P3 — Keyboard Shortcuts
**What:** Cmd+1-6 module switching, Cmd+U upload, Cmd+P print.
**Why:** Power user efficiency for daily use by merchandising team.
**Effort:** human: ~4hr / CC: ~15min
**Depends on:** Nothing

## P3 — Real-Time Streaming Quotes
**What:** Add real-time or near-real-time futures price updates via WebSocket or polling, replacing the current end-of-day Yahoo Finance fetch.
**Why:** Intraday price visibility would let traders see live P&L changes and make faster basis/pricing decisions during market hours.
**Effort:** human: ~1 week / CC: ~1hr
**Depends on:** Yahoo Finance integration (done), WebSocket-capable data provider (need to evaluate: Polygon.io, Databento, or similar — Yahoo Finance does not offer WebSocket)
**Notes:** Current Yahoo Finance setup provides adequate end-of-day data for daily M2M. Real-time is a nice-to-have, not blocking daily workflow. May require a paid data subscription ($29-99/mo range).

## P2 — iRely API Integration
**What:** Replace manual Excel upload with automated data pull from iRely i21 API.
**Why:** Eliminates manual export step for daily workflow.
**Effort:** human: ~2 weeks / CC: ~2hr
**Blocked by:** API access from iRely (not yet established)
