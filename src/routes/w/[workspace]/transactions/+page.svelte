<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import TimelineEntry from '$lib/components/TimelineEntry.svelte';
	import TimelineDateMarker from '$lib/components/TimelineDateMarker.svelte';
	import QuarterlyPaymentMarker from '$lib/components/QuarterlyPaymentMarker.svelte';

	let { data }: { data: PageData } = $props();

	// Type for transaction
	type Transaction = {
		id: number;
		publicId: string;
		type: 'income' | 'expense';
		amountCents: number;
		date: string;
		payee: string;
		description: string | null;
		paymentMethod: 'cash' | 'card' | 'check';
		checkNumber: string | null;
		voidedAt: string | null;
		deletedAt: string | null;
		createdAt: string;
		updatedAt: string;
		tags: { tagId: number; tagName: string; percentage: number }[];
	};

	// Type for quarterly payment marker
	type QuarterlyMarker = (typeof data.quarterlyPayments)[number];

	// Type for pending recurring instance
	type PendingInstance = (typeof data.pendingInstances)[number];

	// Create a map of quarterly payments by due date
	let quarterlyPaymentsByDate = $derived(() => {
		const map = new Map<string, QuarterlyMarker>();
		for (const qp of data.quarterlyPayments) {
			map.set(qp.dueDate, qp);
		}
		return map;
	});

	// Create a map of pending instances by date
	let pendingByDate = $derived(() => {
		const map = new Map<string, PendingInstance[]>();
		for (const pi of data.pendingInstances) {
			const existing = map.get(pi.date);
			if (existing) {
				existing.push(pi);
			} else {
				map.set(pi.date, [pi]);
			}
		}
		return map;
	});

	// Group transactions by date and merge with quarterly payments and pending instances
	let timelineGroups = $derived(() => {
		const groups = new Map<
			string,
			{
				transactions: Transaction[];
				quarterlyPayment: QuarterlyMarker | null;
				pendingInstances: PendingInstance[];
			}
		>();

		for (const txn of data.transactions) {
			const existing = groups.get(txn.date);
			if (existing) {
				existing.transactions.push(txn);
			} else {
				groups.set(txn.date, { transactions: [txn], quarterlyPayment: null, pendingInstances: [] });
			}
		}

		const qpByDate = quarterlyPaymentsByDate();
		for (const [dueDate, qp] of qpByDate) {
			const existing = groups.get(dueDate);
			if (existing) {
				existing.quarterlyPayment = qp;
			} else {
				groups.set(dueDate, { transactions: [], quarterlyPayment: qp, pendingInstances: [] });
			}
		}

		const piByDate = pendingByDate();
		for (const [date, instances] of piByDate) {
			const existing = groups.get(date);
			if (existing) {
				existing.pendingInstances = instances;
			} else {
				groups.set(date, { transactions: [], quarterlyPayment: null, pendingInstances: instances });
			}
		}

		const entries = Array.from(groups.entries());
		if (data.currentFilters.sort === 'asc') {
			return entries.sort((a, b) => a[0].localeCompare(b[0]));
		} else {
			return entries.sort((a, b) => b[0].localeCompare(a[0]));
		}
	});

	let hasTimelineContent = $derived(
		data.transactions.length > 0 ||
			data.quarterlyPayments.length > 0 ||
			data.pendingInstances.length > 0
	);

	let hasActiveFilters = $derived(
		data.currentFilters.payee ||
			data.currentFilters.tags.length > 0 ||
			data.currentFilters.from ||
			data.currentFilters.to ||
			data.currentFilters.type ||
			data.currentFilters.method
	);

	function getDayType(
		txns: Transaction[],
		hasQuarterlyPayment: boolean,
		pendingInstances: PendingInstance[]
	): 'income' | 'expense' | 'mixed' | 'neutral' | 'tax' | 'pending' {
		if (txns.length === 0 && pendingInstances.length === 0 && hasQuarterlyPayment) return 'tax';
		if (txns.length === 0 && pendingInstances.length > 0 && !hasQuarterlyPayment) return 'pending';
		const hasIncome = txns.some((t) => t.type === 'income');
		const hasExpense = txns.some((t) => t.type === 'expense');
		if (hasIncome && hasExpense) return 'mixed';
		if (hasIncome) return 'income';
		if (hasExpense) return 'expense';
		return 'neutral';
	}
</script>

<svelte:head>
	<title>Transactions - TinyLedger</title>
</svelte:head>

