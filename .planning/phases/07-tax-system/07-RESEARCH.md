# Phase 7: Tax System - Research

**Researched:** 2026-02-01
**Domain:** Tax calculation, configuration UI, and quarterly payment tracking for sole proprietors
**Confidence:** HIGH

## Summary

This phase implements a comprehensive tax system for sole proprietors, covering tax rate configuration, real-time calculation with breakdowns, and quarterly payment tracking. The research focused on verifying IRS self-employment tax formulas, quarterly payment schedules, state income tax data sources, and UI patterns for expandable configuration sections.

The self-employment tax formula (15.3% of 92.35% of net income) is confirmed by IRS Topic 554. Federal brackets for 2026 are available from Tax Foundation. Pennsylvania uses a flat 3.07% rate. Quarterly estimated payments follow a standard schedule: April 15, June 15, September 15, and January 15 (of the following year). The annualized income installment method (adjusting quarterly payments based on YTD income) is the IRS-recommended approach for fluctuating self-employment income.

For UI patterns, the expandable accordion/collapsible section pattern works well for tax configuration in workspace settings. The existing SvelteKit form action patterns and Tailwind styling in the codebase provide a solid foundation. Static tax data (state rates, federal brackets) should be bundled as JSON files in `$lib/data/` for simplicity and offline reliability.

**Primary recommendation:** Extend workspace settings schema with tax configuration fields; create dedicated taxes tab with expandable breakdown sections; store static tax data as JSON; use existing SvelteKit form patterns.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.49.1 | Form actions, routing | Already in project; handles tax settings forms |
| Drizzle ORM | ^0.45.1 | Schema extension, queries | Already in project; add tax config columns |
| Tailwind CSS | ^4.1.18 | UI styling | Already in project; expandable sections, cards |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | Use existing stack; tax calculations are pure TypeScript |

### Data Sources (Static JSON)

| Source | Purpose | Update Frequency |
|--------|---------|-----------------|
| Tax Foundation state rates | Auto-fill state income tax | Annually (manual update) |
| Tax Foundation federal brackets | Bracket selection guidance | Annually (manual update) |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  routes/w/[workspace]/
    settings/
      +page.svelte              # Add tax config section
      +page.server.ts           # Handle tax settings form
    taxes/
      +page.svelte              # NEW: Taxes tab with breakdowns
      +page.server.ts           # NEW: Calculate tax estimates
  lib/
    data/
      federal-brackets-2026.ts  # NEW: Federal bracket data
      state-tax-rates.ts        # NEW: State rate lookup
      tax-forms.ts              # NEW: Form reference data (cheat sheet)
    utils/
      tax-calculations.ts       # NEW: Tax calculation functions
      reports.ts                # Existing; has TAX_SET_ASIDE_RATE
    components/
      TaxBreakdownCard.svelte   # NEW: Expandable tax section
      QuarterlyPaymentCard.svelte # NEW: Payment tracking card
```

### Pattern 1: Expandable Tax Configuration Section

**What:** Collapsible sections in settings for tax rate configuration with inline help

**When to use:** Workspace settings tax configuration

**Example:**
```svelte
<!-- Source: Tailwind patterns + existing settings page -->
<script lang="ts">
  let { settings } = $props();
  let showFederalHelp = $state(false);
</script>

<div class="rounded-lg border border-gray-200 bg-white">
  <button
    type="button"
    class="flex w-full items-center justify-between p-4 text-left"
    onclick={() => showFederalHelp = !showFederalHelp}
  >
    <span class="font-medium text-gray-900">Federal Tax Bracket</span>
    <svg class="h-5 w-5 transition-transform {showFederalHelp ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if showFederalHelp}
    <div class="border-t border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
      <p>Select the bracket that matches your expected taxable income after deductions.</p>
      <table class="mt-2 w-full text-xs">
        <tr><td>10%</td><td>$0 - $12,400</td></tr>
        <tr><td>12%</td><td>$12,401 - $50,400</td></tr>
        <!-- ... -->
      </table>
    </div>
  {/if}

  <div class="border-t border-gray-100 p-4">
    <select name="federalBracket" class="...">
      <option value="10">10% ($0 - $12,400)</option>
      <option value="12">12% ($12,401 - $50,400)</option>
      <option value="22">22% ($50,401 - $105,700)</option>
      <option value="24">24% ($105,701 - $201,775)</option>
      <option value="32">32% ($201,776 - $256,225)</option>
      <option value="35">35% ($256,226 - $640,600)</option>
      <option value="37">37% ($640,601+)</option>
    </select>
  </div>
