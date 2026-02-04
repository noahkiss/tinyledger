<script lang="ts">
	import type { PageData } from './$types';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';
	import { calculatePercentChange } from '$lib/utils/reports';
	import FiscalYearPicker from '$lib/components/FiscalYearPicker.svelte';
	import GranularityToggle from '$lib/components/GranularityToggle.svelte';
	import SummaryCard from '$lib/components/SummaryCard.svelte';
	import Sparkline from '$lib/components/charts/Sparkline.svelte';
	import NetIncomeChart from '$lib/components/charts/NetIncomeChart.svelte';
	import IncomeVsExpense from '$lib/components/charts/IncomeVsExpense.svelte';
	import SpendingBreakdown from '$lib/components/charts/SpendingBreakdown.svelte';

	// Format asOfDate for display
	function formatAsOfDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
	}

	let { data }: { data: PageData } = $props();

	// Calculate percent changes vs previous period
	const incomeChange = $derived(
		calculatePercentChange(data.totals.income, data.previousPeriod.income)
	);
	const expenseChange = $derived(
		calculatePercentChange(data.totals.expense, data.previousPeriod.expense)
	);
	const netChange = $derived(calculatePercentChange(data.totals.net, data.previousPeriod.net));

	// Tax set-aside doesn't have a comparison (calculated from net)
	const taxChange = $derived<number | null>(null);
</script>

<svelte:head>
	<title>Reports - TinyLedger</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header with FY picker, granularity toggle, and export button -->
	<header class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold text-fg">Reports</h1>
		<div class="flex items-center gap-2">
			<FiscalYearPicker
				fiscalYear={data.fiscalYear}
				availableYears={data.availableFiscalYears}
				startMonth={data.fiscalYearStartMonth}
			/>
			<GranularityToggle granularity={data.granularity} />
			<a
				href="/w/{data.workspaceId}/export/tax-report?fy={data.fiscalYear}"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 rounded-lg border border-input-border bg-card px-3 py-1.5 text-sm font-medium text-fg shadow-sm hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
			>
				<iconify-icon icon="solar:download-bold" width="16" height="16"></iconify-icon>
				Export PDF
			</a>
		</div>
	</header>

	<!-- Summary Cards -->
	<section class="space-y-4">
		<!-- Hero Card: Net Income with Sparkline -->
		<SummaryCard label="Net Income" value={data.totals.net} percentChange={netChange} variant="hero">
			{#if data.netIncomeTrend.length > 1}
				<Sparkline data={data.netIncomeTrend} />
			{/if}
		</SummaryCard>

		<!-- Supporting Cards: Income, Expenses, Tax Set-Aside -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<SummaryCard
				label="YTD Income"
				value={data.totals.income}
				percentChange={incomeChange}
				valuePrefix="+"
			/>
			<SummaryCard
				label="YTD Expenses"
				value={data.totals.expense}
				percentChange={expenseChange}
				valuePrefix="-"
			/>
			<SummaryCard label="Tax Set-Aside" value={data.totals.taxSetAside} percentChange={taxChange}>
				{#if !data.totals.taxConfigured}
					<a href="/w/{data.workspaceId}/settings" class="text-xs text-muted hover:text-primary">
						Estimated at {(data.totals.taxRateUsed * 100).toFixed(0)}% - configure taxes for accuracy
					</a>
				{:else}
					<p class="text-xs text-muted">
						Based on your configured rates ({(data.totals.taxRateUsed * 100).toFixed(1)}% effective)
					</p>
				{/if}
			</SummaryCard>
		</div>
	</section>

	<!-- Financial Overview Charts -->
	<section class="space-y-6 mt-8">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-lg font-semibold text-fg">Financial Overview</h2>
			{#if data.currentPeriodPartial && data.asOfDate}
				<p class="text-sm text-muted italic">
					Current {data.granularity === 'monthly' ? 'month' : 'quarter'} shows data as of {formatAsOfDate(data.asOfDate)}
				</p>
			{/if}
		</div>

		<!-- Net Income Over Time -->
		<div class="rounded-xl border border-border bg-card p-4">
			<h3 class="text-sm font-medium text-fg mb-4">Net Income Over Time</h3>
			<NetIncomeChart
				data={data.periodData.map((p) => ({ period: p.period, net: p.net }))}
				workspaceId={data.workspaceId}
				fiscalYear={data.fiscalYear}
			/>
		</div>

		<!-- Income vs Expense -->
		<div class="rounded-xl border border-border bg-card p-4">
			<h3 class="text-sm font-medium text-fg mb-4">
				Income vs Expense by {data.granularity === 'monthly' ? 'Month' : 'Quarter'}
			</h3>
			<IncomeVsExpense
				data={data.periodData}
				workspaceId={data.workspaceId}
				fiscalYear={data.fiscalYear}
			/>
		</div>

		<!-- Spending by Category -->
		<div class="rounded-xl border border-border bg-card p-4">
			<h3 class="text-sm font-medium text-fg mb-4">Spending by Category</h3>
			<SpendingBreakdown
				data={data.spendingByTag}
				workspaceId={data.workspaceId}
				fiscalYear={data.fiscalYear}
			/>
		</div>
	</section>

	<!-- Period info -->
	<footer class="text-sm text-muted">
		<p>
			Showing data for {formatFiscalYear(data.fiscalYear, data.fiscalYearStartMonth)}
			{#if data.previousPeriod.income > 0 || data.previousPeriod.expense > 0}
				<span class="text-muted">
					| Compared to {formatFiscalYear(data.fiscalYear - 1, data.fiscalYearStartMonth)}
				</span>
			{/if}
		</p>
	</footer>
</div>
