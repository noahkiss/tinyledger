# Feature Landscape: Lightweight Bookkeeping for Sole Proprietors

**Domain:** Personal finance / bookkeeping apps for sole proprietors and self-employed
**Researched:** 2026-01-24
**Confidence:** MEDIUM (based on WebSearch from multiple sources, verified against IRS documentation)

## Executive Summary

TinyLedger competes in a space dominated by Wave (free), QuickBooks Solopreneur ($20/mo), and Hurdlr ($10/mo). The key insight: most sole proprietors need **simple expense/income tracking for taxes**, not full accounting. Apps that try to be "QuickBooks lite" fail; apps that nail fast transaction entry and tax-ready categorization win.

**TinyLedger's opportunity:** The market lacks a self-hosted, mobile-first ledger focused purely on tax-season readiness. Existing apps either bundle unnecessary features (invoicing, payroll) or lock data in proprietary clouds.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable for tax purposes.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Transaction Entry** | Core function - users must record income/expenses | Low | Must be < 10 seconds on mobile. Swipe-to-categorize (QuickBooks) or quick-add forms work well |
| **Income/Expense Categories** | IRS Schedule C requires categorized expenses | Low | Pre-built categories matching Schedule C lines (advertising, supplies, travel, etc.) |
| **Date & Amount Tracking** | Basic transaction data for tax records | Low | Date, amount, description minimum |
| **Schedule C Category Mapping** | Sole proprietors file Schedule C (Form 1040) | Medium | Categories must map to: Lines 8-27 expense categories. See IRS Schedule C |
| **Tax Period Summaries** | Users need totals by category for tax filing | Low | Year-to-date totals, quarterly summaries |
| **Data Export** | Users need to share with accountants or import to tax software | Low | CSV export minimum. PDF reports valuable |
| **Search & Filter** | Find specific transactions | Low | By date range, category, amount, description |
| **Mobile Access** | Sole proprietors track expenses on-the-go | Medium | PWA or native app. Receipt capture happens in the moment or not at all |
| **Receipt Attachment** | IRS requires documentation for deductions | Medium | Photo capture, cloud storage. Users cite fading thermal receipts as pain point |
| **Business/Personal Separation** | IRS requires clear separation | Low | Tagging or separate ledgers. QuickBooks uses swipe-left for personal |

### Schedule C Expense Categories (Required for Tax Compliance)

Based on IRS Instructions for Schedule C (Form 1040), these are the expense categories a sole proprietor ledger must support:

| Line | Category | Notes |
|------|----------|-------|
| 8 | Advertising | Marketing, ads, promotions |
| 9 | Car/truck expenses | Standard mileage (70c/mile 2025) or actual expenses |
| 10 | Commissions and fees | Payments to non-employees for sales |
| 11 | Contract labor | 1099 payments |
| 12 | Depletion | Rarely used (natural resources) |
| 13 | Depreciation/Section 179 | Equipment purchases over $2,500 |
| 14 | Employee benefit programs | Not self-employed health insurance |
| 15 | Insurance | Business liability, property (not health) |
| 16a | Interest (mortgage) | Business property mortgage interest |
| 16b | Interest (other) | Business loans, credit cards |
| 17 | Legal and professional | Accountant, lawyer, consultants |
| 18 | Office expense | Supplies, postage, software subscriptions |
| 19 | Pension/profit-sharing | SEP-IRA, Solo 401k contributions |
| 20a | Rent (vehicles/equipment) | Leased equipment |
| 20b | Rent (other property) | Office rent, coworking space |
| 21 | Repairs and maintenance | Business equipment/property repairs |
| 22 | Supplies | Materials consumed in business |
| 23 | Taxes and licenses | Business licenses, state/local taxes |
| 24a | Travel | Airfare, lodging, transportation |
| 24b | Meals | 50% deductible (80% for DOT workers) |
| 25 | Utilities | Phone, internet, electricity (business portion) |
| 26 | Wages | W-2 employee wages (not self) |
| 27 | Other expenses | Catch-all for legitimate business expenses |

**Recommendation:** Support all major categories but start with the most common (Office, Supplies, Travel, Meals, Professional Services, Insurance, Advertising, Car/Truck). Tag-based system allows flexibility without rigid chart of accounts.

---

## Differentiators

