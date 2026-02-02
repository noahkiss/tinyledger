---
phase: 07-tax-system
plan: 04
subsystem: tax-timeline-integration
tags: [tax, timeline, reports, quarterly-payments]

dependency-graph:
  requires:
    - 07-01 (tax calculation utilities)
    - 07-02 (tax configuration UI)
    - 07-03 (taxes tab with quarterly tracking)
  provides:
    - "Quarterly payment markers in transaction timeline"
    - "Distinct visual style for tax milestones"
    - "Accurate tax set-aside based on configured rates"
    - "Configuration prompts for unconfigured workspaces"
  affects:
    - Future: notifications/reminders for upcoming due dates

tech-stack:
  added: []
  patterns:
    - "Timeline unification (transactions + quarterly markers)"
    - "Discriminated union for timeline items"
    - "Effective tax rate calculation"

key-files:
  created:
    - src/lib/components/QuarterlyPaymentMarker.svelte
  modified:
    - src/routes/w/[workspace]/transactions/+page.server.ts
    - src/routes/w/[workspace]/transactions/+page.svelte
    - src/routes/w/[workspace]/reports/+page.server.ts
    - src/routes/w/[workspace]/reports/+page.svelte
    - src/lib/components/TimelineDateMarker.svelte
    - src/lib/utils/reports.ts

decisions:
  - id: "timeline-merge-pattern"
    choice: "Merge quarterly payments into transaction groups by date"
    rationale: "Single sorted timeline with quarterly markers appearing before transactions on same date"
  - id: "tax-day-type"
    choice: "Add 'tax' day type with yellow dot marker"
    rationale: "Dates with only quarterly markers get distinct visual identity"
  - id: "effective-rate-display"
    choice: "Show effective tax rate in reports card"
    rationale: "User transparency - shows actual rate being used for calculation"

metrics:
  duration: "8 min"
  completed: "2026-02-02"
---

# Phase 7 Plan 4: Tax Timeline Integration Summary

Quarterly payment markers integrated into transaction timeline with distinct visual styling, and reports dashboard updated to use configured tax rates for accurate set-aside calculation.

## One-Liner

Quarterly tax due dates as dashed-border cards in timeline, reports dashboard with actual tax rates instead of 25% default.

## Commits

| Hash | Description |
|------|-------------|
| e222f05 | feat(07-04): add QuarterlyPaymentMarker component |
| 6261293 | feat(07-04): integrate quarterly markers into transaction timeline |
| 02b6932 | feat(07-04): use configured tax rates in reports dashboard |

## Key Implementation Details

### QuarterlyPaymentMarker Component

Visual design distinct from regular transactions:

| Element | Style |
|---------|-------|
| Border | Dashed (border-dashed border-2) |
| Icon | Calendar instead of payment method |
| Text size | Smaller overall (text-sm) |
| System label | "Q{n} Estimated Tax" |

Status-based styling:

| Status | Border/Background |
|--------|-------------------|
| Paid | border-green-400 bg-green-50 |
| Past Due | border-red-400 bg-red-50 |
| Upcoming | border-yellow-400 bg-yellow-50 |
| Default | border-gray-300 bg-gray-50 |

Content displays:
- If paid: Checkmark + "Federal $X | State $Y | Total $Z"
- If unpaid: "Recommended: Federal $X + State $Y = $Z"
- Link text: "View Details" (paid) or "Mark Paid" (unpaid)

### Timeline Integration

**Server-side changes (transactions/+page.server.ts):**
- Only loads quarterly data if `type === 'sole_prop' && taxConfigured === true`
- Calculates recommended federal/state split based on actual tax proportions
- Returns array of quarterly payment objects with status flags

**Client-side changes (transactions/+page.svelte):**
- New `timelineGroups` derived that merges transactions and quarterly payments by date
- Each group contains `{ transactions: Transaction[], quarterlyPayment: QuarterlyMarker | null }`
- Quarterly markers render BEFORE transactions on the same date
- Dates with only quarterly markers use 'tax' day type (yellow dot)

### TimelineDateMarker Update

Added 'tax' day type:
```typescript
dayType?: 'income' | 'expense' | 'mixed' | 'neutral' | 'tax'
// 'tax' -> 'bg-yellow-500' dot color
```

### Reports Tax Set-Aside

**Calculation logic:**
1. If `sole_prop && taxConfigured && netIncome > 0`:
   - Calculate actual taxes using configured rates
   - Sum: SE tax + federal + state + local
   - Calculate effective rate: total / netIncome
2. Else: Fall back to `TAX_SET_ASIDE_RATE (0.25)`

**UI display:**
- Shows effective rate below the value
- If not configured: Link to settings with "configure taxes for accuracy"
- If configured: Shows "Based on your configured rates (X.X% effective)"

### Helper Function Added

```typescript
// src/lib/utils/reports.ts
export function calculateEffectiveTaxRate(
  netIncomeCents: number,
  federalRate: number,
  stateRate: number,
  localRate: number
): number
```

## Verification Results

1. QuarterlyPaymentMarker component renders with dashed border and calendar icon
2. Timeline shows quarterly markers at correct due dates (Apr 15, Jun 15, Sep 15, Jan 15)
3. Paid payments show green checkmark in timeline
4. Past due payments show red warning styling
5. Upcoming payments (within 30 days) show yellow highlight
6. Clicking marker navigates to /w/{workspaceId}/taxes
7. Reports tax set-aside uses configured rates when available
8. Fallback to 25% when taxes not configured
9. `npm run check` passes (0 errors, 32 warnings)
10. Mobile responsive - markers readable on small screens

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies for Next Plans

Phase 7 (Tax System) is now complete. All 4 plans delivered:
- 07-01: Tax data infrastructure
- 07-02: Tax configuration UI
- 07-03: Taxes tab with breakdowns
- 07-04: Timeline integration and reports accuracy

## Notes

- Quarterly markers only appear for sole_prop workspaces with taxes configured
- Federal/state split uses actual proportions from tax calculation, not hardcoded 70/30
- The timeline now shows future quarterly due dates within the fiscal year view
- Users without configured taxes see prompt to configure for accuracy in reports
