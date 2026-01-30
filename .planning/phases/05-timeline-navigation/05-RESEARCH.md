# Phase 5: Timeline & Navigation - Research

**Researched:** 2026-01-30
**Domain:** SvelteKit URL state management, timeline UI components, fiscal year calculations
**Confidence:** HIGH

## Summary

This phase implements a fiscal year-aware transaction timeline with filtering capabilities. The core challenges are:
1. Managing filter state in URL for shareability and persistence
2. Building a visually appealing vertical timeline with date grouping
3. Calculating fiscal year boundaries with configurable start month
4. Implementing scroll-to-current behavior with proper element references

The standard approach uses SvelteKit's built-in URL state management with `page.url.searchParams` for reading and `goto()` for writing, combined with Tailwind CSS utility classes for the vertical timeline design (Flowbite-inspired pattern). Fiscal year calculation is pure JavaScript with no external libraries needed. Drizzle ORM provides all necessary operators for date range filtering and aggregation.

**Primary recommendation:** Use native SvelteKit URL state management with GET forms for progressive enhancement. Build timeline UI with Tailwind utilities following Flowbite's `border-s` + absolute positioning pattern. Add `fiscalYearStartMonth` to workspace_settings schema.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.49.1 | URL state via `page.url.searchParams` + `goto()` | Built-in, no extra dependencies |
| Tailwind CSS | ^4.1.18 | Timeline styling with `sticky`, `border-s`, positioning | Already configured |
| Drizzle ORM | ^0.45.1 | Date range queries with `gte`, `lte`, `between` | Existing data layer |
| microfuzz | ^1.0.0 | Payee search filtering | Already used in Phase 3 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Svelte 5 | ^5.45.6 | `$state`, `$derived`, `$effect`, `bind:this` | Reactive filter state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native URL state | sveltekit-search-params | Extra dependency; native approach is sufficient for this use case |
| Native URL state | runed useSearchParams | Adds schema validation overhead; overkill for simple filters |
| Custom timeline | Flowbite components | Flowbite adds JS dependencies; CSS pattern is enough |

**Installation:**
No additional packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── utils/
│   │   └── fiscal-year.ts       # Fiscal year calculation utilities
│   └── components/
│       ├── TimelineEntry.svelte # Single transaction in timeline
│       ├── TimelineDateMarker.svelte # Date group header
│       ├── FilterBar.svelte     # Filter controls component
│       ├── FiscalYearPicker.svelte # Year selector dropdown
│       └── QuickEntryFAB.svelte # Floating action button + form
└── routes/
    └── w/[workspace]/
        └── transactions/
            ├── +page.svelte     # Timeline view (update existing)
            └── +page.server.ts  # Load with filters (update existing)
```

### Pattern 1: URL State for Filters
**What:** Store filter state in URL search params for shareability and browser history
**When to use:** Any filter/sort state that should survive page reload
**Example:**
```typescript
// Source: SvelteKit docs - State Management
// +page.server.ts
export const load: PageServerLoad = async ({ url, locals }) => {
  const fiscalYear = url.searchParams.get('fy') ?? getCurrentFiscalYear();
  const payee = url.searchParams.get('payee') ?? '';
  const tags = url.searchParams.getAll('tag');
  const type = url.searchParams.get('type') as 'income' | 'expense' | null;
  const dateFrom = url.searchParams.get('from');
  const dateTo = url.searchParams.get('to');
  const paymentMethod = url.searchParams.get('method');

  // Build query with filters...
};

// +page.svelte - Update URL without full reload
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams($page.url.searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    goto(`?${params.toString()}`, { replaceState: true, noScroll: true });
  }
