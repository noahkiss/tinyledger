---
phase: 08
plan: 03
subsystem: data-import
tags: [csv, import, wizard, papaparse, date-parsing]
duration: 15min
completed: 2026-02-03
dependency-graph:
  requires: [08-02]
  provides: [csv-import-wizard, date-detector, csv-parser]
  affects: [transactions, tags]
tech-stack:
  added: []
  patterns: [wizard-flow, multi-step-form, auto-suggest]
key-files:
  created:
    - src/lib/server/import/date-detector.ts
    - src/lib/server/import/csv-parser.ts
    - src/routes/w/[workspace]/import/+page.server.ts
    - src/routes/w/[workspace]/import/+page.svelte
  modified:
    - src/routes/w/[workspace]/settings/+page.svelte
decisions:
  - papaparse for CSV parsing (already installed for export)
  - multi-format date detection (US, ISO, European, Asian)
  - 4-step wizard (Upload, Map, Preview, Results)
  - auto-suggest column mappings from header names
  - unknown tags: create new or map to existing
  - equal allocation for multiple tags per transaction
metrics:
  tasks: 3
  commits: 3
---

# Phase 08 Plan 03: CSV Import Wizard Summary

CSV import workflow with file upload, column mapping, validation preview, unknown tag handling, and batch import with skip-invalid behavior.

## What Was Built

### Date Detection Utility (src/lib/server/import/date-detector.ts)

Multi-format date parser supporting 10 common formats:
- ISO: 2026-01-15
- US: 01/15/2026, 1/15/2026
- European: 15/01/2026
- Text: Jan 15, 2026, January 15, 2026
- Asian: 2026/01/15

Exports:
- `parseDate(dateStr)`: Returns YYYY-MM-DD or null
- `detectDateFormat(samples)`: Detects most likely format from samples

### CSV Parser Utility (src/lib/server/import/csv-parser.ts)

Uses papaparse for robust CSV parsing:
- `parseCSVPreview(csvText, previewRows)`: Returns headers and first N rows
- `validateCSVWithMapping(csvText, mapping, existingTags)`: Validates all rows with column mapping

Amount parsing handles:
- Currency symbols ($)
- Commas (1,234.56)
- Accounting negatives ((50.00))
- Negative signs (-50.00)

### Import Wizard Page (src/routes/w/[workspace]/import/)

4-step wizard flow:

1. **Upload**: File input accepting .csv (5MB max)
2. **Map Columns**: Dropdowns to map CSV headers to fields
   - Required: Date, Type, Payee, Amount
   - Optional: Description, Tags, Payment Method, Check Number
   - Auto-suggests mappings from header names (date, type, payee, etc.)
3. **Preview**: Shows validation results
   - Valid/invalid counts
   - Preview table of parsed transactions
   - Unknown tag handling UI (create new or map to existing)
4. **Results**: Import summary with success/skip counts

### Settings Integration

Data Export section renamed to "Data Import & Export" with Import link at top.

## Key Patterns

### Column Mapping Auto-Suggest

```typescript
const lower = headers.map((h) => h.toLowerCase());
const dateIdx = lower.findIndex((h) => h.includes('date') || h === 'when');
```

Looks for common column name patterns to pre-populate mapping.

### Tag Allocation on Import

For transactions with multiple tags, allocates equal percentages:

```typescript
const basePercentage = Math.floor(100 / tx.tags.length);
const remainder = 100 - basePercentage * tx.tags.length;
// First tag gets remainder to ensure 100% total
```

### Unknown Tag Resolution

Two options for each unknown tag:
- Create new: Adds to createTags array
- Map to existing: Adds to tagMappings object

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| papaparse for CSV | Already installed for export, handles edge cases |
| 10 date formats | Cover common US, European, ISO formats |
| Auto-suggest mappings | Reduce user effort when headers match expected patterns |
| Equal tag allocation | Simple default; users can edit transactions for custom splits |
| Unknown tags UI | Let users decide rather than auto-creating or ignoring |
| History records | Imported transactions get "created" action tracked |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

1. `b72245a` feat(08-03): add CSV parsing and date detection utilities
2. `fbce02d` feat(08-03): add CSV import wizard page
3. `bb0ee59` feat(08-03): add import link to Settings page

## Testing Done

1. Preview action parses CSV correctly (5 rows, correct headers)
2. Validate action identifies unknown tags (Consulting, Design)
3. Import action creates transactions with correct amounts
4. Tags created during import
5. History records created for imported transactions
6. Settings page shows Import link in Data Import & Export section

## Files Changed

```
src/lib/server/import/date-detector.ts  (+67)  - New file
src/lib/server/import/csv-parser.ts     (+181) - New file
src/routes/w/[workspace]/import/+page.server.ts (+222) - New file
src/routes/w/[workspace]/import/+page.svelte    (+544) - New file
src/routes/w/[workspace]/settings/+page.svelte  (+22, -3)
```

## Next Phase Readiness

CSV import is complete. Users can now:
- Import historical transaction data from spreadsheets
- Map columns to transaction fields
- Handle unknown tags during import
- Review validation before committing

Phase 8 Plan 4 (final): Backup/restore and data migration.
