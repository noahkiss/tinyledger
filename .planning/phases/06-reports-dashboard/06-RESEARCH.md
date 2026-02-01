# Phase 6: Reports Dashboard - Research

**Researched:** 2026-02-01
**Domain:** Data visualization with Chart.js in Svelte 5 / SvelteKit
**Confidence:** HIGH

## Summary

This phase implements a financial reports dashboard with summary cards and interactive charts using Chart.js. The research focused on Chart.js integration patterns with Svelte 5, sparkline implementation, and the click-to-filter interaction pattern that navigates users to filtered transaction lists.

Chart.js v4.x is the current stable version and works well with Svelte 5 through direct canvas binding using `$effect()`. While the `svelte-chartjs` wrapper exists (v3.1.5), it predates Svelte 5 runes and direct integration is simpler, more maintainable, and follows the patterns already established in TinyLedger. For sparklines, Chart.js line charts with minimal configuration (no axes, no gridlines, no points) provide the cleanest solution without requiring additional libraries.

For the discretionary decision on chart type: **horizontal bar charts are recommended over doughnut charts** for spending breakdown. Horizontal bars handle long tag names better, support many categories without becoming unreadable, and are easier to compare values accurately. Doughnut charts are only effective with 2-6 segments.

**Primary recommendation:** Use Chart.js directly with Svelte 5 `$effect()` for canvas lifecycle management; implement sparklines as minimal line charts; use horizontal bar for spending breakdown.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chart.js | ^4.5.1 | Canvas-based charting | Lightweight (~60KB gzipped), tree-shakable, well-documented, widely adopted |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Direct Chart.js integration with Svelte 5 is simpler than wrappers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct Chart.js | svelte-chartjs v3.1.5 | Wrapper adds abstraction but lacks explicit Svelte 5 runes support; direct is cleaner |
| Chart.js sparklines | sparklines.js | Separate library adds bundle size; Chart.js can do sparklines natively with minimal config |
| Chart.js | D3.js | D3 is more flexible but higher learning curve; Chart.js is sufficient for this use case |

**Installation:**
```bash
npm install chart.js
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  routes/w/[workspace]/
    reports/
      +page.svelte             # Reports dashboard page
      +page.server.ts          # Server-side data aggregation
  lib/
    components/
      charts/
        NetIncomeChart.svelte   # Line chart: net income over time
        SpendingBreakdown.svelte # Horizontal bar: spending by tag
        IncomeVsExpense.svelte  # Grouped bar: income vs expense by month
        Sparkline.svelte        # Reusable inline sparkline component
      SummaryCard.svelte        # Summary card with sparkline
    utils/
      reports.ts                # Report data aggregation helpers
```

### Pattern 1: Chart.js with Svelte 5 $effect

**What:** Initialize Chart.js on canvas using `$effect()` for lifecycle management and cleanup

**When to use:** All chart components

**Example:**
```svelte
<!-- Source: Svelte 5 docs + Chart.js docs -->
<script lang="ts">
  import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

  // Register only what you need (tree-shaking)
  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

  let { data, labels } = $props<{ data: number[]; labels: string[] }>();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  $effect(() => {
    // Cleanup previous chart instance
    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#3b82f6',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // Cleanup on unmount
    return () => {
      chart?.destroy();
    };
  });
</script>

<div class="h-64">
  <canvas bind:this={canvas}></canvas>
</div>
```

### Pattern 2: Click-to-Filter Navigation

**What:** Handle chart click events to navigate to transactions page with filters applied

**When to use:** All interactive charts

**Example:**
```svelte
<!-- Source: Chart.js docs onClick event -->
<script lang="ts">
  import { goto } from '$app/navigation';

  let { workspaceId } = $props<{ workspaceId: string }>();

  function handleChartClick(event: ChartEvent, elements: ActiveElement[], chart: Chart) {
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const label = chart.data.labels?.[firstElement.index];

    // Navigate to transactions with tag filter
    const url = new URL(`/w/${workspaceId}/transactions`, window.location.origin);
    url.searchParams.set('tag', String(label));
    goto(url.toString());
  }

  // In chart options:
  // options: { onClick: handleChartClick }
</script>
```

### Pattern 3: Sparkline Configuration

**What:** Chart.js line chart configured as minimal sparkline

**When to use:** Hero card inline trend visualization

**Example:**
```svelte
<!-- Source: Chart.js docs + Sparkline pattern research -->
<script lang="ts">
  import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';

  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);

  let { data } = $props<{ data: number[] }>();
  let canvas: HTMLCanvasElement;

  $effect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: data[data.length - 1] >= data[0] ? '#22c55e' : '#ef4444',
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        interaction: { enabled: false }
      }
    });

    return () => chart.destroy();
  });
</script>

<canvas bind:this={canvas} class="h-8 w-24"></canvas>
```

