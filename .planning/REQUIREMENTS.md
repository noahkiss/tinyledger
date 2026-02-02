# Requirements: TinyLedger

**Defined:** 2026-01-24
**Core Value:** 10-second transaction entry that makes tax season painless

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Workspaces

- [x] **WKSP-01**: User can create a new workspace with name and type (sole prop or volunteer org)
- [x] **WKSP-02**: User can edit workspace details (name, type, business info)
- [x] **WKSP-03**: User can upload workspace logo (enforced dimensions) or use 2-letter abbreviation
- [x] **WKSP-04**: User can set business details (name, address, phone, responsible party)
- [x] **WKSP-05**: User can set founded year to enable historical fiscal year views
- [x] **WKSP-06**: User can switch between workspaces via logo dropdown in header
- [x] **WKSP-07**: Last-used workspace remembered per device (localStorage)
- [x] **WKSP-08**: New workspaces include pre-seeded common tags (Schedule C categories)

### Transactions

- [x] **TXNS-01**: User can create income transaction with amount, date, payee, tags, description, payment method
- [x] **TXNS-02**: User can create expense transaction with amount, date, payee, tags, description, payment method
- [x] **TXNS-03**: User can select payment method (cash, card, check with check number)
- [x] **TXNS-04**: User can assign multiple tags with allocation percentages (must sum to 100%)
- [x] **TXNS-05**: User can edit existing transactions
- [x] **TXNS-06**: User can void transactions (keeps record, excludes from totals)
- [x] **TXNS-07**: User can delete only already-voided transactions (soft delete)
- [x] **TXNS-08**: System tracks full edit history for audit trail

### Predictive Entry

- [x] **PRED-01**: Payee field autocompletes from transaction history (fuzzy/substring matching)
- [x] **PRED-02**: Tag suggestions appear based on selected payee's history
- [x] **PRED-03**: Amount pre-fills based on payee match (optional, user can override)

### Input UX

- [x] **INUX-01**: Currency input auto-formats (adds $ sign, .00 if no decimal)
- [x] **INUX-02**: Date input accepts flexible formats (with/without slashes)
- [x] **INUX-03**: Date input includes mobile-friendly date picker
- [x] **INUX-04**: Percentage input for tag allocation is intuitive and validates sum
- [x] **INUX-05**: Warning displayed if date is >1 year in future (fat-finger protection)

### Recurring Transactions

- [ ] **RCUR-01**: User can mark transaction as recurring with pattern (daily, weekly, bi-weekly, monthly, last Friday of month, etc.)
- [ ] **RCUR-02**: Future recurring instances appear as "pending" in timeline
- [ ] **RCUR-03**: Pending instances scoped to current fiscal year (option to view next FY)
- [ ] **RCUR-04**: User can confirm/edit pending instance when it occurs
- [ ] **RCUR-05**: User can void single pending instance (skip one occurrence)
- [ ] **RCUR-06**: User can delete all future instances (cancel remainder of series)
- [ ] **RCUR-07**: User can delete current and all future instances

### Attachments

- [x] **ATCH-01**: User can upload receipt attachment via file picker
- [x] **ATCH-02**: Attachments stored in workspace-namespaced filesystem directory
- [x] **ATCH-03**: User can view attachment full-size
- [x] **ATCH-04**: User can download attachment
- [x] **ATCH-05**: User can replace existing attachment
- [x] **ATCH-06**: Attachments auto-renamed smartly for bulk export (e.g., YYYY-MM-DD_Payee_Amount.ext)

### Timeline View

- [x] **TMLN-01**: Transaction feed displays for selected fiscal year
- [x] **TMLN-02**: Net Income YTD displayed prominently at top
- [x] **TMLN-03**: Large Income/Expense entry buttons accessible
- [x] **TMLN-04**: Visual timeline design with vertical line showing dates (Flowbite-inspired)
- [x] **TMLN-05**: "Scroll to current" auto-scrolls to most recent transaction
- [x] **TMLN-06**: Filter by payee (search)
- [x] **TMLN-07**: Filter by tags
- [x] **TMLN-08**: Filter by date range
- [x] **TMLN-09**: Filter by type (income/expense)
- [x] **TMLN-10**: Filter by payment method

