---
phase: 07-tax-system
plan: 03
subsystem: taxes-tab
tags: [tax, ui, quarterly-payments, breakdown]

dependency-graph:
  requires:
    - 07-01 (tax data infrastructure)
    - 07-02 (tax configuration UI)
  provides:
    - "Dedicated taxes tab with full breakdown"
    - "Quarterly payment tracking with mark-as-paid"
    - "Tax calculation transparency with formulas"
    - "Configuration prompt for unconfigured workspaces"
  affects:
    - 07-04 (may enhance quarterly payment features)

tech-stack:
  added: []
  patterns:
    - "$derived for conditional nav tabs"
    - "Discriminated union return type (needsConfiguration)"
    - "Set-based state for tracking open forms"
    - "Upsert pattern for quarterly payments"

key-files:
  created:
    - src/lib/components/TaxBreakdownCard.svelte
    - src/routes/w/[workspace]/taxes/+page.svelte
    - src/routes/w/[workspace]/taxes/+page.server.ts
  modified:
    - src/routes/w/[workspace]/+layout.svelte

decisions:
  - id: "70-30-payment-split"
    choice: "Default federal/state payment split 70%/30%"
    rationale: "Approximate typical sole prop ratio; user can adjust"
  - id: "collapsible-forms-reference"
    choice: "Tax forms in collapsible details element"
    rationale: "Secondary content that doesn't need to be visible by default"
  - id: "payment-status-colors"
    choice: "Green=paid, red=past-due, yellow=upcoming"
    rationale: "Standard traffic light semantics for urgency"

metrics:
  duration: "6 min"
  completed: "2026-02-02"
---

# Phase 7 Plan 3: Taxes Tab Summary

Dedicated taxes tab with full tax breakdown, calculation transparency, and quarterly payment tracking with mark-as-paid functionality.

## One-Liner

Full SE/federal/state/local tax breakdown with expandable formulas, quarterly payment cards with status badges, and mark-as-paid forms.

## Commits

| Hash | Description |
|------|-------------|
| efc3f7b | feat(07-03): add TaxBreakdownCard component |
| 0f12ea5 | feat(07-03): add taxes tab server load and actions |
| 6484486 | feat(07-03): add taxes tab UI with breakdown and quarterly tracking |

## Key Implementation Details

### TaxBreakdownCard Component

Reusable expandable card for displaying tax breakdowns:

| Prop | Type | Purpose |
|------|------|---------|
| title | string | Card title (e.g., "Self-Employment Tax") |
| totalCents | number | Total amount displayed in header |
| items | array | Line items with label, amount, optional formula |
| expanded | boolean | Initial expanded state |
| variant | 'default' \| 'summary' | Summary = non-expandable |

Features:
- Chevron icon rotates on expand/collapse
- Formula text shows in smaller gray below label
- Summary variant for grand total display (no expand)

### Taxes Page Server

**Load function returns:**
- `needsConfiguration: true` when taxConfigured = false (discriminated union)
- Full tax breakdown when configured:
  - selfEmployment: taxable, SS, Medicare, additional Medicare, deductible
  - federal: totalCents, rate, adjustedIncomeCents
  - state: totalCents, rate, stateName
  - local: totalCents, rate
  - grandTotal: sum of all taxes
- quarterlyPayments: schedule with paid status from database
- formChecklist: applicable tax forms for state

**Rate conversion:**
| Stored | Format | Conversion |
|--------|--------|------------|
| federalBracketRate | 22 | / 100 = 0.22 |
| stateRateOverride | 307 | / 10000 = 0.0307 |
| localEitRate | 100 | / 10000 = 0.01 |

**Actions:**
- `markPaid`: upserts quarterlyPayments record with federal/state amounts
- `unmarkPaid`: deletes quarterlyPayments record

### Taxes Page UI

**Configuration required state:**
- Yellow warning card with setup prompt
- Link to settings page

**Main view sections:**
1. Header with fiscal year picker
2. Disclaimer banner (estimates only)
3. Net income summary card
4. Tax breakdown grid (2-column on desktop):
   - Self-Employment Tax card
   - Federal Income Tax card
   - State Tax card
   - Local EIT card (if configured)
   - Grand Total card (summary variant)
5. Quarterly payments grid (4 cards)
6. Tax forms reference (collapsible)

**Quarterly payment cards:**
| Status | Badge | Border/Background |
|--------|-------|-------------------|
| Paid | Green "Paid" | border-green-300 bg-green-50 |
| Past Due | Red "Past Due" | border-red-300 bg-red-50 |
| Upcoming | Yellow "Upcoming" | border-yellow-300 bg-yellow-50 |
| Future | None | border-gray-200 bg-white |

**Mark as paid form:**
- Opens inline below card
- Fields: federal amount, state amount, notes
- Default split: 70% federal, 30% state
- Uses form enhancement

### Layout Update

Added Taxes tab to navigation for sole_prop workspaces:
```javascript
const navTabs = $derived(
  data.settings.type === 'sole_prop'
    ? [...baseNavTabs, { href: 'taxes', label: 'Taxes' }]
    : baseNavTabs
);
```

## Verification Results

1. TaxBreakdownCard renders and expands correctly
2. Taxes tab appears for sole_prop workspaces only
3. Configuration prompt shows when taxConfigured = false
4. Tax breakdown shows all 4 tax types with formulas
5. Quarterly payments show with correct status colors
6. Mark as paid form submits and persists
7. Unmark as paid resets payment status
8. Formulas display actual calculated values
9. Disclaimer banner visible at top
10. `npm run check` passes (0 errors)

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies for Next Plans

- **07-04:** Quarterly payment tracking is complete; plan may enhance with reminders/notifications

## Notes

- Payment split defaults (70/30) are approximations; user can adjust before marking paid
- Tax forms reference is collapsible since it's secondary information
- Quarterly payment status is calculated dynamically from due dates and database records
- Local EIT card only shows if localEitRate > 0
