# Phase 8: Report Generation & Data - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate tax-ready reports with PDF/CSV export, import transactions from CSV, and manage recurring transactions. Full data export (JSON/CSV + attachments as ZIP) for data portability.

</domain>

<decisions>
## Implementation Decisions

### Tax Report Format
- Two-level grouping: by tag, then by month within each tag
- Line items show: date, payee, amount, receipt indicator (✓/✗)
- Combined report with sections: Income section at top, Expenses section below
- Full summary at end: total income, total expenses, net income, total transactions, receipt coverage %

### PDF Branding & Style
- Logo in top-left corner of first page header
- Full letterhead: business name, EIN, address if available
- Footer on every page: "Page X of Y" only (no date)
- Letter portrait format (8.5" x 11")

### CSV Import Workflow
- Manual column mapping: user explicitly maps each CSV column to a field
- Preview shows first 10-20 rows plus total count and error count
- Skip invalid rows: import valid rows, skip invalid, report what was skipped
- Unknown tags: prompt user for each unknown tag encountered (create new or map to existing)

### Recurring Transactions
- Flexible patterns: weekly, biweekly, monthly, quarterly, yearly, plus custom intervals (every N days/weeks/months)
- Manual confirm each: upcoming instances appear as pending, user confirms to create transaction
- Create editable copy on confirm: new transaction from template, can edit amount/date/etc before saving
- Optional end date: can set end date or leave open-ended (indefinite)

### Claude's Discretion
- PDF styling details (fonts, colors, margins)
- CSV date format detection
- How far ahead to show pending recurring instances
- Export file naming conventions
- ZIP structure for full data export

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-report-generation-data*
*Context gathered: 2026-02-02*
