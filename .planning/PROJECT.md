# TinyLedger

## What This Is

A lightweight, mobile-first, self-hosted ledger for sole proprietors and volunteer treasurers who need to track business income and expenses without the complexity of full accounting software. Runs in a Docker container on a homelab, accessed via Tailscale — no auth needed.

The core insight: this is a **business activity log for tax purposes**, not a digital checkbook. We track income and expenses to calculate net profit/loss, not bank balances.

## Core Value

**10-second transaction entry that makes tax season painless.** If a user standing in a parking lot can't snap a receipt photo and log an expense before their coffee gets cold, we've failed.

## Current State

**Version:** v1.0 MVP (shipped 2026-02-03)
**Codebase:** ~15,000 lines TypeScript/Svelte
**Tech stack:** SvelteKit, SQLite (better-sqlite3 + Drizzle ORM), Chart.js, PDFKit, Tailwind v4

**Shipped features:**
- Workspace isolation with per-workspace SQLite databases
- Transaction CRUD with void-first deletion and full audit trail
- Tag system with 29 Schedule C categories and predictive autocomplete
- Receipt attachments with Sharp processing
- Fiscal year navigation and timeline filtering
- Interactive reports dashboard with Chart.js
- Complete tax system (SE, federal, PA state, local EIT)
- Compliance filings tab for both workspace types
- PDF/CSV/ZIP export, CSV import, recurring transactions
- PWA manifest for iOS, Docker deployment, backup utilities

## Requirements

### Validated

- ✓ Workspace isolation with separate SQLite per tenant — v1.0
- ✓ Transaction entry with amount, date, payee, tags, payment method — v1.0
- ✓ Tag allocation (split amounts across categories) — v1.0
- ✓ Receipt attachments with workspace-namespaced storage — v1.0
- ✓ Predictive entry (payee autocomplete, tag suggestions) — v1.0
- ✓ Recurring transactions with flexible rrule patterns — v1.0
- ✓ Timeline view with fiscal year navigation and filters — v1.0
- ✓ Reports dashboard with interactive Chart.js visualizations — v1.0
- ✓ Tax calculations (SE, federal, state, local) — v1.0
- ✓ Quarterly payment tracking in timeline — v1.0
- ✓ Compliance filings tab with status tracking — v1.0
- ✓ PDF tax reports with workspace branding — v1.0
- ✓ Full data export (JSON/CSV/ZIP) — v1.0
- ✓ CSV import with column mapping wizard — v1.0
- ✓ Void-first deletion model with soft deletes — v1.0
- ✓ Full edit history/audit trail — v1.0
- ✓ iOS home screen standalone mode (PWA) — v1.0
- ✓ Docker deployment with volume persistence — v1.0

### Active

(None — planning next milestone)

### Out of Scope

- **User authentication** — self-hosted on internal domain, accessed via Tailscale
- **Multi-user/collaboration** — single user, multiple workspaces
- **Bank balance tracking** — we track income/expenses for taxes, not account balances
- **Bank sync (Plaid)** — security liability, subscription costs, vendor lock-in
- **Bank reconciliation** — overkill for target audience
- **Double-entry accounting** — single-entry ledger only
- **Invoicing** — scope creep, Wave/FreshBooks do this
- **Payroll** — complex compliance, state-specific rules
- **Multi-currency** — target audience is US/local
- **Push notifications** — over-engineered for self-hosted

### Future Considerations (v2+)

- **Mileage tracking** — common deduction, would add complexity
- **Multi-state tax support** — PA only for v1
- **Receipt OCR** — auto-extract amount/vendor from photos
- **Offline PWA** — full service worker with sync

## Context

**Target users:**
- Volunteer treasurers managing <50 transactions/year for clubs or non-profits
- Solopreneurs (consultants, therapists, coaches) tracking deductible expenses and income

**The problem:**
- Spreadsheets are hard on mobile, no receipt attachment, error-prone
- QuickBooks/Xero are expensive, complex, slow, overkill

**Deployment model:**
- Docker container on homelab
- Data persists in mounted volumes (ledger-db, ledger-attachments)
- One SQLite DB per workspace + attachments directory
- Access via Tailscale on internal domain

**Tech stack:**
- SvelteKit 2.x with Svelte 5 runes
- SQLite via better-sqlite3 + Drizzle ORM
- TypeScript throughout
- PDFKit for report generation
- Chart.js for visualizations
- Tailwind v4 via Vite plugin

## Constraints

- **Mobile-first**: Primary use is phone in hand, receipt in other hand
- **10-second entry**: Transaction logging must be fast and frictionless
- **Self-hosted**: No external dependencies, no auth, runs on homelab
- **PA taxes only (v1)**: Federal + PA state (3.07%) + local EIT
- **Lightweight**: Fast load on 4G, minimal JS bundle, simple deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Net income instead of bank balance | Avoids opening balance complexity, backdated entry issues, reconciliation. Users have bank apps for balances — they need tax tracking. | ✓ Good |
| Separate SQLite per tenant | Hard isolation, easy backup/restore per org, matches mental model of "completely separate books" | ✓ Good |
| Filesystem for attachments | Keeps DB small and fast, attachments browsable, single volume backup | ✓ Good |
| Tag allocation (split amounts) | Prevents double-counting in reports when expense spans categories | ✓ Good |
| Void-first deletion | Maintains audit trail, aligns with accounting best practices | ✓ Good |
| No auth | Self-hosted on Tailscale, internal domain only | ✓ Good |
| SvelteKit + SQLite | Lightweight, full-stack in one, compiles to tiny bundles, room to grow | ✓ Good |
| Integer cents for currency | Avoids floating-point precision errors in financial calculations | ✓ Good |
| Dual ID system (id + publicId) | Internal id for FKs, UUID publicId for URLs | ✓ Good |
| Chart.js direct integration | $effect for lifecycle instead of wrapper (simpler Svelte 5) | ✓ Good |
| rrule for recurring patterns | Standard iCal RRULE format for portable pattern storage | ✓ Good |
| VACUUM INTO for backups | Safe SQLite backup without stopping application | ✓ Good |

---
*Last updated: 2026-02-03 after v1.0 milestone*
