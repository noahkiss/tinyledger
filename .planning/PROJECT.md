# TinyLedger

## What This Is

A lightweight, mobile-first, self-hosted ledger for sole proprietors and volunteer treasurers who need to track business income and expenses without the complexity of full accounting software. Runs in a Docker container on a homelab, accessed via Tailscale — no auth needed.

The core insight: this is a **business activity log for tax purposes**, not a digital checkbook. We track income and expenses to calculate net profit/loss, not bank balances.

## Core Value

**10-second transaction entry that makes tax season painless.** If a user standing in a parking lot can't snap a receipt photo and log an expense before their coffee gets cold, we've failed.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Workspaces & Multi-Tenancy
- [ ] User can create multiple workspaces (e.g., "Consulting LLC", "Non-Profit Board")
- [ ] Each workspace has isolated data (separate SQLite DB + attachments dir)
- [ ] Workspace branding: logo upload (enforced dimensions) or 2-letter abbreviation auto-generated
- [ ] Workspace details: name, address, phone, responsible party
- [ ] Workspace type: sole prop (enables tax features) or volunteer org (tax features optional)
- [ ] Switch workspaces instantly via logo dropdown in header
- [ ] Last-used workspace remembered per device (localStorage)
- [ ] Founded year setting to enable historical fiscal year views

#### Transaction Entry
- [ ] Quick entry with large Income/Expense buttons
- [ ] Fields: amount, date, payee/entity, tags (with allocation), description, payment method, attachment
- [ ] Payment methods: cash, card, check (with check # field)
- [ ] Tag allocation: when multiple tags, split amount across them (no double-counting in reports)
- [ ] Flexible input UX: auto-format currency ($, .00), dates (with/without slashes + mobile picker), percentages
- [ ] Manual future dates allowed, warn if >1 year out
- [ ] Attachments stored in filesystem per tenant

#### Predictive Entry & Autocomplete
- [ ] Payee autocomplete from transaction history (fuzzy/substring, smart sorted)
- [ ] Tag suggestions based on selected payee's history
- [ ] Pre-fill fields based on match (amount, tags)

#### Recurring Transactions
- [ ] Mark transaction as recurring with flexible patterns (daily, weekly, bi-weekly, monthly, last Friday of month, etc.)
- [ ] Future instances show as "pending" in timeline
- [ ] Pending scoped to current fiscal year (option to view next FY)
- [ ] Confirm/edit pending when they occur
- [ ] Void single instance, void + delete future, or delete current + future

#### Timeline (Main View)
- [ ] Transaction feed for selected fiscal year
- [ ] Net Income YTD displayed prominently (not bank balance)
- [ ] Large Income/Expense entry buttons
- [ ] Fiscal year selector (current year default, can view historical back to founded year)
- [ ] Quarterly tax payment due dates visible in timeline
- [ ] Search/filter by payee, tags, date range, type (income/expense), payment method

#### Tags & Categories
- [ ] User-created tags on-the-fly during entry
- [ ] Tag management in settings (rename, merge, delete)
- [ ] Optional "lock tags" mode to prevent new tag creation

#### Tax Features (Sole Prop)
- [ ] Tax info per workspace: PA state (3.07%), local EIT rate, federal bracket (pick or calculate from outside earnings)
- [ ] Self-employment tax calculated (15.3% of 92.35% of net)
- [ ] Estimated taxes YTD display
- [ ] Projected year-end tax estimate (based on current trajectory)
- [ ] Recommended set-aside amount (padded conservatively)
- [ ] Quarterly estimated payments: projected amounts, shown in timeline, markable as paid
- [ ] Quarterly amounts refine as due date approaches

#### Reports
- [ ] Summary cards: YTD income, YTD expenses, net income, tax set-aside
- [ ] Charts: net income over time, spending by tag, income vs expense by month
- [ ] Tax-ready report generation for date range
- [ ] Report grouped by tag with totals (CPA-ready format)
- [ ] PDF export (lightweight JS library)
- [ ] Workspace branding on reports (logo, business details)

#### Data Management
- [ ] Full data export (JSON/CSV + attachments ZIP)
- [ ] CSV import for initial setup
- [ ] Void transactions (default action, keeps record)
- [ ] Delete only available on already-voided items
- [ ] Soft-delete everything (zero-delete mentality)
- [ ] Full edit history/audit trail

#### Receipts & Attachments
- [ ] Upload via file picker (user takes photo with phone camera, uploads file)
- [ ] View full-size
- [ ] Download
- [ ] Replace attachment

### Out of Scope

- **User authentication** — self-hosted on internal domain, accessed via Tailscale
- **Multi-user/collaboration** — single user, multiple workspaces
- **Bank balance tracking** — we track income/expenses for taxes, not account balances
- **Bank reconciliation** — overkill for target audience
- **Interest tracking** — that's the bank's job
- **Double-entry accounting** — single-entry ledger only
- **Mileage tracking** — common deduction but adds complexity, maybe v2
- **Multi-currency** — target audience is local (PA)
- **Offline/PWA caching** — always-online is fine, but configure for iOS home screen standalone mode
- **Push notifications** — over-engineered for self-hosted
- **Multi-state tax support** — PA only for v1
- **Other entity types** — sole prop and volunteer org only for v1

## Context

**Target users:**
- Volunteer treasurers managing <50 transactions/year for clubs or non-profits
- Solopreneurs (consultants, therapists, coaches) tracking deductible expenses and income

**The problem:**
- Spreadsheets are hard on mobile, no receipt attachment, error-prone
- QuickBooks/Xero are expensive, complex, slow, overkill

**Deployment model:**
- Docker container on homelab
- Data persists in mounted volume (`data/`)
- One SQLite DB per tenant + attachments directory
- Access via Tailscale on internal domain

**Tech stack:**
- SvelteKit (full-stack, tiny bundles, great mobile performance)
- SQLite via better-sqlite3 or Drizzle ORM
- TypeScript throughout
- Lightweight PDF generation (html2pdf.js or similar)
- Chart.js or similar for visualizations

## Constraints

- **Mobile-first**: Primary use is phone in hand, receipt in other hand
- **10-second entry**: Transaction logging must be fast and frictionless
- **Self-hosted**: No external dependencies, no auth, runs on homelab
- **PA taxes only (v1)**: Federal + PA state (3.07%) + local EIT
- **Lightweight**: Fast load on 4G, minimal JS bundle, simple deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Net income instead of bank balance | Avoids opening balance complexity, backdated entry issues, reconciliation. Users have bank apps for balances — they need tax tracking. | — Pending |
| Separate SQLite per tenant | Hard isolation, easy backup/restore per org, matches mental model of "completely separate books" | — Pending |
| Filesystem for attachments | Keeps DB small and fast, attachments browsable, single volume backup | — Pending |
| Tag allocation (split amounts) | Prevents double-counting in reports when expense spans categories | — Pending |
| Void-first deletion | Maintains audit trail, aligns with accounting best practices | — Pending |
| No auth | Self-hosted on Tailscale, internal domain only | — Pending |
| SvelteKit + SQLite | Lightweight, full-stack in one, compiles to tiny bundles, room to grow | — Pending |

---
*Last updated: 2025-01-24 after initialization*
