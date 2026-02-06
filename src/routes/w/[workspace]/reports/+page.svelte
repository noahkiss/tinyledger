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

<div>
	<!-- Header with FY picker, granularity toggle, and export button -->
	<header class="is-flex is-flex-wrap-wrap is-align-items-center is-justify-content-space-between mb-5" style="gap: 1rem;">
		<h1 class="title is-4 mb-0">Reports</h1>
		<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
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
				class="button is-small"
			>
				<span class="icon">
					<iconify-icon icon="solar:download-bold" width="16" height="16"></iconify-icon>
				</span>
				<span>Export PDF</span>
			</a>
		</div>
	</header>

	<!-- Summary Cards -->
	<section class="mb-5">
		<!-- Hero Card: Net Income with Sparkline -->
		<SummaryCard label="Net Income" value={data.totals.net} percentChange={netChange} variant="hero">
			{#if data.netIncomeTrend.length > 1}
				<Sparkline data={data.netIncomeTrend} />
			{/if}
		</SummaryCard>

		<!-- Supporting Cards: Income, Expenses, Tax Set-Aside -->
		<div class="columns is-mobile mt-4">
			<div class="column">
				<SummaryCard
					label="YTD Income"
					value={data.totals.income}
					percentChange={incomeChange}
					valuePrefix="+"
				/>
			</div>
			<div class="column">
				<SummaryCard
					label="YTD Expenses"
					value={data.totals.expense}
					percentChange={expenseChange}
					valuePrefix="-"
				/>
			</div>
			<div class="column">
				<SummaryCard label="Tax Set-Aside" value={data.totals.taxSetAside} percentChange={taxChange}>
					{#if !data.totals.taxConfigured}
						<a href="/w/{data.workspaceId}/settings" class="is-size-7 has-text-grey">
							Estimated at {(data.totals.taxRateUsed * 100).toFixed(0)}% - configure taxes for accuracy
						</a>
					{:else}
						<p class="is-size-7 has-text-grey">
							Based on your configured rates ({(data.totals.taxRateUsed * 100).toFixed(1)}% effective)
						</p>
					{/if}
				</SummaryCard>
			</div>
		</div>
	</section>

	<!-- Financial Overview Charts -->
	<section class="mt-5">
		<div class="is-flex is-flex-wrap-wrap is-align-items-center is-justify-content-space-between mb-4" style="gap: 0.5rem;">
			<h2 class="title is-5 mb-0">Financial Overview</h2>
			{#if data.currentPeriodPartial && data.asOfDate}
				<p class="is-size-7 has-text-grey is-italic">
					Current {data.granularity === 'monthly' ? 'month' : 'quarter'} shows data as of {formatAsOfDate(data.asOfDate)}
				</p>
			{/if}
		</div>

		<!-- Net Income Over Time -->
		<div class="box mb-5">
			<h3 class="is-size-6 has-text-weight-medium mb-4">Net Income Over Time</h3>
			<NetIncomeChart
				data={data.periodData.map((p) => ({ period: p.period, net: p.net }))}
				workspaceId={data.workspaceId}
				fiscalYear={data.fiscalYear}
			/>
		</div>

		<!-- Income vs Expense -->
		<div class="box mb-5">
			<h3 class="is-size-6 has-text-weight-medium mb-4">
				Income vs Expense by {data.granularity === 'monthly' ? 'Month' : 'Quarter'}
			</h3>
			<IncomeVsExpense
				data={data.periodData}
				workspaceId={data.workspaceId}
				fiscalYear={data.fiscalYear}
			/>
		</div>

		<!-- Spending by Category -->
		<div class="box mb-5">
			<h3 class="is-size-6 has-text-weight-medium mb-4">Spending by Category</h3>
			<SpendingBreakdown
				data={data.spendingByTag}
				workspaceId={data.workspaceId}
				fiscalYear={data.fiscalYear}
			/>
		</div>
	</section>

	<!-- Period info -->
	<footer class="is-size-7 has-text-grey">
		<p>
			Showing data for {formatFiscalYear(data.fiscalYear, data.fiscalYearStartMonth)}
			{#if data.previousPeriod.income > 0 || data.previousPeriod.expense > 0}
				<span class="has-text-grey">
					| Compared to {formatFiscalYear(data.fiscalYear - 1, data.fiscalYearStartMonth)}
				</span>
			{/if}
		</p>
	</footer>
</div>
