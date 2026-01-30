# Phase 5: Timeline & Navigation - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Fiscal year navigation and filtered transaction timeline. Users can view transactions by fiscal year, filter by various criteria, and quickly add new transactions from the timeline view. Reporting and tax calculations are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Timeline layout
- Group transactions by day, skip days with no transactions
- Vertical date line on left edge with date markers, transactions to the right
- Standard info density per entry: payee, amount, primary tag, attachment indicator
- Income/expense distinguished by color + icon (green up arrow / red down arrow)

### Year switching
- Dropdown in sticky header to select fiscal year
- Custom fiscal year start month configurable in workspace settings
- Sticky header shows: fiscal year picker + income/expense/net totals
- Year options go back to workspace founded year
- Empty years should show indication but still be selectable (user may want to enter historical transactions)

### Filtering behavior
- Persistent filter bar below sticky header
- Live transaction count updates as filters change
- Filter logic: OR within same filter type, AND across different types
  - e.g., (tag A OR tag B) AND (income type) AND (date range)
- Available filters: payee, tags, date range, type (income/expense), payment method

### Quick entry
- Single floating "+" button at bottom of screen
- Tapping opens entry form (slide-up sheet on mobile, modal on desktop)
- Default to Income type when form opens
- Toggle to expense via greyed minus symbol that turns red when active
- After save: form clears but stays open for rapid entry
- Clicking outside form closes it

### Claude's Discretion
- Filter persistence across sessions
- Exact visual design of date line and transaction cards
- Animation transitions between years
- Empty state design for years with no transactions
- Loading skeleton patterns

</decisions>

<specifics>
## Specific Ideas

- Reference inspiration: vertical timeline with date markers on left, cards to the right (Dribbble example shared)
- Income/expense toggle should feel like a quick tap, not a dropdown selection
- Rapid entry workflow is important — minimize friction for entering multiple transactions in a row

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-timeline-navigation*
*Context gathered: 2026-01-30*
