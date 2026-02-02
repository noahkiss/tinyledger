# Phase 7: Tax System - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Tax configuration, calculations, and quarterly payment tracking. User can configure federal/state/local tax rates, see estimated taxes with full breakdown, and track quarterly payment due dates with completion status.

</domain>

<decisions>
## Implementation Decisions

### State selection (foundational)
- Workspace settings includes state selector — all tax info filters based on selected state
- Backend framework designed for extensibility — easy to add state-specific details later
- Single state per workspace for now (multi-state noted for future)

### Tax rate configuration
- **Location:** Workspace settings page with expandable sections for extra info
- **Federal:** Bracket selector dropdown with income range guidance to help users choose the right bracket
- **State:** State selector auto-fills rate from Tax Foundation data (bundled as static JSON from their Excel export); user can manually override
- **Local/EIT:** Manual entry field with links to state-specific resources (PA DCED for PA users, similar for other states)
- **SE tax:** Fixed formula (15.3% of 92.35% of net income) — not configurable
- **Validation:** Warn on unusual values (e.g., >15% state rate) but accept any input
- **Defaults:** Prompt user to configure rates on first visit to taxes tab before showing estimates

### Tax cheat sheet
- Expandable "Tax Forms & Resources" section in workspace settings
- State-filtered content based on selected state
- Per form: name, link, due date, brief description, filing threshold
- Hand-holding approach — help users know what needs to be filed and when
- Links to IRS Schedule C, Schedule SE, Form 1040-ES (federal) and PA-40, PA-40 ES (PA state)

### Estimate display
- **Reports dashboard:** Summary card with single total estimate
- **Dedicated taxes tab:** Full breakdown for tax submission workflow
- **Projection:** Show YTD actual plus projected year-end based on current pace
- **Updates:** Real-time recalculation as transactions change

### Taxes tab structure
- Three main sections: Federal, State, SE Tax — each showing total with click-to-expand details
- Form checklist with checkable items per fiscal year
- Visual indicators when due dates approach (border color yellow/red, not full card color)
- Banner on taxes page for upcoming payments
- Visible disclaimer that estimates are not actual tax advice — consult tax professional

### Quarterly payment tracking
- **Visibility:** Both taxes tab (full details) and timeline markers
- **Calculation:** YTD-based (annualized income installment method) — adjusts to income fluctuations
- **Mark paid:** Checkbox with optional amount field; defaults to recommended amount if not specified
- **Timeline markers:** Distinct visual style from regular transactions — clearly a "system" item
- **Reminders:** Border color changes as due date approaches (subtle, not full card color change)

### Calculation transparency
- Step-by-step breakdown showing: net income → adjustments → taxable amount → rate applied → result
- Formula with actual values plugged in (e.g., "$50,000 × 22% = $11,000")
- Links to IRS/PA resources for deeper learning
- Include SE tax deduction explanation (50% of SE tax is deductible from federal income)
- Educational approach — explain tax concepts users may not know

### Claude's Discretion
- Previous FY comparison on tax estimates (if it adds value)
- Exact visual treatment of timeline markers
- Specific warning thresholds for unusual rate values

</decisions>

<specifics>
## Specific Ideas

- "Hand-holding" approach throughout — back-of-mind tasks that are important should be surfaced clearly
- Tax Foundation data as source for state rates: https://taxfoundation.org/data/all/state/state-income-tax-rates/
- Federal brackets also available: https://taxfoundation.org/data/all/federal/2026-tax-brackets/
- PA local EIT resource (1000+ options): https://apps.dced.pa.gov/munstats-public/ReportInformation2.aspx?report=EitWithCollector_Dyn_Excel&type=R
- Form cheat sheet should feel like a reference guide during tax season
- Sole proprietorships don't need PA annual reports (only corporations/some LLCs)

## Key Federal Forms (Sole Proprietors)
| Form | Purpose | Due |
|------|---------|-----|
| Schedule C (Form 1040) | Report business profit/loss | Annual (with return) |
| Schedule SE (Form 1040) | Self-employment tax | Annual (with return) |
| Form 1040-ES | Quarterly estimated payments | Apr 15, Jun 15, Sep 15, Jan 15 |

## Key PA Forms
| Form | Purpose | Due |
|------|---------|-----|
| PA-40 | Personal income tax return | April 15 |
| PA-40 ES | Quarterly estimated state tax | Apr 15, Jun 15, Sep 15, Jan 15 |

</specifics>

<deferred>
## Deferred Ideas

- Multi-state support — for users with income in multiple states or who moved mid-year
- Additional state-specific details beyond PA — framework in place for future expansion

</deferred>

---

*Phase: 07-tax-system*
*Context gathered: 2026-02-01*
