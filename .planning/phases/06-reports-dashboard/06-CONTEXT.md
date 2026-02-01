# Phase 6: Reports Dashboard - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual financial summary dashboard with summary cards and charts. Users can view YTD metrics, spending breakdown by tag, and income vs expense trends. Clicking chart elements filters the transaction list. Tax calculations and PDF export are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Summary Cards Layout
- Net income hero card at top, three supporting cards (income, expenses, tax set-aside) below
- Hero card shows dollar amount with inline sparkline showing trend
- All cards show % change vs previous period (e.g., "+12% vs last month")
- Subtle background colors with colored accent borders/icons (not bold green/red fills)

### Chart Library & Style
- Use Chart.js for all charts (lightweight, canvas-based)
- Charts are interactive: clicking a category/bar filters the transaction list
- Visual style should match existing TinyLedger aesthetic

### Claude's Discretion
- Spending breakdown chart type (donut vs horizontal bar) — pick based on data characteristics
- Whether to reuse existing FY picker or create reports-specific controls — optimize for consistency

### Time Period Controls
- Monthly and quarterly granularity toggle available
- Toggle appears as dropdown menu near charts
- Partial periods (current month/quarter) show actual values with "as of today" indicator — no projections

### Claude's Discretion
- Mobile time period control placement (sticky header vs scroll away)

### Mobile Presentation
- All four summary cards stack vertically on mobile
- Charts display full width, stacked vertically (scroll to see each)
- Tap chart element to show tooltip, tap elsewhere to dismiss
- Tap-to-filter navigation also works on mobile

</decisions>

<specifics>
## Specific Ideas

- Hero card with sparkline inspired by modern fintech dashboards
- Click-to-filter on charts should navigate to transactions page with filter applied (like a drill-down)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-reports-dashboard*
*Context gathered: 2026-02-01*
