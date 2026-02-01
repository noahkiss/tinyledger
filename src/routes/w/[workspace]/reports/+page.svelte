<script lang="ts">
	import type { PageData } from './$types';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';
	import { calculatePercentChange } from '$lib/utils/reports';
	import FiscalYearPicker from '$lib/components/FiscalYearPicker.svelte';
	import SummaryCard from '$lib/components/SummaryCard.svelte';
	import Sparkline from '$lib/components/charts/Sparkline.svelte';

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
	<!-- Header with FY picker -->
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Reports</h1>
		<FiscalYearPicker
			fiscalYear={data.fiscalYear}
			availableYears={data.availableFiscalYears}
			startMonth={data.fiscalYearStartMonth}
		/>
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
			<SummaryCard label="Tax Set-Aside" value={data.totals.taxSetAside} percentChange={taxChange} />
		</div>
	</section>

	<!-- Placeholder for charts (Plan 02) -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold text-gray-900">Charts</h2>
		<div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			<p class="mt-4 text-gray-500">
				Income vs Expense chart and Spending Breakdown will be added in Plan 02
			</p>
		</div>
	</section>

	<!-- Period info -->
	<footer class="text-sm text-gray-500">
		<p>
			Showing data for {formatFiscalYear(data.fiscalYear, data.fiscalYearStartMonth)}
			{#if data.previousPeriod.income > 0 || data.previousPeriod.expense > 0}
				<span class="text-gray-400">
					| Compared to {formatFiscalYear(data.fiscalYear - 1, data.fiscalYearStartMonth)}
				</span>
			{/if}
		</p>
	</footer>
</div>
