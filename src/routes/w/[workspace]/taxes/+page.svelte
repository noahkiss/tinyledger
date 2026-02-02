<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import TaxBreakdownCard from '$lib/components/TaxBreakdownCard.svelte';
	import { formatCurrency } from '$lib/utils/currency';

	let { data }: { data: PageData } = $props();

	// Fiscal year picker handler
	function handleFYChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const fy = select.value;
		goto(`/w/${data.workspaceId}/taxes?fy=${fy}`, { replaceState: true, noScroll: true });
	}

	// Helper to format rate as percentage
	function formatRate(rate: number): string {
		return `${(rate * 100).toFixed(2)}%`;
	}
</script>

<svelte:head>
	<title>Taxes - TinyLedger</title>
</svelte:head>

{#if data.needsConfiguration}
	<!-- Configuration required state -->
	<div class="space-y-6">
		<h1 class="text-2xl font-bold text-gray-900">Tax Estimates</h1>

		<div class="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
			<div class="flex items-start gap-4">
				<div class="flex-shrink-0">
					<svg class="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-yellow-800">Tax Configuration Required</h2>
					<p class="mt-1 text-yellow-700">
						To see tax estimates, you need to configure your tax settings first. This includes
						selecting your state and federal tax bracket.
					</p>
					<a
						href="/w/{data.workspaceId}/settings"
						class="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 transition-colors"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Configure Tax Settings
					</a>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Main taxes view when configured -->
	<div class="space-y-6">
		<!-- Header with fiscal year picker -->
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold text-gray-900">Tax Estimates</h1>

			<select
				class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				value={data.fiscalYear}
				onchange={handleFYChange}
			>
				{#each data.availableFiscalYears as fy}
					<option value={fy}>FY {fy}</option>
				{/each}
			</select>
		</div>

		<!-- Disclaimer banner -->
		<div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
			<p class="text-sm text-blue-800">
				<strong>Note:</strong> These estimates are for planning purposes only. Consult a tax professional
				for actual filing.
			</p>
		</div>

		<!-- Net income summary -->
		<div class="rounded-lg border border-gray-200 bg-white p-4">
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-600">Net Income (YTD)</span>
				<span class="text-lg font-semibold text-gray-900">{formatCurrency(data.netIncomeCents)}</span
				>
			</div>
		</div>

		<!-- Tax breakdown cards -->
		<section>
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Tax Breakdown</h2>

			<div class="grid gap-4 md:grid-cols-2">
				<!-- Self-Employment Tax -->
				<TaxBreakdownCard
					title="Self-Employment Tax"
					totalCents={data.taxes.selfEmployment.totalCents}
					items={[
						{
							label: 'Taxable SE Income',
							amountCents: data.taxes.selfEmployment.taxableCents,
							formula: `${formatCurrency(data.netIncomeCents)} x 92.35%`
						},
						{
							label: 'Social Security (12.4%)',
							amountCents: data.taxes.selfEmployment.socialSecurityCents
						},
						{
							label: 'Medicare (2.9%)',
							amountCents: data.taxes.selfEmployment.medicareCents
						},
						...(data.taxes.selfEmployment.additionalMedicareCents > 0
							? [
									{
										label: 'Additional Medicare (0.9%)',
										amountCents: data.taxes.selfEmployment.additionalMedicareCents
									}
								]
							: []),
						{
							label: 'Deductible (50%)',
							amountCents: data.taxes.selfEmployment.deductibleCents,
							formula: 'Reduces adjusted gross income'
						}
					]}
				/>

				<!-- Federal Income Tax -->
				<TaxBreakdownCard
					title="Federal Income Tax"
					totalCents={data.taxes.federal.totalCents}
					items={[
						{
							label: 'Adjusted Income',
							amountCents: data.taxes.federal.adjustedIncomeCents,
							formula: `Net income - SE deduction`
						},
						{
							label: `Bracket Rate (${formatRate(data.taxes.federal.rate)})`,
							amountCents: data.taxes.federal.totalCents,
							formula: `${formatCurrency(data.taxes.federal.adjustedIncomeCents)} x ${formatRate(data.taxes.federal.rate)}`
						}
					]}
				/>

				<!-- State Income Tax -->
				<TaxBreakdownCard
					title="{data.taxes.state.stateName} State Tax"
					totalCents={data.taxes.state.totalCents}
					items={[
						{
							label: `State Rate (${formatRate(data.taxes.state.rate)})`,
							amountCents: data.taxes.state.totalCents,
							formula: `${formatCurrency(data.netIncomeCents)} x ${formatRate(data.taxes.state.rate)}`
						}
					]}
				/>

				<!-- Local EIT (only show if configured) -->
				{#if data.taxes.local.rate > 0}
					<TaxBreakdownCard
						title="Local EIT"
						totalCents={data.taxes.local.totalCents}
						items={[
							{
								label: `Local Rate (${formatRate(data.taxes.local.rate)})`,
								amountCents: data.taxes.local.totalCents,
								formula: `${formatCurrency(data.netIncomeCents)} x ${formatRate(data.taxes.local.rate)}`
							}
						]}
					/>
				{/if}
			</div>

			<!-- Grand Total -->
			<div class="mt-4">
				<TaxBreakdownCard
					title="Total Estimated Tax"
					totalCents={data.taxes.grandTotal}
					items={[]}
					variant="summary"
				/>
			</div>
		</section>

		<!-- Filing Tracking Link -->
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="font-medium text-blue-900">Track Your Filings</h3>
					<p class="text-sm text-blue-700">View deadlines and mark filings complete in the Filings tab.</p>
				</div>
				<a
					href="/w/{data.workspaceId}/filings?fy={data.fiscalYear}"
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					View Filings
				</a>
			</div>
		</div>
	</div>
{/if}