Features that set product apart. Not universally expected, but provide competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **10-Second Transaction Entry** | Fastest mobile entry wins daily habit | Medium | Voice entry, smart defaults, recent-vendor memory. Hurdlr users cite this as key |
| **Offline-First / Self-Hosted** | Data sovereignty, no subscription fees | High | SQLite + sync. Unique vs Wave/QuickBooks cloud lock-in |
| **Tag-Based Categorization** | Flexible allocation (e.g., 70% business, 30% personal) | Medium | Superior to rigid chart of accounts for sole proprietors |
| **Quarterly Tax Estimates** | Proactive tax planning, avoid IRS penalties | Medium | Calculate federal SE tax (15.3%), state (PA 3.07%), local EIT |
| **Amount Allocation to Tags** | Single transaction split across categories | Medium | "Dinner with client: 50% meals, 50% entertainment" |
| **Tax Calendar/Reminders** | Never miss estimated payment deadlines | Low | April 15, June 15, Sept 15, Jan 15 |
| **Year-over-Year Comparison** | Trend analysis for business health | Low | Compare this quarter to last year |
| **Schedule C Report Generator** | Direct export matching IRS form | Medium | Pre-fill Schedule C PDF or provide line-by-line summary |
| **Mileage Tracking** | High-value deduction most miss | Medium | 70c/mile x miles driven = significant deduction. GPS or manual |
| **Home Office Calculation** | Common deduction with specific rules | Medium | Simplified method ($5/sq ft, max 300 sq ft = $1,500) or actual |
| **Receipt OCR** | Auto-extract date, vendor, amount from photo | High | Reduces data entry friction. 95%+ accuracy claimed by leaders |
| **Multi-Entity Support** | Multiple businesses or volunteer treasurer role | Medium | Separate ledgers with unified view |
| **Accountant Export** | Professional-grade reports for CPA | Low | Summary by category, transaction detail, receipt attachments |

### Pennsylvania-Specific Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| **PA State Tax Tracking** | 3.07% flat rate on all income | Low | Simple calculation |
| **Local EIT Tracking** | 0.5% - 3.75% depending on municipality | Medium | Requires PSD code lookup or user input of rate |
| **PA Quarterly Estimate Calc** | Threshold: $430+ owed = must pay quarterly | Medium | PA-40 ES voucher amounts |
| **Multi-Jurisdiction Awareness** | PA has 3,000+ local tax jurisdictions | Low | Store user's EIT rate, don't try to auto-detect |

---

## Anti-Features

Features to explicitly NOT build. These add complexity without serving TinyLedger's core mission.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full Double-Entry Accounting** | Overkill for sole proprietors. Requires accounting knowledge. Single-entry is IRS-acceptable for < $5M revenue | Simple income/expense ledger with categories |
| **Bank Account Syncing** | Security risk, API complexity, subscription costs (Plaid fees), data lock-in | Manual entry (optimized for speed) or CSV import |
| **Invoicing** | Scope creep. Wave, FreshBooks do this well. Not core to expense tracking | Link to external invoicing or track "income received" only |
| **Payroll** | Complex tax calculations, compliance burden, state-specific rules | Out of scope. Users with employees need QuickBooks/Gusto |
| **Inventory Tracking** | For product businesses, not service sole proprietors | Out of scope. Recommend Xero for inventory needs |
| **Balance Sheet / P&L** | Accounting reports sole proprietors don't use | Tax-focused reports: Schedule C summary, quarterly totals |
| **Multi-Currency** | Complexity for rare use case | US dollars only. International users can convert manually |
| **Time Tracking** | Different problem domain, many good solutions exist | Integrate with Toggl/Clockify exports if needed |
| **Project Management** | Way out of scope | Not a feature |
| **Auto-Categorization AI** | Requires ML infrastructure, training data, ongoing maintenance. 95% accuracy still means 1 in 20 wrong | Smart defaults based on vendor name (rule-based), user correction |
| **Credit Card / Bank Balance Tracking** | TinyLedger tracks transactions for taxes, not account balances | Explicitly not a balance tracker |
| **Budgeting** | Different use case (personal finance) vs tax tracking | Out of scope |
| **Complex Approval Workflows** | Enterprise feature | Single-user focus |

### Why Not Bank Sync?

Bank sync (via Plaid, Yodlee, etc.) seems like table stakes but is actually an anti-feature for TinyLedger:

1. **Security liability** - Storing bank credentials or tokens
2. **Subscription cost** - Plaid charges per connection
3. **Vendor lock-in** - Bank APIs change, break, require maintenance
4. **Data quality** - Bank transactions lack context (merchant name is often cryptic)
5. **Self-hosted complexity** - Users would need API keys, OAuth setup
6. **Manual entry is actually fast** - If entry takes < 10 seconds, daily habit is sustainable
7. **TinyLedger value prop** - Self-hosted, no recurring fees. Bank sync undermines this.

**Alternative:** CSV import for users who want to bulk-import from bank statements.

---

## Feature Dependencies

