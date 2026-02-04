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
		<h1 class="text-2xl font-bold text-fg">Tax Estimates</h1>

		<div class="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
			<div class="flex items-start gap-4">
				<div class="flex-shrink-0">
					<iconify-icon icon="solar:danger-triangle-bold" class="text-yellow-600" width="32" height="32"></iconify-icon>
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
						<iconify-icon icon="solar:settings-bold" width="16" height="16"></iconify-icon>
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
			<h1 class="text-2xl font-bold text-fg">Tax Estimates</h1>

			<select
				class="rounded-lg border border-input-border bg-input px-3 py-2 text-sm font-medium text-fg shadow-sm hover:bg-surface focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-primary"
				value={data.fiscalYear}
				onchange={handleFYChange}
			>
				{#each data.availableFiscalYears as fy}
					<option value={fy}>FY {fy}</option>
				{/each}
			</select>
		</div>

		<!-- Disclaimer banner -->
		<div class="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
			<p class="text-sm text-primary">
				<strong>Note:</strong> These estimates are for planning purposes only. Consult a tax professional
				for actual filing.
			</p>
		</div>

		<!-- Net income summary -->
		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted">Net Income (YTD)</span>
				<span class="text-lg font-semibold text-fg">{formatCurrency(data.netIncomeCents)}</span
				>
			</div>
		</div>

		<!-- Tax breakdown cards -->
		<section>
			<h2 class="mb-4 text-lg font-semibold text-fg">Tax Breakdown</h2>

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
		<div class="rounded-lg border border-primary/30 bg-primary/10 p-4">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="font-medium text-primary">Track Your Filings</h3>
					<p class="text-sm text-primary">View deadlines and mark filings complete in the Filings tab.</p>
				</div>
				<a
					href="/w/{data.workspaceId}/filings?fy={data.fiscalYear}"
					class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
				>
					View Filings
				</a>
			</div>
		</div>
	</div>
{/if}