</div>
```

### Pattern 2: Tax Calculation Functions (Pure TypeScript)

**What:** Stateless calculation functions for each tax type

**When to use:** Server-side calculation and client-side preview

**Example:**
```typescript
// Source: IRS Topic 554, verified formulas
// src/lib/utils/tax-calculations.ts

/**
 * Self-employment tax calculation
 * SE Tax = 15.3% of (Net Income * 92.35%)
 * - 12.4% Social Security (up to wage base limit)
 * - 2.9% Medicare (all income)
 *
 * All amounts in cents to match TinyLedger convention.
 */
export function calculateSelfEmploymentTax(netIncomeCents: number): {
  taxableCents: number;
  socialSecurityCents: number;
  medicareCents: number;
  totalCents: number;
  deductibleCents: number; // 50% of SE tax is deductible
} {
  if (netIncomeCents <= 0) {
    return { taxableCents: 0, socialSecurityCents: 0, medicareCents: 0, totalCents: 0, deductibleCents: 0 };
  }

  // 92.35% of net earnings
  const taxableCents = Math.round(netIncomeCents * 0.9235);

  // Social Security: 12.4% up to wage base ($184,500 for 2026)
  const WAGE_BASE_2026_CENTS = 18450000; // $184,500 in cents
  const ssIncomeCents = Math.min(taxableCents, WAGE_BASE_2026_CENTS);
  const socialSecurityCents = Math.round(ssIncomeCents * 0.124);

  // Medicare: 2.9% of all income (no cap)
  const medicareCents = Math.round(taxableCents * 0.029);

  // Additional Medicare tax: 0.9% over $200,000 threshold
  const MEDICARE_SURTAX_THRESHOLD_CENTS = 20000000; // $200,000
  const additionalMedicareCents = taxableCents > MEDICARE_SURTAX_THRESHOLD_CENTS
    ? Math.round((taxableCents - MEDICARE_SURTAX_THRESHOLD_CENTS) * 0.009)
    : 0;

  const totalCents = socialSecurityCents + medicareCents + additionalMedicareCents;
  const deductibleCents = Math.round(totalCents / 2); // 50% deductible

  return { taxableCents, socialSecurityCents, medicareCents, totalCents, deductibleCents };
}

/**
 * Federal income tax estimate
 * Uses bracket rate applied to net income after SE tax deduction
 */
export function calculateFederalIncomeTax(
  netIncomeCents: number,
  bracketRate: number, // e.g., 0.22 for 22%
  seDeductionCents: number
): number {
  const taxableIncomeCents = Math.max(0, netIncomeCents - seDeductionCents);
  return Math.round(taxableIncomeCents * bracketRate);
}

/**
 * State income tax estimate (flat rate states like PA)
 */
export function calculateStateIncomeTax(
  netIncomeCents: number,
  stateRate: number // e.g., 0.0307 for PA 3.07%
): number {
  if (netIncomeCents <= 0) return 0;
  return Math.round(netIncomeCents * stateRate);
}

/**
 * Local EIT (Earned Income Tax)
 */