```
Core Transaction Entry (must have first)
    |
    +-> Categories/Tags
    |       |
    |       +-> Schedule C Mapping
    |       |
    |       +-> Tax Period Summaries
    |               |
    |               +-> Quarterly Estimate Calculator
    |               |
    |               +-> Schedule C Report
    |
    +-> Receipt Attachment
    |       |
    |       +-> Receipt OCR (optional enhancement)
    |
    +-> Search/Filter
    |
    +-> Data Export
            |
            +-> Accountant Report

Mobile App / PWA
    |
    +-> Offline Support
            |
            +-> Sync (if multi-device)

Multi-Entity Support (separate concern)
    +-> Entity Switcher
    +-> Per-Entity Reports
```

---

## MVP Recommendation

**Phase 1: Core Ledger (Table Stakes)**

1. Transaction entry (date, amount, description, category)
2. Pre-built Schedule C categories
3. Tag-based categorization with amount allocation
4. Tax period summaries (YTD, quarterly, annual)
5. Search and filter
6. CSV export

**Phase 2: Mobile & Receipts**

1. PWA with offline support
2. Receipt photo capture
3. Receipt attachment to transactions

**Phase 3: Tax Intelligence**

1. Quarterly estimated tax calculator (federal SE + PA state + local EIT)
2. Tax calendar with reminders
3. Schedule C summary report
4. Mileage tracking (manual entry)

**Defer to Post-MVP:**

- Receipt OCR (high complexity, moderate value)
- Multi-device sync (requires backend infrastructure)
- Multi-entity support (add complexity)
- Home office calculator (can be manual)

---

## Competitor Analysis Summary

### Wave (Free)
- **Strengths:** Free, full accounting, invoicing, receipt scanning
- **Weaknesses:** Cloud-only, separate apps for receipts/invoices, no mileage tracking, limited to North America, bank sync requires Pro plan ($16/mo)
- **User complaints:** Support unavailable weekends, complex for simple needs

### QuickBooks Solopreneur ($20/mo)
- **Strengths:** Schedule C integration, TurboTax connection, swipe categorization, mileage GPS tracking
- **Weaknesses:** Subscription lock-in, data migration painful, overkill features
- **User complaints:** "Have to pay for higher plan for all functions", customer service issues

### Hurdlr ($10/mo free tier available)
- **Strengths:** Real-time tax estimates, automatic mileage tracking, gig economy focus
- **Weaknesses:** Subscription model, cloud-only
- **User highlights:** "Detailed expense tracking and ability to make rules"

### TinyLedger Positioning
- **Unique value:** Self-hosted, no subscription, data sovereignty, mobile-first speed
- **Target user:** Tech-savvy sole proprietor who wants simple tax tracking without vendor lock-in

---

## Sources

### Official Documentation (HIGH confidence)
- [IRS Schedule C Instructions](https://www.irs.gov/instructions/i1040sc)
- [IRS Estimated Taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes)
- [Pennsylvania Estimated Tax Instructions](https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforindividuals/pit/documents/2026/2026_rev-413i.pdf)
- [PA DCED Local Income Tax Information](https://dced.pa.gov/local-government/local-income-tax-information/)

### Product Research (MEDIUM confidence - multiple sources agree)
- [Wave Self-Employed Accounting](https://www.waveapps.com/accounting/self-employed)
- [QuickBooks Solopreneur](https://quickbooks.intuit.com/solopreneur/)
- [Hurdlr Features](https://www.hurdlr.com/)
- [Business.org Self-Employed Software Comparison](https://www.business.org/finance/accounting/best-self-employed-accounting-software/)
- [Zapier Accounting Software for Freelancers](https://zapier.com/blog/accounting-bookkeeping-software-freelance/)
- [NerdWallet QuickBooks Self-Employed Review](https://www.nerdwallet.com/business/software/learn/quickbooks-self-employed)

### Tax Information (HIGH confidence - IRS/PA official)
- Self-employment tax: 15.3% (12.4% Social Security up to $184,500 + 2.9% Medicare uncapped)
- PA state income tax: 3.07% flat rate
- PA local EIT: 0.5% - 3.75% (varies by municipality)
- PA estimated tax threshold: $430+ owed requires quarterly payments
- Federal estimated tax threshold: $1,000+ owed requires quarterly payments
- 2026 standard mileage rate: 70 cents/mile (2025 rate, 2026 TBD)

### User Research (LOW-MEDIUM confidence - aggregated reviews)
- [Capterra Wave vs QuickBooks Comparison](https://www.capterra.com/compare/178021-212141/Wave-Apps-vs-QuickBooks-Self-Employed)
- [Software Advice Hurdlr Reviews](https://www.softwareadvice.com/accounting/hurdlr-profile/)
