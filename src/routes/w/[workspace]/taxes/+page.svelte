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
	<div>
		<h1 class="title is-4">Tax Estimates</h1>

		<div class="notification is-warning">
			<div class="is-flex" style="gap: 1rem; align-items: flex-start;">
				<iconify-icon icon="solar:danger-triangle-bold" width="32" height="32"></iconify-icon>
				<div>
					<h2 class="title is-5">Tax Configuration Required</h2>
					<p>
						To see tax estimates, you need to configure your tax settings first. This includes
						selecting your state and federal tax bracket.
					</p>
					<a
						href="/w/{data.workspaceId}/settings"
						class="button is-warning mt-4"
					>
						<span class="icon">
							<iconify-icon icon="solar:settings-bold" width="16" height="16"></iconify-icon>
						</span>
						<span>Configure Tax Settings</span>
					</a>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Main taxes view when configured -->
	<div>
		<!-- Header with fiscal year picker -->
		<div class="is-flex is-align-items-center is-justify-content-space-between mb-5">
			<h1 class="title is-4 mb-0">Tax Estimates</h1>

			<div class="select is-small">
				<select
					value={data.fiscalYear}
					onchange={handleFYChange}
				>
					{#each data.availableFiscalYears as fy}
						<option value={fy}>FY {fy}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Disclaimer banner -->
		<div class="notification is-info is-light mb-5">
			<p class="is-size-7">
				<strong>Note:</strong> These estimates are for planning purposes only. Consult a tax professional
				for actual filing.
			</p>
		</div>

		<!-- Net income summary -->
		<div class="box mb-5">
			<div class="is-flex is-align-items-center is-justify-content-space-between">
				<span class="is-size-7 has-text-grey">Net Income (YTD)</span>
				<span class="title is-5 mb-0">{formatCurrency(data.netIncomeCents)}</span>
			</div>
		</div>

		<!-- Tax breakdown cards -->
		<section class="mb-5">
			<h2 class="title is-5 mb-4">Tax Breakdown</h2>

			<div class="columns is-multiline">
				<!-- Self-Employment Tax -->
				<div class="column is-half">
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
				</div>

				<!-- Federal Income Tax -->
				<div class="column is-half">
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
				</div>

				<!-- State Income Tax -->
				<div class="column is-half">
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
				</div>

				<!-- Local EIT (only show if configured) -->
				{#if data.taxes.local.rate > 0}
					<div class="column is-half">
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
					</div>
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
		<div class="notification is-info is-light">
			<div class="is-flex is-align-items-center is-justify-content-space-between">
				<div>
					<h3 class="has-text-weight-medium">Track Your Filings</h3>
					<p class="is-size-7">View deadlines and mark filings complete in the Filings tab.</p>
				</div>
				<a
					href="/w/{data.workspaceId}/filings?fy={data.fiscalYear}"
					class="button is-primary"
				>
					View Filings
				</a>
			</div>
		</div>
	</div>
{/if}