### Pattern 4: Server-Side Data Aggregation

**What:** Compute all report metrics on the server in `+page.server.ts`

**When to use:** Reports dashboard data loading

**Example:**
```typescript
// Source: Existing TinyLedger patterns
export const load: PageServerLoad = async ({ locals, url }) => {
  const db = locals.db;

  // Parse period parameters (month/quarter)
  const granularity = url.searchParams.get('granularity') || 'monthly';
  const fiscalYear = parseInt(url.searchParams.get('fy') || getCurrentFiscalYear().toString());

  // Aggregate by period
  const periodData = db
    .select({
      period: sql`strftime('%Y-%m', ${transactions.date})`,
      income: sql`SUM(CASE WHEN type = 'income' AND voided_at IS NULL THEN amount_cents ELSE 0 END)`,
      expense: sql`SUM(CASE WHEN type = 'expense' AND voided_at IS NULL THEN amount_cents ELSE 0 END)`
    })
    .from(transactions)
    .where(/* fiscal year filter */)
    .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
    .all();

  // Aggregate by tag (for spending breakdown)
  const tagData = db
    .select({
      tagId: transactionTags.tagId,
      tagName: tags.name,
      total: sql`SUM(${transactions.amountCents} * ${transactionTags.percentage} / 100)`
    })
    .from(transactionTags)
    .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(/* filters */)
    .groupBy(transactionTags.tagId)
    .all();

  return { periodData, tagData, /* summary metrics */ };
};
```

### Anti-Patterns to Avoid

- **Creating new Chart instances without destroying old ones:** Always call `chart.destroy()` before creating a new instance or in cleanup
- **Using onMount instead of $effect for reactive data:** $effect automatically handles reactivity when data changes
- **Importing all of Chart.js:** Use tree-shakable imports to reduce bundle size
- **Client-side data aggregation:** SQL aggregation is faster and keeps bundle smaller

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom canvas drawing | Chart.js | Handles responsiveness, tooltips, animations, accessibility |
| Sparkline component | SVG path calculations | Chart.js minimal line | Consistent API, automatic scaling |
| Period calculations | Custom date math | Existing `fiscal-year.ts` | Already tested, handles edge cases |
| Percentage formatting | Manual string concat | Intl.NumberFormat | Handles locale, edge cases |
| Currency formatting | Custom function | Existing `formatCurrency` | Already in codebase |

**Key insight:** Chart.js is designed for exactly this use case. The configuration API handles 90% of customization needs without writing drawing code.

## Common Pitfalls

### Pitfall 1: Chart Memory Leaks

**What goes wrong:** Canvas elements accumulate Chart instances, causing memory bloat and rendering glitches

**Why it happens:** Creating new Chart without destroying previous instance when data changes or component unmounts

**How to avoid:** Always destroy chart in `$effect` cleanup function:
```typescript
$effect(() => {
  if (chart) chart.destroy();
  chart = new Chart(ctx, config);
  return () => chart?.destroy();
});
```

**Warning signs:** Charts flicker on data updates, browser memory grows over time

### Pitfall 2: Canvas Not Ready

**What goes wrong:** `getContext('2d')` returns null or chart renders incorrectly

**Why it happens:** Trying to access canvas before DOM is mounted

**How to avoid:** Use `bind:this` and check canvas exists before Chart creation. With `$effect()` this happens after mount automatically.

**Warning signs:** Console errors about null context, blank chart areas

### Pitfall 3: Aspect Ratio Fighting

**What goes wrong:** Chart doesn't fill container or overflows

**Why it happens:** Chart.js default `maintainAspectRatio: true` conflicts with CSS sizing

**How to avoid:** Set `maintainAspectRatio: false` and control size via container CSS

**Warning signs:** Charts are wrong size, ignore CSS dimensions

### Pitfall 4: Touch Events on Mobile

**What goes wrong:** Click-to-filter doesn't work reliably on mobile

**Why it happens:** Chart.js onClick triggers on mouseup, mobile touch handling differs

**How to avoid:** Chart.js handles touch events when configured properly. Ensure `events: ['click', 'touchstart', 'touchend']` if needed.

**Warning signs:** Taps on mobile don't trigger filters

### Pitfall 5: Stale Data Comparisons

**What goes wrong:** "% change vs last period" shows wrong values for partial periods

**Why it happens:** Comparing incomplete current month to complete previous month

**How to avoid:** Display "as of today" indicator for current period; compare to same point in previous period if possible, or clearly label as partial

**Warning signs:** Current month always looks worse than historical months

## Code Examples

### Chart.js Tree-Shaking Registration

```typescript
// Source: Chart.js docs - only register what you use
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);
```

