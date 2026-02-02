<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import TaxBreakdownCard from '$lib/components/TaxBreakdownCard.svelte';
	import { formatCurrency } from '$lib/utils/currency';

	let { data }: { data: PageData } = $props();

	// Fiscal year picker handler
	function handleFYChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const fy = select.value;
		goto(`/w/${data.workspaceId}/taxes?fy=${fy}`, { replaceState: true, noScroll: true });
	}

	// Track which payment forms are open
	let openPaymentForms = $state<Set<number>>(new Set());

	function togglePaymentForm(quarter: number) {
		if (openPaymentForms.has(quarter)) {
			openPaymentForms = new Set([...openPaymentForms].filter((q) => q !== quarter));
		} else {
			openPaymentForms = new Set([...openPaymentForms, quarter]);
		}
	}

	// Helper to format rate as percentage
	function formatRate(rate: number): string {
		return `${(rate * 100).toFixed(2)}%`;
	}

	// Helper to get payment status color
	function getPaymentStatusClass(payment: {
		isPaid: boolean;
		isPastDue: boolean;
		isUpcoming: boolean;
	}): string {
		if (payment.isPaid) return 'border-green-300 bg-green-50';
		if (payment.isPastDue) return 'border-red-300 bg-red-50';
		if (payment.isUpcoming) return 'border-yellow-300 bg-yellow-50';
		return 'border-gray-200 bg-white';
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

		<!-- Quarterly Payments Section -->
		<section>
			<h2 class="mb-4 text-lg font-semibold text-gray-900">Quarterly Estimated Payments</h2>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.quarterlyPayments as payment}
					<div
						class="rounded-xl border p-4 {getPaymentStatusClass(payment)}"
						data-quarter={payment.quarter}
					>
						<div class="flex items-center justify-between mb-2">
							<span class="font-semibold text-gray-900">Q{payment.quarter}</span>
							{#if payment.isPaid}
								<span
									class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
								>
									Paid
								</span>
							{:else if payment.isPastDue}
								<span
									class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
								>
									Past Due
								</span>
							{:else if payment.isUpcoming}
								<span
									class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
								>
									Upcoming
								</span>
							{/if}
						</div>

						<p class="text-sm text-gray-600">Due: {payment.dueDateLabel}</p>
						<p class="mt-1 text-lg font-semibold text-gray-900">
							{formatCurrency(payment.recommendedCents)}
						</p>

						{#if payment.isPaid}
							<!-- Show paid details -->
							<div class="mt-3 space-y-1 text-sm text-gray-600">
								{#if payment.federalPaidCents}
									<p>Federal: {formatCurrency(payment.federalPaidCents)}</p>
								{/if}
								{#if payment.statePaidCents}
									<p>State: {formatCurrency(payment.statePaidCents)}</p>
								{/if}
								{#if payment.notes}
									<p class="text-xs text-gray-500 italic">{payment.notes}</p>
								{/if}
							</div>

							<!-- Unmark as paid button -->
							<form method="POST" action="?/unmarkPaid" use:enhance class="mt-3">
								<input type="hidden" name="quarter" value={payment.quarter} />
								<input type="hidden" name="fiscalYear" value={data.fiscalYear} />
								<button
									type="submit"
									class="text-sm text-gray-500 hover:text-gray-700 underline"
								>
									Unmark as paid
								</button>
							</form>
						{:else}
							<!-- Mark as paid button/form -->
							{#if openPaymentForms.has(payment.quarter)}
								<form method="POST" action="?/markPaid" use:enhance class="mt-3 space-y-3">
									<input type="hidden" name="quarter" value={payment.quarter} />
									<input type="hidden" name="fiscalYear" value={data.fiscalYear} />

									<div>
										<label
											for="federal-{payment.quarter}"
											class="block text-xs font-medium text-gray-700"
										>
											Federal Payment
										</label>
										<input
											type="number"
											id="federal-{payment.quarter}"
											name="federalPaidCents"
											value={Math.round(payment.recommendedCents * 0.7)}
											class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>

									<div>
										<label
											for="state-{payment.quarter}"
											class="block text-xs font-medium text-gray-700"
										>
											State Payment
										</label>
										<input
											type="number"
											id="state-{payment.quarter}"
											name="statePaidCents"
											value={Math.round(payment.recommendedCents * 0.3)}
											class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>

									<div>
										<label for="notes-{payment.quarter}" class="block text-xs font-medium text-gray-700">
											Notes (optional)
										</label>
										<input
											type="text"
											id="notes-{payment.quarter}"
											name="notes"
											placeholder="e.g., Check #1234"
											class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>

									<div class="flex gap-2">
										<button
											type="submit"
											class="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
										>
											Mark Paid
										</button>
										<button
											type="button"
											onclick={() => togglePaymentForm(payment.quarter)}
											class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
										>
											Cancel
										</button>
									</div>
								</form>
							{:else}
								<button
									type="button"
									onclick={() => togglePaymentForm(payment.quarter)}
									class="mt-3 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
								>
									Mark as Paid
								</button>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<!-- Tax Forms Reference (optional collapsible section) -->
		<section class="border-t border-gray-200 pt-6">
			<details>
				<summary class="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
					Tax Forms Reference
				</summary>
				<div class="mt-4 space-y-3">
					{#each data.formChecklist as form}
						<div class="rounded-lg border border-gray-200 bg-white p-3">
							<div class="flex items-start justify-between">
								<div>
									<h3 class="font-medium text-gray-900">{form.name}</h3>
									<p class="text-sm text-gray-600">{form.description}</p>
									<p class="mt-1 text-xs text-gray-500">Due: {form.dueDate}</p>
								</div>
								{#if form.irsLink}
									<a
										href={form.irsLink}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm text-blue-600 hover:text-blue-800"
									>
										IRS
									</a>
								{:else if form.stateLink}
									<a
										href={form.stateLink}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm text-blue-600 hover:text-blue-800"
									>
										State
									</a>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</details>
		</section>
	</div>
{/if}