### Fiscal Year

- [x] **FISC-01**: User can select fiscal year to view (dropdown/selector)
- [x] **FISC-02**: Fiscal year defaults to calendar year (Jan-Dec)
- [x] **FISC-03**: User can configure fiscal year start month in workspace settings
- [x] **FISC-04**: Historical fiscal years available back to founded year
- [x] **FISC-05**: Next fiscal year viewable (for recurring planning)

### Tags & Categories

- [x] **TAGS-01**: User can create tags on-the-fly during transaction entry
- [x] **TAGS-02**: Tags management page in settings (view, rename, merge, delete)
- [x] **TAGS-03**: Optional "lock tags" mode prevents new tag creation
- [x] **TAGS-04**: Pre-seeded tags based on IRS Schedule C categories

### Tax Configuration

- [x] **TAXC-01**: User can set federal tax bracket (pick from list or calculate from outside earnings)
- [ ] **TAXC-02**: User can enter estimated outside earnings to suggest bracket
- [x] **TAXC-03**: PA state tax rate pre-filled (3.07%)
- [x] **TAXC-04**: User can enter local EIT rate (required for sole prop workspaces)
- [x] **TAXC-05**: Tax notes field for user's reference (free-form with suggestions for what to include: agency links, forms, deadlines)

### Tax Calculations

- [x] **CALC-01**: Self-employment tax calculated correctly (15.3% of 92.35% of net income)
- [x] **CALC-02**: Federal income tax estimated based on bracket
- [x] **CALC-03**: PA state tax calculated (3.07% of net)
- [x] **CALC-04**: Local EIT calculated based on user-entered rate
- [x] **CALC-05**: Total estimated taxes YTD displayed
- [x] **CALC-06**: Projected year-end tax estimate displayed (based on current trajectory)
- [x] **CALC-07**: Recommended set-aside amount displayed (conservatively padded)

### Quarterly Payments

- [x] **QRTR-01**: Quarterly payment due dates visible in timeline (Apr 15, Jun 15, Sep 15, Jan 15)
- [x] **QRTR-02**: Projected quarterly payment amount displayed (refines as date approaches)
- [x] **QRTR-03**: User can mark quarterly payment as paid
- [x] **QRTR-04**: Paid quarterly payments show in timeline as completed

### Compliance Filings

- [x] **FIL-01**: Filings tab visible to both sole_prop and volunteer_org workspaces
- [x] **FIL-02**: Sole prop sees federal forms (Schedule C, SE, quarterly 1040-ES) and state forms (PA-40, quarterly PA-40 ES)
- [x] **FIL-03**: Volunteer org sees 990-N and state registration forms (BCO-10 for PA)
- [x] **FIL-04**: User can mark filings as complete with date filed, confirmation number, notes
- [x] **FIL-05**: Filings sorted by status (past-due first, then upcoming, then complete)

### Reports Dashboard

- [x] **RPTS-01**: Summary cards: YTD income, YTD expenses, net income, tax set-aside
- [x] **RPTS-02**: Chart: Net income over time (line chart)
- [x] **RPTS-03**: Chart: Spending by tag (pie or bar chart)
- [x] **RPTS-04**: Chart: Income vs expense by month (bar chart)

### Report Generation

- [ ] **RGEN-01**: User can generate tax-ready report for selected date range
- [ ] **RGEN-02**: Report grouped by tag with totals (CPA-friendly format)
- [ ] **RGEN-03**: Report includes transaction details and receipt attachment counts
- [ ] **RGEN-04**: PDF export with workspace branding (logo, business details)
- [ ] **RGEN-05**: CSV export option for spreadsheet/tax software import

### Data Export & Import

