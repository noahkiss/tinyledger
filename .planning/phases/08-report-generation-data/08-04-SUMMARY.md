---
phase: 08-report-generation-data
plan: 04
subsystem: recurring-transactions
tags: [rrule, recurring, templates, timeline]
completed: 2026-02-03
duration: 11 min

requires:
  - 02-core-transactions (transaction schema)
  - 03-tags-categories (tag allocation pattern)

provides:
  - recurring_templates table and CRUD
  - pending instance display in timeline
  - confirm/skip workflow for recurring

affects:
  - 09-polish (may want recurring status in dashboard)

tech-stack:
  added: [rrule]
  patterns: [rrule-pattern-storage, pending-instance-calculation]

key-files:
  created:
    - src/lib/server/recurring/patterns.ts
    - src/lib/server/recurring/instances.ts
    - src/routes/w/[workspace]/recurring/+page.server.ts
    - src/routes/w/[workspace]/recurring/+page.svelte
  modified:
    - package.json
    - src/lib/server/db/schema.ts
    - src/lib/server/db/migrate.ts
    - src/routes/w/[workspace]/transactions/+page.server.ts
    - src/routes/w/[workspace]/transactions/+page.svelte
    - src/routes/w/[workspace]/transactions/new/+page.server.ts
    - src/routes/w/[workspace]/transactions/new/+page.svelte
    - src/routes/w/[workspace]/settings/+page.svelte
    - src/lib/components/TimelineDateMarker.svelte

decisions:
  - name: rrule-for-patterns
    choice: rrule library for recurring pattern generation
    rationale: Standard iCal RRULE format, battle-tested for date recurrence
  - name: rrule-string-storage
    choice: Store rrule.toString() in database
    rationale: Portable format, easy to parse back, future-proof
  - name: pending-instance-calculation
    choice: Calculate pending instances at load time
    rationale: No stale data, respects confirmed/skipped dates dynamically
  - name: prefill-via-url
    choice: Pass recurring template via URL params for prefill
    rationale: Simple, stateless, works with browser back button
  - name: soft-deactivate
    choice: Deactivate vs delete for stopping recurring
    rationale: Preserve history, allow reactivation if needed

metrics:
  duration: 11 min
  tasks: 3
  commits: 3
---

# Phase 8 Plan 4: Recurring Transactions Summary

Recurring transaction templates with rrule-based patterns, pending instance timeline display, and confirm/skip workflow.

## What Was Built

### Database Schema
- **recurring_templates** table storing template data and rrule string
- **recurring_template_tags** junction table for tag allocations
- **skipped_instances** table tracking voided occurrences
- Added `recurring_template_id` column to transactions for confirmed links

### Pattern Utilities (`src/lib/server/recurring/`)
- **patterns.ts**: `createRRule()` and `getPatternDescription()` for pattern creation
- **instances.ts**: `getPendingInstances()` and `getAllPendingForTimeline()` for occurrence calculation
- Supports daily, weekly, biweekly, monthly, quarterly, yearly, and custom intervals

### Recurring Management Page (`/w/{workspace}/recurring`)
- Create recurring template form with:
  - Type (income/expense)
  - Amount, payee, description
  - Payment method
  - Tag allocations
  - Pattern selector (preset + custom interval)
  - Start date and optional end date
- Active templates list with edit, deactivate, delete actions
- Inactive templates list with reactivate option
- Next occurrence date displayed for active templates

### Timeline Integration
- Pending instances appear in transactions timeline
- Visual distinction: dashed border, muted colors, "Pending" badge
- Confirm button navigates to prefilled transaction form
- Skip button records date in skipped_instances table
- Timeline date marker supports new "pending" type (gray dot)

### Transaction Creation Flow
- URL params `from_recurring` and `date` trigger prefill
- Form pre-populated with template data
- Hidden field passes `recurringTemplateId` on submit
- Confirmed transaction linked to template for tracking

## Pattern Support

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| Daily | Every day | RRule.DAILY |
| Weekly | Every week | RRule.WEEKLY |
| Biweekly | Every 2 weeks | RRule.WEEKLY, interval=2 |
| Monthly | Every month | RRule.MONTHLY |
| Quarterly | Every 3 months | RRule.MONTHLY, interval=3 |
| Yearly | Every year | RRule.YEARLY |
| Custom | Every N days/weeks/months | User-defined interval and unit |

## User Workflow

1. Create recurring template on `/recurring` page
2. View upcoming pending instances in transactions timeline
3. Click "Confirm" to create real transaction (editable before save)
4. Or click "Skip" to hide that specific occurrence
5. Deactivate template to stop all future occurrences
6. Reactivate to resume generating pending instances

## Commits

| Hash | Description |
|------|-------------|
| c77e579 | Add recurring templates schema and rrule dependency |
| 71b9035 | Create recurring pattern utilities |
| 36accc1 | Create recurring page and timeline integration |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 8 complete. All four plans executed:
- 08-01: Tax Report PDF generation
- 08-02: Data Export (CSV, JSON, ZIP)
- 08-03: CSV Import Wizard
- 08-04: Recurring Transactions

Ready for Phase 9 (Polish & Mobile).
