# Roadmap: TinyLedger

## Overview

TinyLedger delivers a lightweight, mobile-first ledger for sole proprietors in 9 phases. The journey starts with workspace isolation and core database infrastructure (foundation), builds up transaction entry with tags and attachments (the daily workflow), then adds fiscal year navigation and timeline views. Reporting and tax calculations follow, culminating in mobile polish and Docker deployment. Every phase delivers observable user value while respecting the dependency chain: workspace isolation enables everything, tags with allocation enable accurate reporting, attachments enable receipt counts in reports, and reports enable tax calculations.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Workspace isolation, database layer, void-first model
- [x] **Phase 2: Core Transactions** - Income/expense entry, edit, void operations
- [x] **Phase 3: Tags & Categories** - Tag system with allocation percentages
- [x] **Phase 4: Attachments** - Receipt upload, storage, and management
- [ ] **Phase 5: Timeline & Navigation** - Fiscal year views, filtering, timeline UI
- [ ] **Phase 6: Reports Dashboard** - Summary cards and charts
- [ ] **Phase 7: Tax System** - Configuration, calculations, quarterly payments
- [ ] **Phase 8: Report Generation & Data** - PDF/CSV export, import, full data export
- [ ] **Phase 9: Mobile & Deployment** - PWA configuration, Docker, production readiness

## Phase Details

### Phase 1: Foundation
**Goal**: Working SvelteKit project with workspace-isolated SQLite architecture
**Depends on**: Nothing (first phase)
**Requirements**: WKSP-01, WKSP-02, WKSP-03, WKSP-04, WKSP-05, WKSP-06, WKSP-07, INTG-04
**Success Criteria** (what must be TRUE):
  1. User can create a new workspace and access it via unique URL path
  2. User can switch between multiple workspaces via header dropdown
  3. User can edit workspace details (name, type, business info, logo)
  4. Each workspace has isolated SQLite database with WAL mode enabled
  5. Last-used workspace is remembered when returning to the app
**Plans**: 2 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md - SvelteKit project + database infrastructure (Wave 1)
- [x] 01-02-PLAN.md - Workspace CRUD, settings UI, header switcher (Wave 2)

### Phase 2: Core Transactions
**Goal**: User can create, edit, and void income/expense transactions
**Depends on**: Phase 1
**Requirements**: TXNS-01, TXNS-02, TXNS-03, TXNS-04, TXNS-05, TXNS-06, TXNS-07, TXNS-08, INUX-01, INUX-02, INUX-03, INUX-04, INUX-05, INTG-01, INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. User can create income/expense transaction with amount, date, payee, description, payment method
  2. User can assign multiple tags with allocation percentages that sum to 100%
  3. Currency and date inputs auto-format with mobile-friendly pickers
  4. User can edit existing transactions with full edit history tracked
  5. User can void transactions (keeps record) and delete only voided items (soft delete)
**Plans**: 4 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md - Database schema extension with transaction tables (Wave 1)
- [x] 02-02-PLAN.md - Input components: currency, date, tags, payment method (Wave 2)
- [x] 02-03-PLAN.md - Create transaction form and list view (Wave 3)
- [x] 02-04-PLAN.md - View/edit transaction, void/delete, history (Wave 3)

### Phase 3: Tags & Categories
**Goal**: Complete tag management system with Schedule C pre-seeding
**Depends on**: Phase 2
**Requirements**: TAGS-01, TAGS-02, TAGS-03, TAGS-04, WKSP-08, PRED-01, PRED-02, PRED-03
**Success Criteria** (what must be TRUE):
  1. User can create tags on-the-fly during transaction entry
  2. Tags management page allows viewing, renaming, merging, and deleting tags
  3. New workspaces include pre-seeded Schedule C categories
  4. Payee field autocompletes from history with fuzzy matching
  5. Tag suggestions appear based on selected payee's transaction history
**Plans**: 2 plans in 1 wave

Plans:
- [x] 03-01-PLAN.md - Tag infrastructure: Schedule C seeding, lock mode, tags management page (Wave 1)
- [x] 03-02-PLAN.md - Predictive entry: payee autocomplete, tag suggestions, inline creation (Wave 1)

### Phase 4: Attachments
**Goal**: Receipt attachment system with workspace-namespaced storage
**Depends on**: Phase 2
**Requirements**: ATCH-01, ATCH-02, ATCH-03, ATCH-04, ATCH-05, ATCH-06
**Success Criteria** (what must be TRUE):
  1. User can upload receipt attachment during transaction entry
  2. Attachments are stored in workspace-namespaced filesystem directory
  3. User can view attachment full-size and download it
  4. User can replace existing attachment on a transaction
  5. Attachments are auto-renamed for bulk export (YYYY-MM-DD_Payee_Amount.ext)