- [ ] **DATA-01**: User can export all data (JSON or CSV)
- [ ] **DATA-02**: User can export all attachments as ZIP
- [ ] **DATA-03**: User can import transactions from CSV
- [ ] **DATA-04**: Import validates and shows preview before committing

### Data Integrity

- [x] **INTG-01**: Void-first deletion model (void is default, delete only on voided items)
- [x] **INTG-02**: All deletes are soft deletes (deleted_at timestamp, data retained)
- [x] **INTG-03**: Full edit history tracked for each transaction (audit trail)
- [x] **INTG-04**: SQLite configured with WAL mode and busy_timeout

### Mobile & PWA

- [ ] **MOBL-01**: iOS home screen standalone mode configured (proper manifest, icons)
- [ ] **MOBL-02**: Apple touch icons provided (180x180, 192x192, 512x512)
- [ ] **MOBL-03**: Mobile-responsive design with large touch targets
- [ ] **MOBL-04**: Mobile-first layout (works great on phone, adapts to desktop)

### Deployment

- [ ] **DPLY-01**: Docker container with multi-stage build
- [ ] **DPLY-02**: docker-compose.yml with volume mounts for data persistence
- [ ] **DPLY-03**: Environment variable configuration (ORIGIN, DATA_DIR, BODY_SIZE_LIMIT)
- [ ] **DPLY-04**: Documentation for SQLite backup strategy

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Mileage Tracking

- **MILE-01**: User can log mileage as special transaction type
- **MILE-02**: Standard mileage rate pre-filled (IRS rate)
- **MILE-03**: Mileage deduction calculated and included in tax estimates

### Multi-State Tax

- **MTAX-01**: Support for states beyond PA
- **MTAX-02**: State tax rate lookup

### Receipt OCR

- **ROCR-01**: Auto-extract amount from receipt photo
- **ROCR-02**: Auto-extract payee/vendor from receipt photo

### Offline PWA