<div>
	<!-- Income / Expense buttons -->
	<div class="columns is-mobile mb-4" data-component="transaction-actions">
		<div class="column">
			<a
				href="/w/{data.workspaceId}/transactions/new?type=income"
				class="button is-success is-fullwidth is-medium add-btn"
				data-component="add-income-button"
			>
				<span class="icon">
					<iconify-icon icon="solar:add-circle-bold" width="24" height="24"></iconify-icon>
				</span>
				<span>Income</span>
			</a>
		</div>
		<div class="column">
			<a
				href="/w/{data.workspaceId}/transactions/new?type=expense"
				class="button is-danger is-fullwidth is-medium add-btn"
				data-component="add-expense-button"
			>
				<span class="icon">
					<iconify-icon icon="solar:minus-circle-bold" width="24" height="24"></iconify-icon>
				</span>
				<span>Expense</span>
			</a>
		</div>
	</div>

	<!-- Sticky summary header -->
	<header class="box mb-4 summary-header" data-component="summary-header">
		<!-- Mobile layout -->
		<div class="is-flex is-align-items-center is-justify-content-center is-hidden-tablet" style="gap: 0.5rem;">
			<span class="is-flex is-align-items-center has-text-weight-semibold has-text-success" style="gap: 0.25rem;">
				<iconify-icon icon="solar:add-circle-bold" width="16" height="16"></iconify-icon>
				<span class="tabular-nums">{formatCurrency(data.totals.income)}</span>
			</span>
			<span class="has-text-grey">/</span>
			<span class="is-flex is-align-items-center has-text-weight-semibold has-text-danger" style="gap: 0.25rem;">
				<iconify-icon icon="solar:minus-circle-bold" width="16" height="16"></iconify-icon>
				<span class="tabular-nums">{formatCurrency(data.totals.expense)}</span>
			</span>
			<span class="has-text-grey">=</span>
			<span class="has-text-weight-bold tabular-nums {data.totals.net >= 0 ? 'has-text-success' : 'has-text-danger'}">
				{formatCurrency(data.totals.net)}
			</span>
		</div>

		<!-- Desktop layout -->
		<div class="is-hidden-mobile is-flex is-align-items-center is-justify-content-space-between is-size-7">
			<div class="is-flex is-align-items-center" style="gap: 1rem;">
				<div>
					<span class="has-text-grey">Income</span>
					<span class="ml-1 has-text-weight-semibold has-text-success tabular-nums">+{formatCurrency(data.totals.income)}</span>
				</div>
				<div>
					<span class="has-text-grey">Expense</span>
					<span class="ml-1 has-text-weight-semibold has-text-danger tabular-nums">-{formatCurrency(data.totals.expense)}</span>
				</div>
			</div>
			<div class="net-divider pl-4">
				<span class="has-text-grey">Net</span>
				<span class="ml-1 has-text-weight-bold tabular-nums {data.totals.net >= 0 ? 'has-text-success' : 'has-text-danger'}">
					{data.totals.net >= 0 ? '+' : ''}{formatCurrency(data.totals.net)}
				</span>
			</div>
		</div>
	</header>

	<!-- Filter bar -->
	<FilterBar
		currentFilters={data.currentFilters}
		availableTags={data.tags}
		filteredCount={data.filteredCount}
		totalCount={data.totalCount}
		fyStart={data.fyStart}
		fyEnd={data.fyEnd}
	/>

	<!-- Timeline -->
	{#if !hasTimelineContent}
		<div class="box has-text-centered" data-component="empty-state" data-state="empty">
			<iconify-icon icon="solar:document-text-bold" class="has-text-grey" width="48" height="48"></iconify-icon>
			{#if hasActiveFilters}
				<p class="mt-4">No transactions match your filters</p>
				<p class="mt-1 is-size-7 has-text-grey">Try adjusting or clearing your filters.</p>
			{:else}
				<p class="mt-4">
					No transactions in {formatFiscalYear(data.fiscalYear, data.fiscalYearStartMonth)}
				</p>
				<p class="mt-1 is-size-7 has-text-grey">
					Tap Income or Expense above to add your first transaction.
				</p>
			{/if}
		</div>
	{:else}
		<div class="timeline-container" data-component="transaction-timeline">
			<ol class="timeline-line">
				{#each timelineGroups() as [date, { transactions: txns, quarterlyPayment, pendingInstances }] (date)}
					<li class="timeline-item" data-date={date}>
						<TimelineDateMarker {date} dayType={getDayType(txns, !!quarterlyPayment, pendingInstances)} />
						<div class="timeline-items" data-component="timeline-items">
							{#if quarterlyPayment}
								<QuarterlyPaymentMarker
									quarter={quarterlyPayment.quarter}
									dueDate={quarterlyPayment.dueDate}
									dueDateLabel={quarterlyPayment.dueDateLabel}
									federalRecommendedCents={quarterlyPayment.federalRecommendedCents}
									stateRecommendedCents={quarterlyPayment.stateRecommendedCents}
									isPaid={quarterlyPayment.isPaid}
									paidFederalCents={quarterlyPayment.paidFederalCents}
									paidStateCents={quarterlyPayment.paidStateCents}
									isPastDue={quarterlyPayment.isPastDue}
									isUpcoming={quarterlyPayment.isUpcoming}
									isSkipped={quarterlyPayment.isSkipped}
									rolloverCents={quarterlyPayment.rolloverCents}
									fiscalYear={quarterlyPayment.fiscalYear}
									workspaceId={data.workspaceId}
								/>
							{/if}
							{#each txns as txn (txn.id)}
								<TimelineEntry transaction={txn} workspaceId={data.workspaceId} />
							{/each}
							{#each pendingInstances as pending (pending.templatePublicId + pending.date)}
								<div class="pending-instance" data-component="pending-instance">
									<div class="is-flex is-justify-content-space-between" style="align-items: flex-start;">
										<div class="is-flex" style="align-items: flex-start; gap: 0.75rem;">
											<div class="pending-type-icon {pending.type === 'income' ? 'is-income' : 'is-expense'}">
												{#if pending.type === 'income'}
													<iconify-icon icon="solar:add-circle-bold" width="12" height="12"></iconify-icon>
												{:else}
													<iconify-icon icon="solar:minus-circle-bold" width="12" height="12"></iconify-icon>
												{/if}
											</div>
											<div>
												<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
													<span class="has-text-weight-medium has-text-grey">{pending.payee}</span>
													<span class="is-size-7 {pending.type === 'income' ? 'has-text-success' : 'has-text-danger'}">
														{pending.type === 'income' ? '+' : '-'}{formatCurrency(pending.amountCents)}
													</span>
													<span class="tag is-light is-small">Pending</span>
												</div>
												<div class="is-size-7 has-text-grey mt-1">
													{pending.patternDescription}
												</div>
											</div>
										</div>
										<div class="is-flex is-align-items-center" style="gap: 0.25rem;">
											<a
												href="/w/{data.workspaceId}/transactions/new?type={pending.type}&from_recurring={pending.templatePublicId}&date={pending.date}"
												class="button is-primary is-light is-small"
											>
												Confirm
											</a>
											<form method="POST" action="?/skip" use:enhance class="is-inline">
												<input type="hidden" name="templateId" value={pending.templateId} />
												<input type="hidden" name="date" value={pending.date} />
												<button type="submit" class="button is-ghost is-small">
													Skip
												</button>
											</form>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</li>
				{/each}
			</ol>
			<div class="timeline-end-marker"></div>
		</div>
	{/if}
</div>

<style>
	.add-btn {
		font-weight: 600;
	}
	.summary-header {
		position: sticky;
		top: 0.75rem;
		z-index: 10;
		padding: 0.75rem 1rem;
		backdrop-filter: blur(8px);
		background-color: var(--color-card-bg, rgba(255,255,255,0.95));
	}
	.net-divider {
		border-left: 1px solid var(--color-border);
	}
	.timeline-container {
		position: relative;
		margin-left: 0.75rem;
	}
	.timeline-line {
		position: relative;
		border-left: 2px solid var(--color-border);
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.timeline-item {
		margin-bottom: 1.5rem;
		margin-left: 1.5rem;
	}
	.timeline-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.timeline-end-marker {
		position: absolute;
		bottom: -0.5rem;
		left: -0.375rem;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		background-color: var(--color-card-bg);
	}
	.pending-instance {
		border-radius: 0.5rem;
		border: 2px dashed var(--color-border);
		background-color: var(--color-surface);
		padding: 0.75rem;
		opacity: 0.85;
	}
	.pending-type-icon {
		margin-top: 0.125rem;
		display: flex;
		width: 1.5rem;
		height: 1.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}
	.pending-type-icon.is-income {
		background-color: var(--color-success-muted);
		color: var(--color-success);
	}
	.pending-type-icon.is-expense {
		background-color: var(--color-error-muted);
		color: var(--color-error);
	}
</style>