</script>
```

### Pattern 2: Vertical Timeline with Tailwind
**What:** CSS-only timeline using border and absolute positioning
**When to use:** Activity feeds, chronological displays
**Example:**
```svelte
<!-- Source: Flowbite Timeline Pattern -->
<ol class="relative border-s-2 border-gray-200">
  {#each groupedByDate as [date, transactions]}
    <li class="mb-8 ms-6">
      <!-- Date marker -->
      <span class="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-8 ring-white">
        <svg class="h-3 w-3 text-blue-800" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z"/>
        </svg>
      </span>
      <time class="mb-1 text-sm font-normal leading-none text-gray-500">{formatDate(date)}</time>

      <!-- Transaction cards for this date -->
      {#each transactions as txn}
        <a href="/w/{workspaceId}/transactions/{txn.publicId}"
           class="mt-2 block rounded-lg border bg-white p-3 shadow-sm hover:bg-gray-50">
          <!-- Transaction content -->
        </a>
      {/each}
    </li>
  {/each}
</ol>
```

### Pattern 3: Sticky Header with Totals
**What:** Fixed header showing fiscal year picker and running totals
**When to use:** Long scrollable lists needing persistent context
**Example:**
```svelte
<!-- Source: Tailwind CSS Position docs -->
<header class="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
  <div class="flex items-center justify-between px-4 py-3">
    <FiscalYearPicker {fiscalYear} {availableYears} />
    <div class="flex gap-4 text-sm">
      <span class="text-green-600">+{formatCurrency(totalIncome)}</span>
      <span class="text-red-600">-{formatCurrency(totalExpense)}</span>
      <span class="font-semibold">{formatCurrency(netIncome)}</span>
    </div>
  </div>
</header>
```

### Pattern 4: Scroll to Element
**What:** Auto-scroll to most recent transaction on load
**When to use:** Timeline views where current context matters
**Example:**
```svelte
<!-- Source: Svelte docs - bind:this -->
<script lang="ts">
  let currentTransactionEl: HTMLElement;

  $effect(() => {
    if (currentTransactionEl) {
      currentTransactionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
</script>

{#each transactions as txn}
  <div bind:this={txn.isToday ? currentTransactionEl : null}>
    <!-- transaction -->
  </div>
{/each}
```

### Pattern 5: Fiscal Year Calculation
**What:** Calculate fiscal year boundaries from configurable start month
**When to use:** Financial applications with non-calendar year accounting
**Example:**
```typescript
// Source: Adapted from GitHub Gist westc/55314af02bc5a5551f3cb64fb5c07c93
export function getFiscalYear(date: Date, startMonth: number = 1): number {
  // startMonth: 1 = January (calendar year), 4 = April, 7 = July, 10 = October
  const month = date.getMonth() + 1; // Convert to 1-indexed
  const year = date.getFullYear();
  // If current month is before fiscal year start, we're in previous FY
  return month < startMonth ? year : year + 1;
}

export function getFiscalYearRange(fiscalYear: number, startMonth: number = 1): { start: string; end: string } {
  // Fiscal year 2026 with startMonth=1 (Jan) means Jan 1 2026 - Dec 31 2026
  // Fiscal year 2026 with startMonth=7 (Jul) means Jul 1 2025 - Jun 30 2026
  const startYear = startMonth === 1 ? fiscalYear : fiscalYear - 1;
  const endYear = startMonth === 1 ? fiscalYear : fiscalYear;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;

  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-${getLastDayOfMonth(endYear, endMonth)}`;

  return { start, end };
}
```

### Anti-Patterns to Avoid
- **Client-side state for filters:** Filters won't persist on refresh or be shareable
- **Full page reload on filter change:** Use `goto()` with `replaceState: true` and `noScroll: true`
- **N+1 queries for tag names:** Join tags in single query, not per-transaction
- **Blocking scroll on every filter change:** Only scroll-to-current on initial load or explicit action

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy payee search | Custom fuzzy matcher | microfuzz (already installed) | Handles edge cases, typos, ranking |
| URL param encoding | Manual string manipulation | URLSearchParams API | Handles special characters, multiple values |
| Date formatting | Custom format functions | Intl.DateTimeFormat | Locale-aware, handles edge cases |
| Month/year edge cases | Manual date math | Date object methods | Leap years, varying month lengths |

**Key insight:** JavaScript's built-in `Date` and `Intl` APIs handle most date display needs. Only create utilities for fiscal year boundary calculation.

## Common Pitfalls

### Pitfall 1: Fiscal Year Off-by-One
**What goes wrong:** Transactions on fiscal year boundary assigned to wrong year
**Why it happens:** Confusion between "FY2026 starting July" meaning Jul 2025 - Jun 2026
**How to avoid:** Document clearly: "FY XXXX" refers to the year the fiscal year ENDS
**Warning signs:** Year boundary transactions appearing in wrong period

### Pitfall 2: URL State Race Conditions
**What goes wrong:** Rapid filter changes cause stale updates
**Why it happens:** Multiple `goto()` calls before previous resolves
**How to avoid:** Use `replaceState: true` consistently; debounce rapid inputs
**Warning signs:** Filter UI and URL getting out of sync

### Pitfall 3: Empty State Confusion
**What goes wrong:** User can't tell if year is empty vs filters too restrictive
**Why it happens:** Same "no results" message for both cases
**How to avoid:** Show different messages: "No transactions in FY2024" vs "No transactions match filters (5 hidden)"
**Warning signs:** Users confused about whether they have data

### Pitfall 4: Date String Comparison Gotcha
**What goes wrong:** Date filtering misses transactions
**Why it happens:** String comparison with YYYY-MM-DD works, but timezone issues if using Date objects
**How to avoid:** Keep dates as ISO strings in DB and queries; compare strings directly
**Warning signs:** Transactions near midnight appearing in wrong day

### Pitfall 5: Scroll Position Reset
**What goes wrong:** Every filter change scrolls to top
**Why it happens:** SvelteKit's default navigation behavior
**How to avoid:** Use `goto()` with `noScroll: true` option
**Warning signs:** User loses place when adjusting filters

## Code Examples

Verified patterns from official sources:

### Date Range Query with Drizzle
```typescript
// Source: Drizzle ORM docs - operators
import { gte, lte, and, eq, isNull, desc } from 'drizzle-orm';

const results = db
  .select()
  .from(transactions)
  .where(
    and(
      isNull(transactions.deletedAt),
      gte(transactions.date, fiscalStart), // '2025-07-01'
      lte(transactions.date, fiscalEnd),   // '2026-06-30'
      type ? eq(transactions.type, type) : undefined,
      paymentMethod ? eq(transactions.paymentMethod, paymentMethod) : undefined
    )
  )
  .orderBy(desc(transactions.date), desc(transactions.createdAt))
  .all();
```

### Aggregate Totals Query
```typescript
// Source: Drizzle ORM docs - select
import { sql, eq, and, gte, lte, isNull } from 'drizzle-orm';

const totals = db
  .select({
    type: transactions.type,
    total: sql<number>`sum(${transactions.amountCents})`.mapWith(Number)
  })
  .from(transactions)
  .where(
    and(
      isNull(transactions.deletedAt),
      isNull(transactions.voidedAt),
      gte(transactions.date, fiscalStart),
      lte(transactions.date, fiscalEnd)
    )
  )
  .groupBy(transactions.type)
  .all();

const income = totals.find(t => t.type === 'income')?.total ?? 0;
const expense = totals.find(t => t.type === 'expense')?.total ?? 0;
const netIncome = income - expense;
```

### Group Transactions by Date
```typescript
// Pure JavaScript - no library needed
function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const existing = groups.get(item.date);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.date, [item]);
    }
  }
  return groups;
}
```

### Progressive Enhancement Filter Form
```svelte
<!-- Source: SvelteKit docs - form actions -->
<form method="GET" class="flex gap-2">
  <input
    type="text"
    name="payee"
    value={$page.url.searchParams.get('payee') ?? ''}
    placeholder="Search payee..."
    class="rounded border px-3 py-2"
  />
  <select name="type">
    <option value="">All types</option>
    <option value="income" selected={$page.url.searchParams.get('type') === 'income'}>Income</option>
    <option value="expense" selected={$page.url.searchParams.get('type') === 'expense'}>Expense</option>
  </select>
  <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white">Filter</button>
</form>
```

### Floating Action Button with Sheet
```svelte
<script lang="ts">
  let showForm = $state(false);
</script>

<!-- FAB -->
<button
  onclick={() => showForm = true}
  class="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
>
  <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" />
  </svg>
</button>

<!-- Sheet overlay -->
{#if showForm}
  <div class="fixed inset-0 z-40 bg-black/50" onclick={() => showForm = false}></div>
  <div class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white p-6 shadow-xl md:inset-auto md:right-6 md:bottom-24 md:w-96 md:rounded-2xl">
    <QuickEntryForm onClose={() => showForm = false} />
  </div>
{/if}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte stores for URL state | `page.url.searchParams` + `goto()` | SvelteKit 1.0 | No sync issues |
| `createEventDispatcher` | Callback props + `$bindable` | Svelte 5 | Simpler component APIs |
| `$:` reactive statements | `$derived`, `$effect` | Svelte 5 | Explicit reactivity |
| Moment.js fiscal years | Native Date + custom utility | 2020+ | No huge dependency |

**Deprecated/outdated:**
- Using stores to mirror URL state (causes sync issues)
- External date libraries for simple formatting (Intl API is sufficient)

## Open Questions

Things that couldn't be fully resolved:

1. **Filter persistence across sessions**
   - What we know: URL state persists on reload but not across sessions
   - What's unclear: Should last-used filters be remembered in localStorage?
   - Recommendation: Start without persistence; add via localStorage if users request it

2. **Animation between fiscal years**
   - What we know: User wants smooth transitions
   - What's unclear: What animation style fits the app's character
   - Recommendation: Start with CSS transitions on opacity/transform; refine based on feel

## Sources

### Primary (HIGH confidence)
- [Svelte docs - svelte/reactivity](https://svelte.dev/docs/svelte/svelte-reactivity) - SvelteURLSearchParams
- [SvelteKit docs - state-management](https://svelte.dev/docs/kit/state-management) - URL state patterns
- [Svelte docs - bind](https://svelte.dev/docs/svelte/bind) - bind:this for scroll-to
- [Drizzle ORM docs - operators](https://orm.drizzle.team/docs/operators) - gte, lte, between
- [Drizzle ORM docs - select](https://orm.drizzle.team/docs/select) - aggregations, groupBy
- [Tailwind CSS docs - position](https://tailwindcss.com/docs/position) - sticky positioning

### Secondary (MEDIUM confidence)
- [Flowbite Timeline Component](https://flowbite.com/docs/components/timeline/) - HTML/CSS pattern
- [GitHub Gist - Fiscal Year Calculation](https://gist.github.com/westc/55314af02bc5a5551f3cb64fb5c07c93) - Algorithm reference

### Tertiary (LOW confidence)
- [sveltekit-search-params](https://github.com/paoloricciuti/sveltekit-search-params) - Alternative approach (not recommended for this use case)
- [runed useSearchParams](https://runed.dev/docs/utilities/use-search-params) - Schema-driven alternative (overkill here)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing project dependencies + built-in APIs
- Architecture: HIGH - Patterns verified against official SvelteKit and Drizzle docs
- Pitfalls: MEDIUM - Based on common patterns and experience; some edge cases may emerge

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - stable patterns, no fast-moving dependencies)

---

## Schema Changes Required

The workspace_settings table needs a new column for fiscal year start month:

```sql
-- Add to existing schema
ALTER TABLE workspace_settings ADD COLUMN fiscal_year_start_month INTEGER DEFAULT 1 NOT NULL;
-- 1 = January (calendar year), 4 = April, 7 = July, 10 = October, etc.
```

This should be added via Drizzle schema update and migration.
