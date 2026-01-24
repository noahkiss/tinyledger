# Project Research Summary

**Project:** TinyLedger
**Domain:** Self-hosted bookkeeping/ledger app for sole proprietors
**Researched:** 2026-01-24
**Confidence:** HIGH

## Executive Summary

TinyLedger is a lightweight, mobile-first, self-hosted bookkeeping application targeting sole proprietors who need simple expense/income tracking for tax purposes. The research reveals that this market is dominated by cloud-based subscription services (Wave, QuickBooks Solopreneur, Hurdlr) that bundle unnecessary features and create vendor lock-in. TinyLedger's opportunity lies in offering data sovereignty, zero recurring costs, and laser-focused simplicity.

The recommended approach is a SvelteKit + SQLite stack with workspace-isolated architecture (separate database per business entity). This provides optimal performance on mobile devices, minimal resource consumption for homelab deployment, and inherent multi-tenancy without complex authorization logic. The technical stack is modern but proven, with excellent documentation and type safety throughout.

Key risks center on tax compliance (Pennsylvania's complex local tax system, self-employment tax calculation accuracy) and SQLite concurrency management (requiring WAL mode and proper transaction handling). The void-first deletion model is critical to maintain IRS-compliant audit trails. Mobile UX must prioritize 10-second transaction entry to compete against the friction of bank sync alternatives. Every architectural decision should be evaluated against the question: "Does this help achieve 10-second entry?"

## Key Findings

### Recommended Stack

TinyLedger's stack prioritizes developer experience, mobile performance, and minimal resource usage. SvelteKit's compiler-based approach produces the smallest bundle sizes of any major framework, critical for mobile-first design. Drizzle ORM provides type safety without the query engine overhead of Prisma (eliminating ~15MB binary). SQLite with better-sqlite3 offers zero-config persistence perfect for single-user self-hosted deployments.

**Core technologies:**
- **SvelteKit 2.50+**: Full-stack framework with file-based routing, SSR/SSG flexibility, excellent mobile performance
- **Svelte 5.47+**: Compiles to vanilla JS (no virtual DOM), reactive by default, minimal runtime overhead
- **Drizzle ORM 0.45+**: Lightweight (~7.4kb), zero dependencies, SQL-transparent queries, excellent TypeScript inference
- **better-sqlite3 12.6+**: Synchronous API (simpler code), fastest Node.js SQLite driver, zero configuration
- **Tailwind CSS v4**: Mobile-first by design, zero-runtime CSS, 5x faster builds than v3, automatic content detection
- **Chart.js 4.5+**: Battle-tested charting, 8 chart types, works directly with Svelte (no wrapper needed)
- **PDFKit 0.17+**: Server-side PDF generation for tax reports, full layout control, native table support
- **@vite-pwa/sveltekit 0.6+**: Zero-config PWA with automatic service worker generation, iOS compatibility

**Critical version requirements:**
- Node.js 22-alpine for Docker runtime (LTS, smallest image, native ESM support)
- TypeScript 5.x required for Drizzle ORM type inference

### Expected Features

Sole proprietors need **simple expense/income tracking for taxes**, not full accounting. The IRS Schedule C (Form 1040) drives required categorization. Apps that try to be "QuickBooks lite" fail; apps that nail fast transaction entry and tax-ready categorization win.

**Must have (table stakes):**
- Transaction entry (< 10 seconds on mobile) — core function, users abandon if slow
- Schedule C category mapping — IRS requires categorized expenses for tax filing
- Date & amount tracking — basic transaction data for tax records
- Tax period summaries — users need year-to-date and quarterly totals
- Search & filter — find specific transactions by date, category, amount
- CSV export — users share with accountants or import to tax software
- Receipt attachment — IRS requires documentation, thermal receipts fade
- Business/personal separation — IRS requires clear separation

**Should have (competitive advantage):**
- Tag-based categorization with allocation — superior to rigid chart of accounts, handle 70% business / 30% personal splits
- Quarterly tax estimates — calculate federal SE tax (15.3% of 92.35%), PA state (3.07%), local EIT
- Schedule C report generator — direct export matching IRS form lines
- Mileage tracking — high-value deduction (70 cents/mile) most sole proprietors miss
- Tax calendar/reminders — never miss estimated payment deadlines (Apr 15, Jun 15, Sep 15, Jan 15)
- Offline-first PWA — data sovereignty, works without internet, installable on iOS/Android

**Defer (v2+):**
- Receipt OCR — high complexity, 95% accuracy still means errors, manual entry is fast enough
- Multi-device sync — requires backend infrastructure, adds complexity
- Multi-entity support — single workspace first, expand later
- Home office calculator — can calculate manually with guidance

**Anti-features (explicitly do NOT build):**
- Bank account syncing — security liability, subscription costs (Plaid fees), vendor lock-in
- Invoicing — scope creep, Wave/FreshBooks do this well
- Payroll — complex compliance burden, state-specific rules
- Full double-entry accounting — overkill for sole proprietors, requires accounting knowledge
- Balance sheet / P&L — accounting reports sole proprietors don't use

### Architecture Approach

TinyLedger follows a workspace-isolated architecture where each workspace (tenant) has its own SQLite database file. This provides inherent data isolation without complex row-level security and simplifies backups (copy database files). The application uses SvelteKit's file-based routing with server-side form actions for data mutations (progressive enhancement) and filesystem storage for attachments.

**Major components:**
1. **Workspace Resolution (`hooks.server.ts`)** — intercepts requests, parses workspace ID from URL path, opens/caches SQLite connection, injects into `event.locals`
2. **Database Layer (`$lib/server/db/`)** — connection management, prepared statements, schema initialization, WAL mode configuration
3. **File Storage (`$lib/server/storage/`)** — attachment handling, workspace-namespaced directory structure, UUID filename generation
4. **Form Actions (`+page.server.ts`)** — CRUD operations via progressive enhancement, validation, file uploads
5. **Load Functions (`+page.server.ts`)** — server-side data fetching, URL-based filtering (fiscal year, category), type-safe queries
6. **Timeline UI Components** — transaction feed, filter bar, mobile-optimized entry forms

**Key patterns:**
- URL-based state for filters (bookmarkable, shareable URLs via search params)
- Connection caching per workspace (avoid repeated file opens)
- SQLite WAL mode (better concurrent read performance)
- Progressive enhancement (forms work without JavaScript)
- Separate DB per tenant (inherent isolation, simpler than shared DB with RLS)

### Critical Pitfalls

**1. Hard Deleting Financial Transactions** — IRS requires business records for 3-7 years. Permanently deleting transactions breaks audit trails and creates legal exposure. **Solution:** Implement void-first deletion model from day one. Voided transactions remain visible with strikethrough, excluded from totals. "Delete" only available on already-voided items, even then soft-delete with `deleted_at` timestamp. Add edit history/audit trail.

**2. SQLite BUSY Errors Under Concurrent Access** — Without WAL mode and proper configuration, app returns "database is locked" errors during normal multi-request scenarios. **Solution:** Enable WAL mode immediately after opening DB (`db.pragma('journal_mode = WAL')`), set busy timeout (`db.pragma('busy_timeout = 60000')`), use `BEGIN IMMEDIATE` for write transactions, keep transactions short.

**3. Double-Counting in Tag-Based Reports** — When a transaction has multiple tags, it appears in full in each tag's report, inflating totals. **Solution:** Tag allocation model where each tag assignment includes percentage or fixed amount. Example: $500 expense with tags ["Office: 60%", "Marketing: 40%"] shows $300 Office, $200 Marketing. UI enforces allocations sum to 100%.

**4. Pennsylvania Local Tax Complexity Underestimation** — PA has 3,000+ local taxing jurisdictions with EIT rates from 0.5% to 3.75%. Ignoring this causes tax estimates off by 1-4% of net income. **Solution:** Require local EIT rate as workspace setting (not optional), display warning that rate varies by municipality, link to PA DCED lookup tool, show tax breakdown so users can verify.

**5. Self-Employment Tax Calculation Errors** — SE tax applies to 92.35% of net income (not 100%), a non-obvious calculation that developers frequently miss. **Solution:** `seBaseAmount = netIncome * 0.9235; seTax = seBaseAmount * 0.153;` Test against known values ($100,000 net = $14,130 SE tax, not $15,300).

**6. SvelteKit SSR/Client Hydration Mismatches** — Using browser-only APIs (window, localStorage) during SSR causes hydration errors and content flickers. **Solution:** Guard browser APIs with `if (browser)` checks, defer browser-only code to `onMount`, prevent Safari phone number auto-linking with `<meta name="format-detection" content="telephone=no">`.

**7. Tenant Data Isolation Leakage** — Workspace A accidentally accessing Workspace B's data due to improper context handling. **Solution:** Derive workspace from URL path (not query params), validate workspace access on every request, never store active workspace in global state, namespace file attachments by workspace ID, prevent path traversal attacks.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order: foundation (workspace isolation, database layer) → core data flow (transactions CRUD) → attachments (file handling) → tax features (calculations, reports) → polish (mobile UX, deployment).

### Phase 1: Foundation & Core Transactions
**Rationale:** Hooks and workspace resolution are used by all routes, must be proven first. Database layer with WAL mode and void-first deletion prevents critical pitfalls early.

**Delivers:**
- Working SvelteKit project with Tailwind CSS v4
- Workspace-isolated architecture (hooks.server.ts)
- SQLite connection caching with WAL mode
- Database schema with transactions table (void support built-in)
- Basic transaction list with load function
- New transaction form with form action
- Transaction detail view (edit/void)

**Addresses Features:**
- Transaction entry (table stakes)
- Date & amount tracking (table stakes)
- Search & filter (table stakes)
- Business/personal separation (workspace-level)

**Avoids Pitfalls:**
- #1: Hard deleting transactions (void-first from schema)
- #3: SQLite BUSY errors (WAL mode enabled)
- #7: Tenant data leakage (URL-based workspace isolation)

**Research Flag:** Standard patterns, skip phase-level research. Architecture patterns well-documented in SvelteKit official docs.

---

### Phase 2: Categories & Tags
**Rationale:** Tax categorization is table stakes for sole proprietors. Must implement allocation percentages before any reporting to avoid double-counting pitfall.

**Delivers:**
- Schedule C category definitions (Office, Supplies, Travel, Meals, Professional Services, etc.)
- Tag system with allocation percentages (database schema + UI)
- Tag assignment UI with allocation enforcement (must sum to 100%)
- Category filter in timeline
- Basic category summary view

**Addresses Features:**
- Income/expense categories (table stakes)
- Schedule C category mapping (table stakes)
- Tag-based categorization with allocation (differentiator)

**Avoids Pitfalls:**
- #2: Double-counting in tag-based reports (allocation percentages enforced)

**Research Flag:** Standard CRUD patterns, skip phase-level research. Schedule C categories already documented in FEATURES.md.

---

### Phase 3: Receipt Attachments
**Rationale:** IRS documentation requirements make this table stakes. Implement before tax features so summaries can include "receipts attached" counts.

**Delivers:**
- File upload in transaction form (multipart/form-data)
- Attachment storage in workspace-namespaced directory
- Attachment metadata in database (filename, path, size, transaction_id)
- Attachment display/download in transaction detail
- Mobile camera integration via PWA

**Addresses Features:**
- Receipt attachment (table stakes)

**Avoids Pitfalls:**
- #6: SvelteKit hydration errors (file input handled server-side)
- #7: Form action routing confusion (proper enctype and action naming)
- #8: Orphaned attachment files (metadata in DB, cleanup strategy)

**Research Flag:** Standard patterns, skip phase-level research. SvelteKit file upload well-documented.

---

### Phase 4: Tax Period Summaries & Reports
**Rationale:** Tax reporting is the primary use case. Build on complete transaction + category foundation. PA tax complexity requires careful implementation.

**Delivers:**
- Fiscal year filtering (URL param-based)
- Tax period summaries (YTD, quarterly, annual)
- Schedule C summary report (line-by-line matching IRS form)
- CSV export for accountant sharing
- PDF report generation via PDFKit

**Addresses Features:**
- Tax period summaries (table stakes)
- Data export (table stakes)
- Schedule C report generator (differentiator)

**Avoids Pitfalls:**
- None specific, but relies on avoiding #2 from Phase 2

**Research Flag:** Skip phase-level research. PDFKit documentation sufficient, Schedule C format defined in FEATURES.md.

---

### Phase 5: Tax Calculations
**Rationale:** Differentiator feature requiring accurate implementation. PA local tax and SE tax calculation complexities well-researched in PITFALLS.md.

**Delivers:**
- Workspace setting for PA local EIT rate (required field)
- Quarterly estimated tax calculator (federal + PA state + local + SE tax)
- Tax estimate breakdown view (show formula for transparency)
- Tax calendar with estimated payment reminders (Apr 15, Jun 15, Sep 15, Jan 15)
- Mileage tracking (manual entry, 70 cents/mile calculation)

**Addresses Features:**
- Quarterly tax estimates (differentiator)
- Tax calendar/reminders (differentiator)
- Mileage tracking (differentiator)

**Avoids Pitfalls:**
- #4: PA local tax complexity (workspace setting + user verification)
- #5: SE tax calculation errors (92.35% base, test suite with known values)

**Research Flag:** Skip phase-level research. Tax formulas already documented in PITFALLS.md with official IRS/PA DCED sources.

---

### Phase 6: PWA & Mobile Polish
**Rationale:** Mobile-first is core value prop, but requires working features first. PWA last because it validates entire flow works offline.

**Delivers:**
- @vite-pwa/sveltekit integration
- iOS-specific PWA meta tags (apple-touch-icon, app-capable)
- Manifest with proper icons (180x180, 192x192, 512x512)
- Offline support with service worker
- Mobile-responsive polish (large touch targets, bottom nav)
- 10-second transaction entry optimization

**Addresses Features:**
- Mobile access (table stakes)
- Offline-first PWA (differentiator)

**Avoids Pitfalls:**
- #14: Feature creep (measure time-to-entry, protect simplicity)
- #16: Cluttered mobile interface (progressive disclosure, one action per screen)
- #17: Missing confirmation for destructive actions (void requires confirmation)
- #18: Jargon in interface ("Income/Expense" not "Credit/Debit")

**Research Flag:** Skip phase-level research. PWA patterns documented in STACK.md, mobile UX patterns in PITFALLS.md.

---

### Phase 7: Deployment & Infrastructure
**Rationale:** Validates entire app works in production mode with Docker deployment.

**Delivers:**
- Dockerfile with multi-stage build (Node 22-alpine)
- docker-compose.yml with volume mounts
- Environment variable configuration (ORIGIN, DATA_DIR, BODY_SIZE_LIMIT)
- SQLite backup strategy documentation (VACUUM INTO for consistent copies)
- Production testing on homelab with Tailscale

**Avoids Pitfalls:**
- #15: Inadequate SQLite backup strategy (document safe backup commands)

**Research Flag:** Skip phase-level research. Docker patterns documented in STACK.md and ARCHITECTURE.md.

---

### Phase Ordering Rationale

- **Foundation first** (Phase 1): Workspace isolation and database layer used by all subsequent features. WAL mode and void-first deletion prevent critical pitfalls that are hard to retrofit.
- **Categories before attachments** (Phase 2 before 3): Tag allocation logic is complex and affects all reporting. Prove this works before adding file upload complexity.
- **Attachments before reports** (Phase 3 before 4): Tax reports should show "receipts attached" counts, requiring attachment system in place.
- **Reports before calculations** (Phase 4 before 5): Tax calculations build on reporting foundation, need to display results somewhere.
- **Calculations before PWA** (Phase 5 before 6): PWA is polish layer, needs complete feature set to validate offline sync works.
- **Deployment last** (Phase 7): Validates everything works in production mode, catches environment-specific issues.

**Dependency chain:**
```
Phase 1 (Foundation)
  ├─> Phase 2 (Categories) ─> Phase 4 (Reports) ─> Phase 5 (Tax Calc)
  └─> Phase 3 (Attachments) ─┘                         │
                                                        └─> Phase 6 (PWA) ─> Phase 7 (Deploy)
```

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1-7:** All phases use well-documented patterns from official SvelteKit, Drizzle, and better-sqlite3 docs. Research already completed in STACK.md, ARCHITECTURE.md provides implementation patterns, PITFALLS.md identifies gotchas.

**Potential deep-dive topics if needed during implementation:**
- **Phase 5 (Tax Calculations):** Verify 2026 tax rates if different from 2025. IRS Schedule C instructions, PA DCED rates already sourced but should confirm current year values.
- **Phase 6 (PWA):** iOS PWA compatibility testing may reveal edge cases not in documentation. Budget time for device testing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against npm registry (versions current as of 2026-01-24), official documentation reviewed via Context7, alternatives evaluated with clear rationale |
| Features | MEDIUM-HIGH | IRS Schedule C requirements verified from official IRS documentation, competitor analysis based on multiple sources (Wave, QuickBooks, Hurdlr), user research aggregated from reviews. PA tax rates from official PA DCED. Some UX assumptions need validation. |
| Architecture | HIGH | SvelteKit patterns from official docs, better-sqlite3 patterns from Context7 library, workspace isolation verified against multi-tenant best practices, all code samples tested against API documentation |
| Pitfalls | HIGH | Critical pitfalls (#1-5) sourced from official IRS/SQLite/PA DCED documentation. Moderate pitfalls (#6-10) sourced from SvelteKit official docs and technical analysis. UX pitfalls (#16-18) based on industry design research (medium confidence). |

**Overall confidence:** HIGH

Research is comprehensive with strong primary sources. All technical recommendations verified against official documentation. Tax compliance requirements sourced from IRS and PA DCED official publications. Architecture patterns validated against SvelteKit core team documentation.

### Gaps to Address

**1. 2026 Tax Rates:** Research used 2025 rates (70 cents/mile standard mileage, SE tax thresholds). Verify 2026 rates before Phase 5 implementation. IRS typically publishes rate changes in November-December for following year.

**2. PA Local EIT Rate Lookup Integration:** Research documents requirement for local EIT rate but doesn't solve lookup UX. Phase 5 should decide: manual user entry (simpler) vs PA DCED API integration (if available). Manual entry with validation and clear instructions is recommended.

**3. iOS PWA Offline Behavior:** Documentation exists but real-world testing needed. Phase 6 should budget time for iOS Safari testing on actual devices (iPads/iPhones) to validate service worker behavior, especially around camera access for receipt capture.

**4. SQLite Database Growth Over Time:** Research doesn't address database size limits or archiving strategy. Monitor in Phase 7 testing. SQLite handles databases up to 281 TB theoretically, but practical limits depend on storage. Consider documenting archiving strategy (e.g., annual database rotation) for users with high transaction volumes.

**5. Fiscal Year Definition:** Research assumes calendar year (Jan 1 - Dec 31) aligns with most sole proprietors' tax year. Should support fiscal year start date as workspace setting for edge cases (e.g., farmers, seasonal businesses). Can defer to post-MVP if calendar year works for 95%+ of users.

**6. Receipt File Size Limits:** BODY_SIZE_LIMIT in SvelteKit defaults to 512kb. Research doesn't specify acceptable receipt file sizes. Phase 3 should set reasonable limit (recommend 5-10MB) and validate during upload with clear error messages. Consider image compression for photos > 2MB.

## Sources

### Primary (HIGH confidence)

**Technology Stack:**
- [SvelteKit Official Docs](https://svelte.dev/docs/kit/project-structure) — project structure, routing, form actions, hooks, state management
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/quick-sqlite/better-sqlite3) — SQLite integration, TypeScript inference, migrations
- [better-sqlite3 API Docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) — synchronous API, performance, WAL mode (Context7)
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4) — v4 features, Vite integration
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/) — chart types, API
- [PDFKit Documentation](https://pdfkit.org/) — PDF generation, tables, layout
- [SvelteKit adapter-node](https://svelte.dev/docs/kit/adapter-node) — Docker deployment

**Tax Compliance:**
- [IRS Schedule C Instructions](https://www.irs.gov/instructions/i1040sc) — expense categories, requirements
- [IRS Self-Employed Individuals Tax Center](https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center) — SE tax calculation
- [IRS Estimated Taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes) — quarterly requirements
- [Pennsylvania DCED Local Income Tax Information](https://dced.pa.gov/local-government/local-income-tax-information/) — EIT rates, jurisdictions
- [Pennsylvania Estimated Tax Instructions](https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforindividuals/pit/documents/2026/2026_rev-413i.pdf) — PA quarterly estimates

**Technical Pitfalls:**
- [SQLite WAL Mode Documentation](https://sqlite.org/wal.html) — concurrency, performance
- [SQLite Backup API](https://www.sqlite.org/backup.html) — safe backup methods
- [Svelte Runtime Warnings](https://svelte.dev/docs/svelte/runtime-warnings) — hydration errors
- [SvelteKit Form Actions](https://github.com/sveltejs/kit/blob/main/documentation/docs/20-core-concepts/30-form-actions.md) — progressive enhancement

### Secondary (MEDIUM confidence)

**Competitor Analysis:**
- [Wave Self-Employed Accounting](https://www.waveapps.com/accounting/self-employed)
- [QuickBooks Solopreneur](https://quickbooks.intuit.com/solopreneur/)
- [Hurdlr Features](https://www.hurdlr.com/)
- [Business.org Self-Employed Software Comparison](https://www.business.org/finance/accounting/best-self-employed-accounting-software/)
- [NerdWallet QuickBooks Self-Employed Review](https://www.nerdwallet.com/business/software/learn/quickbooks-self-employed)

**Technical Analysis:**
- [Bert Hubert - SQLITE_BUSY Despite Timeout](https://berthub.eu/articles/posts/a-brief-post-on-sqlite3-database-locked-despite-timeout/) — concurrency pitfalls
- [JetBrains - Database Migrations in Real World](https://blog.jetbrains.com/idea/2025/02/database-migrations-in-the-real-world/) — migration strategies
- [Security Boulevard - Tenant Isolation](https://securityboulevard.com/2025/12/tenant-isolation-in-multi-tenant-systems-architecture-identity-and-security/) — multi-tenant patterns
- [Oldmoe - Backup Strategies for SQLite](https://oldmoe.blog/2024/04/30/backup-strategies-for-sqlite-in-production/) — production backups

**UX Research:**
- [ProCreator - Mobile Banking UX Mistakes](https://procreator.design/blog/ux-mistakes-avoid-mobile-banking-app-design/)
- [Eleken - Fintech UX Best Practices](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [Netguru - Financial App Design](https://www.netguru.com/blog/financial-app-design)

### Tertiary (LOW confidence)

**Ecosystem Discovery:**
- [Top CSS Frameworks 2025](https://blog.logrocket.com/top-6-css-frameworks-2025/) — Tailwind market position
- [Svelte Chart Libraries](https://dev.to/dev_michael/the-hunt-for-the-perfect-svelte-charting-library-a-happy-ending-o0p) — Chart.js vs LayerChart
- [PDF Generation Libraries 2025](https://pdfnoodle.com/blog/popular-libraries-2025-for-pdf-generation-using-node-js) — PDFKit alternatives
- [Node.js ORM Comparison 2025](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/) — Drizzle vs Prisma

---

*Research completed: 2026-01-24*
*Ready for roadmap: yes*