export function calculateLocalEIT(
  netIncomeCents: number,
  eitRate: number // e.g., 0.01 for 1%
): number {
  if (netIncomeCents <= 0) return 0;
  return Math.round(netIncomeCents * eitRate);
}
```

### Pattern 3: Quarterly Payment Calculation (Annualized Method)

**What:** Calculate recommended quarterly payment based on YTD income

**When to use:** Quarterly payment tracking, timeline markers

**Example:**
```typescript
// Source: IRS Form 1040-ES instructions, Pub 505
// src/lib/utils/tax-calculations.ts

interface QuarterlyPayment {
  quarter: 1 | 2 | 3 | 4;
  dueDate: string; // ISO date
  dueDateLabel: string; // "Apr 15, 2026"
  recommendedCents: number;
  paidCents: number | null;
  isPaid: boolean;
  isPastDue: boolean;
  isUpcoming: boolean; // Within 30 days
}

/**
 * Get quarterly payment schedule with recommended amounts
 * Uses annualized income installment method:
 * - Annualize YTD income
 * - Calculate total estimated tax
 * - Divide by 4 for quarterly amount
 * - Adjust for payments already made
 */
export function calculateQuarterlyPayments(
  year: number,
  ytdNetIncomeCents: number,
  totalEstimatedTaxCents: number,
  paidPayments: { quarter: number; amountCents: number }[],
  currentQuarter: number
): QuarterlyPayment[] {
  const dueDates = getQuarterlyDueDates(year);
  const today = new Date().toISOString().slice(0, 10);

  // Calculate total required for year
  const totalPaidCents = paidPayments.reduce((sum, p) => sum + p.amountCents, 0);
  const remainingCents = Math.max(0, totalEstimatedTaxCents - totalPaidCents);
  const remainingQuarters = 4 - paidPayments.length;
  const perQuarterCents = remainingQuarters > 0
    ? Math.round(remainingCents / remainingQuarters)
    : 0;

  return dueDates.map((dd, i) => {
    const quarter = (i + 1) as 1 | 2 | 3 | 4;
    const paid = paidPayments.find(p => p.quarter === quarter);
    const dueDateObj = new Date(dd.dueDate);
    const todayObj = new Date(today);
    const daysUntilDue = Math.floor((dueDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

    return {
      quarter,
      dueDate: dd.dueDate,
      dueDateLabel: dd.label,
      recommendedCents: paid ? paid.amountCents : perQuarterCents,
      paidCents: paid?.amountCents ?? null,
      isPaid: !!paid,
      isPastDue: !paid && dd.dueDate < today,
      isUpcoming: !paid && daysUntilDue >= 0 && daysUntilDue <= 30
    };
  });
}

function getQuarterlyDueDates(year: number): { dueDate: string; label: string }[] {
  // Standard IRS due dates for individuals
  // Q4 is always Jan 15 of following year
  return [
    { dueDate: `${year}-04-15`, label: `Apr 15, ${year}` },
    { dueDate: `${year}-06-15`, label: `Jun 15, ${year}` },
    { dueDate: `${year}-09-15`, label: `Sep 15, ${year}` },
    { dueDate: `${year + 1}-01-15`, label: `Jan 15, ${year + 1}` }
  ];
}
```

### Pattern 4: Database Schema Extension

**What:** Add tax configuration columns to workspace_settings table

**When to use:** Migration for this phase

**Example:**
```typescript
// src/lib/server/db/schema.ts - additions
export const workspaceSettings = sqliteTable('workspace_settings', {
  // ... existing columns ...

  // Tax configuration (new)
  state: text('state').default('PA'), // Two-letter state code
  federalBracketRate: integer('federal_bracket_rate'), // Stored as percentage * 100 (e.g., 22 for 22%)
  stateRate: integer('state_rate'), // Stored as rate * 10000 (e.g., 307 for 3.07%)
  localEitRate: integer('local_eit_rate'), // Stored as rate * 10000 (e.g., 100 for 1%)
  taxNotes: text('tax_notes'), // Free text for user reference
  taxConfigured: integer('tax_configured').default(0).notNull(), // Boolean: has user set up taxes?
});

// Quarterly payments table (new)
export const quarterlyPayments = sqliteTable('quarterly_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fiscalYear: integer('fiscal_year').notNull(),
  quarter: integer('quarter').notNull(), // 1-4
  federalPaidCents: integer('federal_paid_cents'),
  statePaidCents: integer('state_paid_cents'),
  paidAt: text('paid_at'), // ISO timestamp when marked paid
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
```

### Pattern 5: Static Tax Data Structure

**What:** Bundled JSON/TypeScript for federal brackets and state rates

**When to use:** Tax configuration dropdowns and auto-fill

**Example:**
```typescript
// src/lib/data/federal-brackets-2026.ts
// Source: Tax Foundation https://taxfoundation.org/data/all/federal/2026-tax-brackets/

export interface FederalBracket {
  rate: number; // e.g., 0.22
  rateLabel: string; // e.g., "22%"
  minIncome: number; // dollars
  maxIncome: number | null; // null for top bracket
  label: string; // e.g., "22% ($50,401 - $105,700)"
}

export const FEDERAL_BRACKETS_2026: FederalBracket[] = [
  { rate: 0.10, rateLabel: '10%', minIncome: 0, maxIncome: 12400, label: '10% ($0 - $12,400)' },
  { rate: 0.12, rateLabel: '12%', minIncome: 12401, maxIncome: 50400, label: '12% ($12,401 - $50,400)' },
  { rate: 0.22, rateLabel: '22%', minIncome: 50401, maxIncome: 105700, label: '22% ($50,401 - $105,700)' },
  { rate: 0.24, rateLabel: '24%', minIncome: 105701, maxIncome: 201775, label: '24% ($105,701 - $201,775)' },
  { rate: 0.32, rateLabel: '32%', minIncome: 201776, maxIncome: 256225, label: '32% ($201,776 - $256,225)' },
  { rate: 0.35, rateLabel: '35%', minIncome: 256226, maxIncome: 640600, label: '35% ($256,226 - $640,600)' },
  { rate: 0.37, rateLabel: '37%', minIncome: 640601, maxIncome: null, label: '37% ($640,601+)' }
];

// src/lib/data/state-tax-rates.ts
// Source: Tax Foundation https://taxfoundation.org/data/all/state/state-income-tax-rates/

export interface StateRate {
  code: string;
  name: string;
  rate: number; // e.g., 0.0307 for 3.07%
  rateLabel: string;
  type: 'flat' | 'graduated';
  notes?: string;
}

export const STATE_TAX_RATES: StateRate[] = [
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307, rateLabel: '3.07%', type: 'flat' },
  // Add more states as needed...
  // For graduated states, store top marginal rate
];

export function getStateRate(code: string): StateRate | undefined {
  return STATE_TAX_RATES.find(s => s.code === code);
}
```

### Pattern 6: Tax Forms Cheat Sheet Data

**What:** Reference data for tax forms, links, and due dates

**When to use:** "Tax Forms & Resources" expandable section

**Example:**
```typescript
// src/lib/data/tax-forms.ts

export interface TaxForm {
  id: string;
  name: string;
  fullName: string;
  description: string;
  irsLink?: string;
  stateLink?: string;
  dueDate: string;
  frequency: 'annual' | 'quarterly';
  filingThreshold?: string;
  applicableStates?: string[]; // Empty = federal, ['PA'] = PA only
}

export const FEDERAL_FORMS: TaxForm[] = [
  {
    id: 'schedule-c',
    name: 'Schedule C',
    fullName: 'Schedule C (Form 1040)',
    description: 'Report profit or loss from your sole proprietorship business',
    irsLink: 'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040',
    dueDate: 'April 15 (with tax return)',
    frequency: 'annual',
    filingThreshold: 'All sole proprietors with business income'
  },
  {
    id: 'schedule-se',
    name: 'Schedule SE',
    fullName: 'Schedule SE (Form 1040)',
    description: 'Calculate self-employment tax (Social Security and Medicare)',
    irsLink: 'https://www.irs.gov/forms-pubs/about-schedule-se-form-1040',
    dueDate: 'April 15 (with tax return)',
    frequency: 'annual',
    filingThreshold: 'Net earnings of $400 or more'
  },
  {
    id: 'form-1040-es',
    name: 'Form 1040-ES',
    fullName: 'Form 1040-ES',
    description: 'Quarterly estimated tax payment vouchers',
    irsLink: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
    dueDate: 'Apr 15, Jun 15, Sep 15, Jan 15',
    frequency: 'quarterly',
    filingThreshold: 'Expect to owe $1,000+ in taxes'
  }
];

export const PA_FORMS: TaxForm[] = [
  {
    id: 'pa-40',
    name: 'PA-40',
    fullName: 'PA-40 Personal Income Tax Return',
    description: 'Pennsylvania annual income tax return',
    stateLink: 'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
    dueDate: 'April 15',
    frequency: 'annual',
    applicableStates: ['PA']
  },
  {
    id: 'pa-40-es',
    name: 'PA-40 ES',
    fullName: 'PA-40 ES Estimated Tax',
    description: 'Pennsylvania quarterly estimated tax payment',
    stateLink: 'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
    dueDate: 'Apr 15, Jun 15, Sep 15, Jan 15',
    frequency: 'quarterly',
    filingThreshold: 'Expect to owe $430+ in taxes',
    applicableStates: ['PA']
  }
];

export function getFormsForState(stateCode: string): TaxForm[] {
  const stateForms = stateCode === 'PA' ? PA_FORMS : [];
  return [...FEDERAL_FORMS, ...stateForms];
}
```

### Anti-Patterns to Avoid

- **Floating-point for currency:** Always use integer cents; tax calculations are prone to rounding errors
- **Hardcoded tax rates in multiple places:** Centralize in data files for annual updates
- **Complex bracket calculations for estimate:** User selects their bracket; don't try to calculate it from income
- **Fetching tax data from APIs:** Bundle as static data; tax rates change once per year
- **Storing calculated values:** Store configuration only; recalculate on demand

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | String concatenation | Existing `formatCurrency()` | Already handles locale, edge cases |
| Fiscal year logic | Date math | Existing `fiscal-year.ts` | Already tested, handles edge cases |
| Form validation | Custom validation | SvelteKit fail() pattern | Consistent with codebase |
| Expandable sections | Custom accordion | Native HTML details/summary or simple state toggle | Simple, accessible |
| State selection dropdown | Custom component | Standard select with static data | Straightforward |

**Key insight:** Tax calculations are pure math with well-defined formulas. The complexity is in the UX (clear explanations, proper formatting) not the calculations themselves.

## Common Pitfalls

### Pitfall 1: Floating-Point Precision

**What goes wrong:** Tax calculations produce amounts like $1234.567890001

**Why it happens:** Using JavaScript floats for percentages and currency

**How to avoid:**
- Store all amounts as integer cents
- Apply percentage calculations with explicit rounding
- Round AFTER each calculation step, not just at display

**Warning signs:** Pennies don't add up; displayed values don't match sum of parts

### Pitfall 2: Stale Tax Year Data

**What goes wrong:** Showing 2025 brackets when user is in 2026 fiscal year

**Why it happens:** Not accounting for fiscal year in rate lookups

**How to avoid:**
- Version tax data by year
- Fall back to most recent year if future year not available
- Display warning if using old data

**Warning signs:** Bracket thresholds don't match IRS publications

### Pitfall 3: Ignoring SE Tax Deduction

**What goes wrong:** Federal tax estimate is too high

**Why it happens:** Not deducting 50% of SE tax from taxable income

**How to avoid:**
- Calculate SE tax first
- Pass SE deduction to federal calculation
- Show this in the breakdown

**Warning signs:** Federal estimate much higher than user expects

### Pitfall 4: Quarterly Payment Timing

**What goes wrong:** Q4 payment shows as due Dec 15 instead of Jan 15

**Why it happens:** Confusing corporate and individual due dates

**How to avoid:**
- Individuals: Q4 is always January 15 of following year
- Corporations: Q4 is December 15
- TinyLedger is for sole props (individuals)

**Warning signs:** Fourth quarter has different due date than expected

### Pitfall 5: No Tax Configuration Prompt

**What goes wrong:** User sees $0 tax estimate because rates aren't configured

**Why it happens:** Showing calculations before user sets up tax config

**How to avoid:**
- Check `taxConfigured` flag
- Show setup prompt/banner on first visit to taxes tab
- Don't calculate with null/0 rates

**Warning signs:** Tax estimate always shows $0; user confused

### Pitfall 6: Unusual Rate Validation Too Strict

**What goes wrong:** User can't enter valid but unusual rate

**Why it happens:** Hard rejection instead of warning

**How to avoid:**
- Warn on unusual values (e.g., state rate > 15%)
- Don't prevent submission
- Let user confirm unusual values

**Warning signs:** User complains they can't save their actual rate

## Code Examples

### Tax Breakdown Card Component

```svelte
<!-- src/lib/components/TaxBreakdownCard.svelte -->
<script lang="ts">
  import { formatCurrency } from '$lib/utils/currency';

  interface Props {
    title: string;
    totalCents: number;
    items: { label: string; amountCents: number; formula?: string }[];
    expanded?: boolean;
  }

  let { title, totalCents, items, expanded = false }: Props = $props();
  let isExpanded = $state(expanded);
</script>

<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
  <button
    type="button"
    class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
    onclick={() => isExpanded = !isExpanded}
  >
    <div>
      <span class="font-medium text-gray-900">{title}</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-lg font-semibold text-gray-900">{formatCurrency(totalCents)}</span>
      <svg
        class="h-5 w-5 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </button>

  {#if isExpanded}
    <div class="border-t border-gray-100 bg-gray-50 p-4">
      <dl class="space-y-2 text-sm">
        {#each items as item}
          <div class="flex justify-between">
            <dt class="text-gray-600">
              {item.label}
              {#if item.formula}
                <span class="text-xs text-gray-400 ml-1">({item.formula})</span>
              {/if}
            </dt>
            <dd class="font-medium text-gray-900">{formatCurrency(item.amountCents)}</dd>
          </div>
        {/each}
      </dl>
    </div>
  {/if}
</div>
```

### Quarterly Payment Timeline Marker

```svelte
<!-- For timeline integration -->
<script lang="ts">
  import { formatCurrency } from '$lib/utils/currency';

  interface Props {
    quarter: number;
    dueDate: string;
    dueDateLabel: string;
    recommendedCents: number;
    isPaid: boolean;
    isPastDue: boolean;
    isUpcoming: boolean;
  }

  let { quarter, dueDate, dueDateLabel, recommendedCents, isPaid, isPastDue, isUpcoming }: Props = $props();

  // Border color based on status
  const borderClass = $derived(
    isPaid ? 'border-green-300 bg-green-50'
    : isPastDue ? 'border-red-300 bg-red-50'
    : isUpcoming ? 'border-yellow-300 bg-yellow-50'
    : 'border-gray-200 bg-gray-50'
  );
</script>

<div
  class="rounded-lg border-2 p-3 {borderClass}"
  data-component="quarterly-payment-marker"
>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700">Q{quarter} Estimated Tax</span>
      {#if isPaid}
        <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Paid
        </span>
      {:else if isPastDue}
        <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          Past Due
        </span>
      {/if}
    </div>
    <span class="text-sm text-gray-500">{dueDateLabel}</span>
  </div>
  <div class="mt-1 text-lg font-semibold text-gray-900">
    {formatCurrency(recommendedCents)}
  </div>
</div>
```

### Tax Tab Page Server Load

```typescript
// src/routes/w/[workspace]/taxes/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { workspaceSettings, transactions, quarterlyPayments } from '$lib/server/db/schema';
import { isNull, and, gte, lte, eq, sql } from 'drizzle-orm';
import { getCurrentFiscalYear, getFiscalYearRange } from '$lib/utils/fiscal-year';
import {
  calculateSelfEmploymentTax,
  calculateFederalIncomeTax,
  calculateStateIncomeTax,
  calculateLocalEIT,
  calculateQuarterlyPayments
} from '$lib/utils/tax-calculations';

export const load: PageServerLoad = async ({ locals, url, params }) => {
  const db = locals.db;
  if (!db) throw error(500, 'Database not initialized');

  const settings = db.select().from(workspaceSettings).get();
  if (!settings) throw error(500, 'Workspace settings not found');

  // Check if tax configured
  if (!settings.taxConfigured) {
    return {
      needsConfiguration: true,
      workspaceId: params.workspace
    };
  }

  const fiscalYearStartMonth = settings.fiscalYearStartMonth;
  const fiscalYear = parseInt(url.searchParams.get('fy') || getCurrentFiscalYear(fiscalYearStartMonth).toString());
  const { start: fyStart, end: fyEnd } = getFiscalYearRange(fiscalYear, fiscalYearStartMonth);

  // Calculate YTD net income
  const totals = db
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`,
      expenses: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`
    })
    .from(transactions)
    .where(and(
      isNull(transactions.deletedAt),
      gte(transactions.date, fyStart),
      lte(transactions.date, fyEnd)
    ))
    .get();

  const netIncomeCents = (totals?.income ?? 0) - (totals?.expenses ?? 0);

  // Calculate taxes
  const seTax = calculateSelfEmploymentTax(netIncomeCents);
  const federalRate = (settings.federalBracketRate ?? 0) / 100;
  const stateRate = (settings.stateRate ?? 0) / 10000;
  const eitRate = (settings.localEitRate ?? 0) / 10000;

  const federalTaxCents = calculateFederalIncomeTax(netIncomeCents, federalRate, seTax.deductibleCents);
  const stateTaxCents = calculateStateIncomeTax(netIncomeCents, stateRate);
  const localTaxCents = calculateLocalEIT(netIncomeCents, eitRate);
  const totalEstimatedTaxCents = seTax.totalCents + federalTaxCents + stateTaxCents + localTaxCents;

  // Get paid quarterly payments
  const paidPayments = db
    .select()
    .from(quarterlyPayments)
    .where(eq(quarterlyPayments.fiscalYear, fiscalYear))
    .all();

  const quarterlySchedule = calculateQuarterlyPayments(
    fiscalYear,
    netIncomeCents,
    totalEstimatedTaxCents,
    paidPayments.map(p => ({ quarter: p.quarter, amountCents: (p.federalPaidCents ?? 0) + (p.statePaidCents ?? 0) })),
    getCurrentQuarter()
  );

  return {
    needsConfiguration: false,
    fiscalYear,
    netIncomeCents,
    taxes: {
      selfEmployment: seTax,
      federal: { totalCents: federalTaxCents, rate: federalRate },
      state: { totalCents: stateTaxCents, rate: stateRate },
      local: { totalCents: localTaxCents, rate: eitRate },
      total: totalEstimatedTaxCents
    },
    quarterlyPayments: quarterlySchedule,
    workspaceId: params.workspace
  };
};

function getCurrentQuarter(): number {
  const month = new Date().getMonth() + 1;
  return Math.ceil(month / 3);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Complex bracket calculations | User selects bracket | UX simplification | Avoids W-2 income guessing |
| API calls for tax data | Static bundled JSON | Performance | Offline-capable, no API dependency |
| Separate tax settings page | Integrated in workspace settings | UX consistency | Single settings location |

**Deprecated/outdated:**
- 2025 federal brackets (use 2026 data)
- 2025 wage base limit (was $176,100, now $184,500 for 2026)

## Open Questions

1. **Previous FY Comparison on Tax Estimates (Claude's Discretion)**
   - What we know: User asked for this as optional
   - What's unclear: How valuable is this given income variability?
   - Recommendation: Add if simple (just show previous FY estimate in smaller text); defer if complex. The comparison makes sense for net income but taxes depend heavily on rate configuration which may change.

2. **Exact Visual Treatment of Timeline Markers (Claude's Discretion)**
   - What we know: Should be "distinct visual style from regular transactions"
   - What's unclear: Exact styling
   - Recommendation: Use dashed border, muted colors, icon indicator (calendar or dollar sign) to distinguish from transaction entries

3. **Warning Thresholds for Unusual Rate Values (Claude's Discretion)**
   - What we know: Warn on unusual values but accept any input
   - What's unclear: What thresholds are appropriate?
   - Recommendation: Warn if state rate > 15% (CA is ~13.3%, highest in US), warn if federal bracket is outside 10-37%, warn if local EIT > 5%

## Sources

### Primary (HIGH confidence)
- IRS Topic 554 - Self-employment tax formula: https://www.irs.gov/taxtopics/tc554
- IRS Form 1040-ES - Quarterly payment dates: https://www.irs.gov/forms-pubs/about-form-1040-es
- Tax Foundation 2026 Federal Brackets: https://taxfoundation.org/data/all/federal/2026-tax-brackets/
- PA Department of Revenue - 3.07% flat rate: https://www.pa.gov/agencies/revenue/resources/tax-rates
- Context7 /sveltejs/kit - Form actions, validation patterns

### Secondary (MEDIUM confidence)
- Tax Foundation State Income Tax Rates: https://taxfoundation.org/data/all/state/state-income-tax-rates/
- NerdWallet Quarterly Tax Guide: https://www.nerdwallet.com/taxes/learn/estimated-quarterly-taxes
- Millan CPA 2026 Tax Calendar: https://millancpa.com/2026-irs-tax-calendar-deadlines-forms/

### Tertiary (LOW confidence)
- NN/g Calculator UX Recommendations (general UX guidance, not tax-specific)

## Metadata

**Confidence breakdown:**
- Tax formulas: HIGH - Verified with IRS official sources
- Quarterly dates: HIGH - Multiple sources agree (Apr 15, Jun 15, Sep 15, Jan 15)
- State rates: HIGH - PA 3.07% confirmed by PA DOR
- Federal brackets 2026: HIGH - Tax Foundation data
- UI patterns: HIGH - Based on existing TinyLedger patterns and SvelteKit docs
- Database schema: HIGH - Follows existing Drizzle patterns in codebase

**Research date:** 2026-02-01
**Valid until:** 2026-04-15 (tax rates change annually; update before 2027)

---

## Discretionary Recommendations

### Previous FY Comparison: Include, Keep Simple

**Recommendation:** Show previous FY total estimate in smaller text below current estimate

**Rationale:**
1. Users want to know if their tax burden is increasing
2. Simple comparison (just totals) is quick to implement
3. Avoids complexity of rate-adjusted comparisons
4. Matches existing pattern in Reports dashboard (shows % change vs previous FY)

### Timeline Marker Styling

**Recommendation:** Dashed border, calendar icon, muted background (gray-50), smaller text

**Rationale:**
1. Dashed border = "scheduled" or "planned" visual language
2. Calendar icon distinguishes from transaction's payment method icon
3. Muted colors = system-generated vs user-entered
4. Same border-color warning behavior (yellow approaching, red past due)

### Warning Thresholds

**Recommendation:**
- State rate > 15%: "This rate seems high. California has the highest state rate at 13.3%."
- Federal bracket < 10% or > 37%: "Please select a valid 2026 federal tax bracket."
- Local EIT > 5%: "Most local EIT rates are under 3%. Please verify this rate."

**Rationale:**
1. Soft warnings, not hard blocks
2. Educational tone ("seems high", "verify")
3. Based on actual rate ranges (CA max 13.3%, PA EIT max ~3.6%)
