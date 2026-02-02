---
phase: 07-tax-system
plan: 01
subsystem: tax-data
tags: [tax, schema, utilities, static-data]

dependency-graph:
  requires: []
  provides:
    - "Tax calculation utilities (SE, federal, state, local)"
    - "Static tax data (2026 brackets, state rates, forms)"
    - "Database schema for tax configuration"
    - "QuarterlyPayments table and types"
  affects:
    - 07-02 (tax configuration UI)
    - 07-03 (taxes tab)
    - 07-04 (quarterly payment tracking)

tech-stack:
  added: []
  patterns:
    - "Integer cents for tax calculations"
    - "Static bundled data vs API calls"
    - "Mode: boolean for SQLite boolean columns"

key-files:
  created:
    - src/lib/data/federal-brackets-2026.ts
    - src/lib/data/state-tax-rates.ts
    - src/lib/data/tax-forms.ts
    - src/lib/utils/tax-calculations.ts
  modified:
    - src/lib/server/db/schema.ts
    - src/lib/server/db/migrate.ts

decisions:
  - id: "wage-base-2026"
    choice: "$176,100 Social Security wage base"
    rationale: "2026 estimate from Tax Foundation research"
  - id: "rate-storage-precision"
    choice: "Store rates as rate * 10000 (e.g., 307 for 3.07%)"
    rationale: "Integer precision for rates with 2+ decimal places"
  - id: "flat-rate-states-only"
    choice: "Include only flat-rate states in static data"
    rationale: "Graduated states too complex for v1; users can manually override"

metrics:
  duration: "7 min"
  completed: "2026-02-02"
---

# Phase 7 Plan 1: Tax Data Infrastructure Summary

Tax calculation utilities and static data for 2026 federal brackets, state rates, and database schema for tax configuration.

## One-Liner

SE tax formula (15.3% of 92.35%), federal/state/EIT calculations, plus schema for tax config with quarterlyPayments table.

## Commits

| Hash | Description |
|------|-------------|
| 984e2a7 | feat(07-01): add static tax data files for federal brackets and state rates |
| bd9da02 | feat(07-01): add tax calculation utilities |
| 7d933ba | feat(07-01): extend database schema for tax configuration |

## Key Implementation Details

### Static Tax Data

**Federal Brackets (federal-brackets-2026.ts):**
- 7 brackets from 10% ($0-$11,925) to 37% ($626,351+)
- Single filer rates from Tax Foundation 2026 data
- Exports: `FEDERAL_BRACKETS_2026`, `FederalBracket`, `getBracketByRate()`

**State Tax Rates (state-tax-rates.ts):**
- 9 flat-rate states: PA, IL, MI, IN, CO, UT, NC, MA, KY
- PA: 3.07% (primary target state)
- Exports: `STATE_TAX_RATES`, `StateRate`, `getStateRate()`

**Tax Forms (tax-forms.ts):**
- Federal: Schedule C, Schedule SE, Form 1040-ES
- PA: PA-40, PA-40 ES
- Exports: `FEDERAL_FORMS`, `PA_FORMS`, `getFormsForState()`

### Tax Calculation Functions

All functions use integer cents to match codebase convention:

| Function | Formula | Notes |
|----------|---------|-------|
| `calculateSelfEmploymentTax()` | 15.3% of (net * 92.35%) | Returns breakdown: SS, Medicare, additional Medicare, deductible |
| `calculateFederalIncomeTax()` | (net - SE deduction) * bracket rate | Simplified bracket application |
| `calculateStateIncomeTax()` | net * state rate | Flat rate calculation |
| `calculateLocalEIT()` | net * EIT rate | Municipal earned income tax |
| `getQuarterlyDueDates()` | Apr 15, Jun 15, Sep 15, Jan 15 | Returns ISO dates with labels |
| `calculateQuarterlyPayments()` | Annualized income method | Accounts for payments already made |

### Database Schema Changes

**workspace_settings additions:**
| Column | Type | Purpose |
|--------|------|---------|
| state | TEXT | Two-letter state code (default PA) |
| federal_bracket_rate | INTEGER | Percentage (e.g., 22 for 22%) |
| state_rate_override | INTEGER | Rate * 10000 for precision |
| local_eit_rate | INTEGER | Rate * 10000 |
| tax_notes | TEXT | User reference notes |
| tax_configured | INTEGER | Boolean flag for setup state |

**quarterly_payments table:**
| Column | Type | Purpose |
|--------|------|---------|
| fiscal_year | INTEGER | Tax year |
| quarter | INTEGER | 1-4 |
| federal_paid_cents | INTEGER | Federal payment amount |
| state_paid_cents | INTEGER | State payment amount |
| paid_at | TEXT | Timestamp when marked paid |
| notes | TEXT | User notes |

## Verification Results

1. SE tax calculation verified: $100,000 net = $14,129.55 SE tax
2. Schema compiles with new fields
3. Migration runs without errors
4. All types exported correctly

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies for Next Plans

- **07-02:** Uses schema fields for tax configuration UI
- **07-03:** Uses calculation functions for taxes tab display
- **07-04:** Uses quarterlyPayments table for tracking

## Notes

- Wage base set to $176,100 (2026 estimate) - may need update when IRS confirms
- Static data designed for annual update (check Tax Foundation each November)
- Rate storage as rate * 10000 allows 4 decimal precision for state rates
