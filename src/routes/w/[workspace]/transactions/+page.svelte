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
	let quarterlyPaymentsByDate = $derived.by(() => {
		const map = new Map<string, QuarterlyMarker>();
		for (const qp of data.quarterlyPayments) {
			map.set(qp.dueDate, qp);
		}
		return map;
	});

	// Create a map of pending instances by date
	let pendingByDate = $derived.by(() => {
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
	let timelineGroups = $derived.by(() => {
		// Create groups map that can hold transactions, quarterly marker, and pending instances
		const groups = new Map<
			string,
			{
				transactions: Transaction[];
				quarterlyPayment: QuarterlyMarker | null;
				pendingInstances: PendingInstance[];
			}
		>();

		// Add transactions to groups
		for (const txn of data.transactions) {
			const existing = groups.get(txn.date);
			if (existing) {
				existing.transactions.push(txn);
			} else {
				groups.set(txn.date, { transactions: [txn], quarterlyPayment: null, pendingInstances: [] });
			}
		}

		// Add quarterly payments to groups (or create new date entries)
		const qpByDate = quarterlyPaymentsByDate;
		for (const [dueDate, qp] of qpByDate) {
			const existing = groups.get(dueDate);
			if (existing) {
				existing.quarterlyPayment = qp;
			} else {
				groups.set(dueDate, { transactions: [], quarterlyPayment: qp, pendingInstances: [] });
			}
		}

		// Add pending instances to groups
		const piByDate = pendingByDate;
		for (const [date, instances] of piByDate) {
			const existing = groups.get(date);
			if (existing) {
				existing.pendingInstances = instances;
			} else {
				groups.set(date, { transactions: [], quarterlyPayment: null, pendingInstances: instances });
			}
		}

		// Convert to array sorted by date (respecting user sort preference)
		const entries = Array.from(groups.entries());
		if (data.currentFilters.sort === 'asc') {
			// Oldest first (chronological)
			return entries.sort((a, b) => a[0].localeCompare(b[0]));
		} else {
			// Newest first
			return entries.sort((a, b) => b[0].localeCompare(a[0]));
		}
	});

	// Check if timeline has any content (transactions, quarterly markers, or pending)
	let hasTimelineContent = $derived(
		data.transactions.length > 0 ||
			data.quarterlyPayments.length > 0 ||
			data.pendingInstances.length > 0
	);

	// Check if any filters are active (for empty state messaging)
	let hasActiveFilters = $derived(
		data.currentFilters.payee ||
			data.currentFilters.tags.length > 0 ||
			data.currentFilters.from ||
			data.currentFilters.to ||
			data.currentFilters.type ||
			data.currentFilters.method
	);

	// Determine day type for timeline markers (income, expense, mixed, tax, pending)
	function getDayType(
		txns: Transaction[],
		hasQuarterlyPayment: boolean,
		pendingInstances: PendingInstance[]
	): 'income' | 'expense' | 'mixed' | 'neutral' | 'tax' | 'pending' {
		// If only quarterly payment marker (no transactions), show tax type
		if (txns.length === 0 && pendingInstances.length === 0 && hasQuarterlyPayment) return 'tax';

		// If only pending instances (no real transactions), show pending type
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
	<div class="grid grid-cols-2 gap-4" data-component="transaction-actions">
		<a
			href="/w/{data.workspaceId}/transactions/new?type=income"
			class="flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-success/40 hover:bg-success/10 active:opacity-90"
			data-component="add-income-button"
		>
			<iconify-icon icon="solar:add-circle-bold" class="text-success" width="20" height="20"></iconify-icon>
			Income
		</a>
		<a
			href="/w/{data.workspaceId}/transactions/new?type=expense"
			class="flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-error/40 hover:bg-error/10 active:opacity-90"
			data-component="add-expense-button"
		>
			<iconify-icon icon="solar:minus-circle-bold" class="text-error" width="20" height="20"></iconify-icon>
			Expense
		</a>
	</div>

	<!-- Sticky summary header -->
	<header
		class="mt-4 sticky top-0 z-10 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur"
		data-component="summary-header"
	>
		<!-- Mobile layout: icon-based compact view -->
		<div class="flex items-center justify-center gap-2 text-sm md:hidden">
			<span class="flex items-center gap-1 font-semibold text-success">
				<iconify-icon icon="solar:add-circle-bold" width="16" height="16"></iconify-icon>
				<span class="tabular-nums">{formatCurrency(data.totals.income)}</span>
			</span>
			<span class="text-text-tertiary">/</span>
			<span class="flex items-center gap-1 font-semibold text-error">
				<iconify-icon icon="solar:minus-circle-bold" width="16" height="16"></iconify-icon>
				<span class="tabular-nums">{formatCurrency(data.totals.expense)}</span>
			</span>
			<span class="text-text-tertiary">=</span>
			<span class="font-bold tabular-nums {data.totals.net >= 0 ? 'text-success' : 'text-error'}">
				{formatCurrency(data.totals.net)}
			</span>
		</div>

		<!-- Desktop layout: labels with income/expense left, net right -->
		<div class="hidden items-center justify-between text-sm md:flex">
			<div class="flex items-center gap-4">
				<div>
					<span class="text-text-tertiary">Income</span>
					<span class="ml-1 font-semibold text-success tabular-nums">+{formatCurrency(data.totals.income)}</span>
				</div>
				<div>
					<span class="text-text-tertiary">Expense</span>
					<span class="ml-1 font-semibold text-error tabular-nums">-{formatCurrency(data.totals.expense)}</span>
				</div>
			</div>
			<div class="border-l border-border pl-4">
				<span class="text-text-tertiary">Net</span>
				<span
					class="ml-1 font-bold tabular-nums {data.totals.net >= 0 ? 'text-success' : 'text-error'}"
				>
					{data.totals.net >= 0 ? '+' : ''}{formatCurrency(data.totals.net)}
				</span>
			</div>
		</div>
	</header>

	<!-- Filter bar (tight to summary — related controls) -->
	<FilterBar
		currentFilters={data.currentFilters}
		availableTags={data.tags}
		filteredCount={data.filteredCount}
		totalCount={data.totalCount}
		fyStart={data.fyStart}
		fyEnd={data.fyEnd}
	/>

	<!-- Timeline (extra breathing room to separate controls from content) -->
	{#if !hasTimelineContent}
		<div class="mt-6 rounded-lg bg-card p-8 text-center" data-component="empty-state" data-state="empty">
			<iconify-icon icon="solar:document-text-bold" class="mx-auto text-muted" width="48" height="48"></iconify-icon>
			{#if hasActiveFilters}
				<p class="mt-4 text-fg">No transactions match your filters</p>
				<p class="mt-1 text-sm text-muted">Try adjusting or clearing your filters.</p>
			{:else}
				<p class="mt-4 text-fg">
					No transactions in {formatFiscalYear(data.fiscalYear, data.fiscalYearStartMonth)}
				</p>
				<p class="mt-1 text-sm text-muted">
					Tap Income or Expense above to add your first transaction.
				</p>
			{/if}
		</div>
	{:else}
		<div class="mt-6" data-component="transaction-timeline">
			<ol>
				{#each timelineGroups as [date, { transactions: txns, quarterlyPayment, pendingInstances }] (date)}
					<li class="mb-4" data-date={date}>
						<TimelineDateMarker {date} dayType={getDayType(txns, !!quarterlyPayment, pendingInstances)} />
						<div class="space-y-2" data-component="timeline-items">
							<!-- Quarterly payment marker appears first (more prominent) -->
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
							<!-- Regular transactions -->
							{#each txns as txn (txn.id)}
								<TimelineEntry transaction={txn} workspaceId={data.workspaceId} />
							{/each}
							<!-- Pending recurring instances -->
							{#each pendingInstances as pending (pending.templatePublicId + pending.date)}
								<div
									class="rounded-md border-2 border-dashed border-border bg-surface/50 p-3"
									data-component="pending-instance"
								>
									<div class="flex items-start justify-between">
										<div class="flex items-start gap-3">
											<!-- Type indicator (muted) -->
											<div
												class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full {pending.type ===
												'income'
													? 'bg-success/10'
													: 'bg-error/10'}"
											>
												{#if pending.type === 'income'}
													<iconify-icon icon="solar:add-circle-bold" class="text-success/60" width="12" height="12"></iconify-icon>
												{:else}
													<iconify-icon icon="solar:minus-circle-bold" class="text-error/60" width="12" height="12"></iconify-icon>
												{/if}
											</div>

											<div>
												<div class="flex items-center gap-2">
													<span class="font-medium text-muted">{pending.payee}</span>
													<span
														class="text-sm {pending.type === 'income'
															? 'text-success'
															: 'text-error'}"
													>
														{pending.type === 'income' ? '+' : '-'}{formatCurrency(
															pending.amountCents
														)}
													</span>
													<span
														class="rounded-full bg-surface-alt px-1.5 py-0.5 text-xs text-muted"
														>Pending</span
													>
												</div>
												<div class="mt-0.5 text-xs text-muted">
													{pending.patternDescription}
												</div>
											</div>
										</div>

										<!-- Actions -->
										<div class="flex items-center gap-1">
											<a
												href="/w/{data.workspaceId}/transactions/new?type={pending.type}&from_recurring={pending.templatePublicId}&date={pending.date}"
												class="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
											>
												Confirm
											</a>
											<form method="POST" action="?/skip" use:enhance class="inline">
												<input type="hidden" name="templateId" value={pending.templateId} />
												<input type="hidden" name="date" value={pending.date} />
												<button
													type="submit"
													class="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-alt"
												>
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
		</div>
	{/if}
</div>