### Horizontal Bar Chart for Spending Breakdown

```typescript
// Source: Chart.js docs - horizontal bar
const config = {
  type: 'bar',
  data: {
    labels: tagNames,
    datasets: [{
      data: amounts,
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
      ]
    }]
  },
  options: {
    indexAxis: 'y', // Makes it horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { beginAtZero: true }
    },
    onClick: handleChartClick
  }
};
```

### Grouped Bar Chart for Income vs Expense

```typescript
// Source: Chart.js docs - grouped bar
const config = {
  type: 'bar',
  data: {
    labels: monthLabels, // ['Jan', 'Feb', 'Mar', ...]
    datasets: [
      {
        label: 'Income',
        data: incomeByMonth,
        backgroundColor: '#22c55e'
      },
      {
        label: 'Expenses',
        data: expensesByMonth,
        backgroundColor: '#ef4444'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
};
```

### Summary Card with Percentage Change

```svelte
<!-- Matches TinyLedger aesthetic -->
<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-gray-500">{label}</span>
    {#if percentChange !== null}
      <span class="text-xs {percentChange >= 0 ? 'text-green-600' : 'text-red-600'}">
        {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
      </span>
    {/if}
  </div>
  <div class="mt-2 flex items-end justify-between">
    <span class="text-2xl font-bold text-gray-900">{formatCurrency(value)}</span>
    <Sparkline data={trendData} class="h-8 w-20" />
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js v2 callbacks | Chart.js v4 TypeScript types | v3 (2021) | Better DX, tree-shaking |
| svelte-chartjs wrapper | Direct $effect integration | Svelte 5 (2024) | Simpler, no wrapper needed |
| Pie charts for categories | Horizontal bar preferred | UX research | Better readability for many items |

**Deprecated/outdated:**
- Chart.js v2.x syntax (different config structure)
- svelte-chartjs for Svelte 5 (no runes support documented)
- `onMount` pattern for chart initialization (use `$effect` for reactivity)

## Open Questions

1. **Tax set-aside calculation details**
   - What we know: Summary card shows "tax set-aside" amount
   - What's unclear: Is this a configurable percentage? Where is it stored?
   - Recommendation: Check if workspace settings has a tax rate field; if not, may need to add in this phase or use a sensible default (e.g., 25% of net income)

2. **Sparkline data granularity**
   - What we know: Hero card shows trend sparkline
   - What's unclear: Should sparkline show last 12 months, last 6 months, or current FY?
   - Recommendation: Use current fiscal year months (consistent with dashboard scope)

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/chartjs` - Chart.js setup, onClick events, chart types, configuration
- Context7 `/websites/svelte_dev` - Svelte 5 $effect, bind:this, canvas integration
- Chart.js Official Docs - https://www.chartjs.org/docs/latest/
- Svelte 5 Docs - https://svelte.dev/docs/svelte/$effect

### Secondary (MEDIUM confidence)
- svelte-chartjs GitHub - https://github.com/SauravKanchan/svelte-chartjs (v3.1.5, Feb 2024)
- WebSearch verified: Chart.js sparkline patterns, horizontal bar vs doughnut recommendations

### Tertiary (LOW confidence)
- WebSearch only: Specific Svelte 5 + Chart.js community patterns (limited examples available)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Chart.js is well-documented, Context7 verified
- Architecture: HIGH - Patterns derived from official Svelte 5 docs and existing TinyLedger code
- Pitfalls: HIGH - Common issues documented in Chart.js and Svelte communities

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (Chart.js stable, patterns unlikely to change)

---

## Discretionary Recommendations

### Chart Type: Horizontal Bar for Spending Breakdown

**Recommendation:** Use horizontal bar chart instead of doughnut

**Rationale:**
1. TinyLedger will have many tags (Schedule C categories alone = 20+ items)
2. Horizontal bars handle long category labels naturally (text flows left-to-right)
3. Easier to compare values accurately (length vs arc perception)
4. Doughnut charts become unreadable beyond 6-7 segments
5. Sorting by value (largest at top) provides immediate insight

### Time Period Controls: Reuse FiscalYearPicker Pattern

**Recommendation:** Reuse existing FiscalYearPicker component; add granularity dropdown nearby

**Rationale:**
1. FiscalYearPicker already handles URL param updates via `goto`
2. Consistent UX with transactions page
3. Add simple dropdown for Monthly/Quarterly toggle using same pattern

### Mobile Time Period Placement: Scroll Away (Not Sticky)

**Recommendation:** Time controls scroll away with content

**Rationale:**
1. Summary cards are the primary content; controls are set-and-forget
2. Sticky header on transactions page makes sense (constantly referencing totals)
3. Reports page is more of a snapshot view; users set period then scroll to explore
4. Preserves vertical space for charts on mobile
