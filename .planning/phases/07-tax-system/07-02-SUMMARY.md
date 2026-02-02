---
phase: 07-tax-system
plan: 02
subsystem: tax-configuration-ui
tags: [tax, settings, ui, forms]

dependency-graph:
  requires:
    - 07-01 (tax data infrastructure)
  provides:
    - "Tax configuration UI in workspace settings"
    - "State and federal bracket selection"
    - "Rate override and local EIT inputs"
    - "Tax forms reference section"
  affects:
    - 07-03 (taxes tab displays configured rates)
    - 07-04 (quarterly payment tracking uses taxConfigured flag)

tech-stack:
  added: []
  patterns:
    - "Expandable sections with $state toggle"
    - "Rate display/storage conversion (rate * 10000)"
    - "Derived values for dynamic content"
    - "Warnings in ActionData without blocking save"

key-files:
  created: []
  modified:
    - src/routes/w/[workspace]/settings/+page.svelte
    - src/routes/w/[workspace]/settings/+page.server.ts

decisions:
  - id: "rate-input-format"
    choice: "User enters '3.07', stored as 30700"
    rationale: "Human-readable input with integer precision storage"
  - id: "warning-thresholds"
    choice: "Warn at >15% state rate and >5% local EIT"
    rationale: "Based on CA max (13.3%) and typical local EIT ranges"
  - id: "tax-configured-logic"
    choice: "taxConfigured = true when state AND federalBracketRate both set"
    rationale: "Minimum required for meaningful tax calculations"

metrics:
  duration: "4 min"
  completed: "2026-02-02"
---

# Phase 7 Plan 2: Tax Configuration UI Summary

Tax configuration section added to workspace settings with state/federal selection, rate overrides, and tax forms reference.

## One-Liner

State/federal bracket dropdowns, custom rate inputs with warnings, expandable tax forms reference section.

## Commits

| Hash | Description |
|------|-------------|
| 415b359 | feat(07-02): add tax configuration UI to workspace settings |

## Key Implementation Details

### Tax Configuration Section

**Visibility:** Only shown when `data.settings.type === 'sole_prop'`

**Components:**
| Field | Type | Behavior |
|-------|------|----------|
| State | Dropdown | Shows all flat-rate states with rates (e.g., "Pennsylvania (3.07%)") |
| Federal Bracket | Dropdown | 7 brackets from 2026 data with expandable help section |
| State Override | Checkbox + Input | Optional custom rate; warns if >15% |
| Local EIT | Input | Optional; shows PA resource link when PA selected; warns if >5% |
| Tax Notes | Textarea | Free-form notes for user reference |

### Rate Conversion

- **Display format:** "3.07" (human-readable percentage)
- **Storage format:** 30700 (rate * 10000 for precision)
- `formatRateForDisplay()`: 30700 -> "3.07"
- `parseRateFromInput()`: "3.07" -> 30700

### Tax Forms Reference

- Expandable "Tax Forms & Resources" section
- Filters forms based on selected state
- Shows federal forms always, state forms when available
- Links to IRS/state revenue sites
- Includes due dates and filing thresholds
- Disclaimer about consulting tax professional

### Server-Side Validation

| Validation | Action |
|------------|--------|
| State not 2 chars | Fail with error |
| Invalid federal bracket | Fail with error |
| State rate > 15% | Warn but save |
| Local EIT > 5% | Warn but save |

### taxConfigured Flag

Set to `1` when:
- Workspace type is `sole_prop`
- State is selected
- Federal bracket is selected

This flag gates the taxes tab (07-03).

## Verification Results

1. Tax configuration section visible for sole_prop workspaces
2. State dropdown shows 9 flat-rate states with rates
3. Federal bracket dropdown shows 7 brackets with help section
4. Rate inputs accept decimal format (3.07)
5. Warnings display for unusual rates but don't block save
6. Tax forms section updates when state changes
7. Form links open in new tabs
8. Settings persist after save and reload
9. `npm run check` passes with 0 errors

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies for Next Plans

- **07-03:** Uses `taxConfigured` flag to show/hide taxes tab content
- **07-04:** Uses configured rates for quarterly payment calculations

## Notes

- State dropdown only includes flat-rate states (graduated states need manual override)
- PA-specific local EIT resource link only shows when PA is selected
- Warnings displayed client-side (in form) and returned from server (in ActionData)
- Rate precision uses * 10000 to handle rates like 3.07% accurately