- **OFFL-01**: Full offline support with service worker
- **OFFL-02**: Sync when back online

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User authentication | Self-hosted on Tailscale, internal domain only |
| Multi-user/collaboration | Single user, multiple workspaces model |
| Bank balance tracking | We track income/expenses for taxes, not account balances |
| Bank sync (Plaid) | Security liability, subscription costs, vendor lock-in |
| Bank reconciliation | Overkill for target audience |
| Double-entry accounting | Single-entry is sufficient for sole props |
| Invoicing | Scope creep, Wave/FreshBooks do this |
| Payroll | Complex compliance, state-specific rules |
| Multi-currency | Target audience is US/local |
| Push notifications | Over-engineered for self-hosted |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WKSP-01 | Phase 1 | Complete |
| WKSP-02 | Phase 1 | Complete |
| WKSP-03 | Phase 1 | Complete |
| WKSP-04 | Phase 1 | Complete |
| WKSP-05 | Phase 1 | Complete |
| WKSP-06 | Phase 1 | Complete |
| WKSP-07 | Phase 1 | Complete |
| WKSP-08 | Phase 3 | Complete |
| TXNS-01 | Phase 2 | Complete |
| TXNS-02 | Phase 2 | Complete |
| TXNS-03 | Phase 2 | Complete |
| TXNS-04 | Phase 2 | Complete |
| TXNS-05 | Phase 2 | Complete |
| TXNS-06 | Phase 2 | Complete |
| TXNS-07 | Phase 2 | Complete |
| TXNS-08 | Phase 2 | Complete |
| PRED-01 | Phase 3 | Complete |
| PRED-02 | Phase 3 | Complete |
| PRED-03 | Phase 3 | Complete |
| INUX-01 | Phase 2 | Complete |
| INUX-02 | Phase 2 | Complete |
| INUX-03 | Phase 2 | Complete |
| INUX-04 | Phase 2 | Complete |
| INUX-05 | Phase 2 | Complete |
| RCUR-01 | Phase 8 | Pending |
| RCUR-02 | Phase 8 | Pending |
| RCUR-03 | Phase 8 | Pending |
| RCUR-04 | Phase 8 | Pending |
| RCUR-05 | Phase 8 | Pending |
| RCUR-06 | Phase 8 | Pending |
| RCUR-07 | Phase 8 | Pending |
| ATCH-01 | Phase 4 | Complete |
| ATCH-02 | Phase 4 | Complete |
| ATCH-03 | Phase 4 | Complete |
| ATCH-04 | Phase 4 | Complete |
| ATCH-05 | Phase 4 | Complete |
| ATCH-06 | Phase 4 | Complete |
| TMLN-01 | Phase 5 | Complete |
| TMLN-02 | Phase 5 | Complete |
| TMLN-03 | Phase 5 | Complete |
| TMLN-04 | Phase 5 | Complete |
| TMLN-05 | Phase 5 | Complete |
| TMLN-06 | Phase 5 | Complete |
| TMLN-07 | Phase 5 | Complete |
| TMLN-08 | Phase 5 | Complete |
| TMLN-09 | Phase 5 | Complete |
| TMLN-10 | Phase 5 | Complete |
| FISC-01 | Phase 5 | Complete |
| FISC-02 | Phase 5 | Complete |
| FISC-03 | Phase 5 | Complete |
| FISC-04 | Phase 5 | Complete |
| FISC-05 | Phase 5 | Complete |
| TAGS-01 | Phase 3 | Complete |
| TAGS-02 | Phase 3 | Complete |
| TAGS-03 | Phase 3 | Complete |
| TAGS-04 | Phase 3 | Complete |
| TAXC-01 | Phase 7 | Complete |
| TAXC-02 | Phase 7 | Partial |
| TAXC-03 | Phase 7 | Complete |
| TAXC-04 | Phase 7 | Complete |
| TAXC-05 | Phase 7 | Complete |
| CALC-01 | Phase 7 | Complete |
| CALC-02 | Phase 7 | Complete |
| CALC-03 | Phase 7 | Complete |
| CALC-04 | Phase 7 | Complete |
| CALC-05 | Phase 7 | Complete |
| CALC-06 | Phase 7 | Complete |
| CALC-07 | Phase 7 | Complete |
| QRTR-01 | Phase 7 | Complete |
| QRTR-02 | Phase 7 | Complete |
| QRTR-03 | Phase 7 | Complete |
| QRTR-04 | Phase 7 | Complete |
| FIL-01 | Phase 7.1 | Complete |
| FIL-02 | Phase 7.1 | Complete |
| FIL-03 | Phase 7.1 | Complete |
| FIL-04 | Phase 7.1 | Complete |
| FIL-05 | Phase 7.1 | Complete |
| RPTS-01 | Phase 6 | Complete |
| RPTS-02 | Phase 6 | Complete |
| RPTS-03 | Phase 6 | Complete |
| RPTS-04 | Phase 6 | Complete |
| RGEN-01 | Phase 8 | Pending |
| RGEN-02 | Phase 8 | Pending |
| RGEN-03 | Phase 8 | Pending |
| RGEN-04 | Phase 8 | Pending |
| RGEN-05 | Phase 8 | Pending |
| DATA-01 | Phase 8 | Pending |
| DATA-02 | Phase 8 | Pending |
| DATA-03 | Phase 8 | Pending |
| DATA-04 | Phase 8 | Pending |
| INTG-01 | Phase 2 | Complete |
| INTG-02 | Phase 2 | Complete |
| INTG-03 | Phase 2 | Complete |
| INTG-04 | Phase 1 | Complete |
| MOBL-01 | Phase 9 | Pending |
| MOBL-02 | Phase 9 | Pending |
| MOBL-03 | Phase 9 | Pending |
| MOBL-04 | Phase 9 | Pending |
| DPLY-01 | Phase 9 | Pending |
| DPLY-02 | Phase 9 | Pending |
| DPLY-03 | Phase 9 | Pending |
| DPLY-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 79 total
- Mapped to phases: 79
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-02-02 after Phase 7.1 completion*