**Plans**: 2 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md - Storage infrastructure: schema, storage module, API endpoint (Wave 1)
- [x] 04-02-PLAN.md - UI integration: AttachmentUpload component, form integration, detail view (Wave 2)

### Phase 5: Timeline & Navigation
**Goal**: Fiscal year navigation and filtered transaction timeline
**Depends on**: Phase 2, Phase 3
**Requirements**: TMLN-01, TMLN-02, TMLN-03, TMLN-04, TMLN-05, TMLN-06, TMLN-07, TMLN-08, TMLN-09, TMLN-10, FISC-01, FISC-02, FISC-03, FISC-04, FISC-05
**Success Criteria** (what must be TRUE):
  1. User can view transactions for selected fiscal year with Net Income YTD displayed
  2. User can switch between fiscal years (current year default, historical back to founded year)
  3. Timeline shows visual design with vertical date line and large Income/Expense buttons
  4. User can filter transactions by payee, tags, date range, type, and payment method
  5. Scroll-to-current auto-scrolls to most recent transaction
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Reports Dashboard
**Goal**: Summary cards and visual charts for financial overview
**Depends on**: Phase 5
**Requirements**: RPTS-01, RPTS-02, RPTS-03, RPTS-04
**Success Criteria** (what must be TRUE):
  1. Summary cards display YTD income, YTD expenses, net income, and tax set-aside
  2. Line chart shows net income over time
  3. Pie or bar chart shows spending breakdown by tag
  4. Bar chart shows income vs expense by month
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Tax System
**Goal**: Tax configuration, calculations, and quarterly payment tracking
**Depends on**: Phase 6
**Requirements**: TAXC-01, TAXC-02, TAXC-03, TAXC-04, TAXC-05, CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, QRTR-01, QRTR-02, QRTR-03, QRTR-04
**Success Criteria** (what must be TRUE):
  1. User can configure federal tax bracket, PA state rate (3.07%), and local EIT rate
  2. Self-employment tax calculated correctly (15.3% of 92.35% of net income)
  3. Total estimated taxes YTD and projected year-end estimate displayed
  4. Quarterly payment due dates visible in timeline with projected amounts
  5. User can mark quarterly payments as paid and see them as completed
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Report Generation & Data
**Goal**: Tax-ready reports, PDF/CSV export, data import/export
**Depends on**: Phase 4, Phase 7
**Requirements**: RGEN-01, RGEN-02, RGEN-03, RGEN-04, RGEN-05, DATA-01, DATA-02, DATA-03, DATA-04, RCUR-01, RCUR-02, RCUR-03, RCUR-04, RCUR-05, RCUR-06, RCUR-07
**Success Criteria** (what must be TRUE):
  1. User can generate tax-ready report grouped by tag with totals and receipt counts
  2. PDF export includes workspace branding (logo, business details)
  3. User can export all data (JSON/CSV) and attachments as ZIP
  4. User can import transactions from CSV with preview before commit
  5. User can create recurring transactions with flexible patterns, confirm/void/delete instances
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Mobile & Deployment
**Goal**: iOS home screen app experience and Docker production deployment
**Depends on**: Phase 8
**Requirements**: MOBL-01, MOBL-02, MOBL-03, MOBL-04, DPLY-01, DPLY-02, DPLY-03, DPLY-04
**Success Criteria** (what must be TRUE):
  1. App installable to iOS home screen with proper icons and standalone mode
  2. Mobile-responsive design with large touch targets works great on phone
  3. Docker container builds with multi-stage build and runs with volume mounts
  4. Environment variables configure ORIGIN, DATA_DIR, and BODY_SIZE_LIMIT
  5. SQLite backup strategy documented and tested
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-01-25 |
| 2. Core Transactions | 4/4 | Complete | 2026-01-25 |
| 3. Tags & Categories | 2/2 | Complete | 2026-01-25 |
| 4. Attachments | 2/2 | Complete | 2026-01-30 |
| 5. Timeline & Navigation | 0/2 | Not started | - |
| 6. Reports Dashboard | 0/1 | Not started | - |
| 7. Tax System | 0/2 | Not started | - |
| 8. Report Generation & Data | 0/3 | Not started | - |
| 9. Mobile & Deployment | 0/2 | Not started | - |

---
*Created: 2026-01-24*
*Last updated: 2026-01-30*
