<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';
	import FiscalYearPicker from '$lib/components/FiscalYearPicker.svelte';
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
		const qpByDate = quarterlyPaymentsByDate();
		for (const [dueDate, qp] of qpByDate) {
			const existing = groups.get(dueDate);
			if (existing) {
				existing.quarterlyPayment = qp;
			} else {
				groups.set(dueDate, { transactions: [], quarterlyPayment: qp, pendingInstances: [] });
			}
		}

		// Add pending instances to groups
		const piByDate = pendingByDate();
		for (const [date, instances] of piByDate) {
			const existing = groups.get(date);
			if (existing) {
				existing.pendingInstances = instances;
			} else {
				groups.set(date, { transactions: [], quarterlyPayment: null, pendingInstances: instances });
			}
		}

		// Convert to array sorted by date descending
		return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
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

<div class="space-y-4">
	<!-- Income / Expense buttons -->
	<div class="grid grid-cols-2 gap-4" data-component="transaction-actions">
		<a
			href="/w/{data.workspaceId}/transactions/new?type=income"
			class="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-green-700 active:bg-green-800"
			data-component="add-income-button"
		>
			<iconify-icon icon="solar:add-circle-bold" width="24" height="24"></iconify-icon>
			Income
		</a>
		<a
			href="/w/{data.workspaceId}/transactions/new?type=expense"
			class="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-red-700 active:bg-red-800"
			data-component="add-expense-button"
		>
			<iconify-icon icon="solar:minus-circle-bold" width="24" height="24"></iconify-icon>
			Expense
		</a>
	</div>

	<!-- Sticky header with fiscal year and totals -->
	<header
		class="sticky top-3 z-10 rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur"
		data-component="fiscal-header"
	>
		<div class="flex items-center justify-between">
			<FiscalYearPicker
				fiscalYear={data.fiscalYear}
				availableYears={data.availableFiscalYears}
				startMonth={data.fiscalYearStartMonth}
			/>

			<div class="flex items-center gap-4 text-sm">
				<div class="text-right">
					<span class="text-gray-500">Income</span>
					<span class="ml-1 font-semibold text-green-600">+{formatCurrency(data.totals.income)}</span
					>
				</div>
				<div class="text-right">
					<span class="text-gray-500">Expense</span>
					<span class="ml-1 font-semibold text-red-600">-{formatCurrency(data.totals.expense)}</span
					>
				</div>
				<div class="border-l border-gray-300 pl-4 text-right">
					<span class="text-gray-500">Net</span>
					<span
						class="ml-1 font-bold {data.totals.net >= 0 ? 'text-green-600' : 'text-red-600'}"
					>
						{data.totals.net >= 0 ? '+' : ''}{formatCurrency(data.totals.net)}
					</span>
				</div>
			</div>
		</div>
	</header>

	<!-- Filter bar -->
	<FilterBar
		currentFilters={data.currentFilters}
		availableTags={data.tags}
		filteredCount={data.filteredCount}
		totalCount={data.totalCount}
	/>

	<!-- Timeline -->
	{#if !hasTimelineContent}
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center" data-component="empty-state">
			<iconify-icon icon="solar:document-text-bold" class="mx-auto text-gray-400" width="48" height="48"></iconify-icon>
			{#if hasActiveFilters}
				<p class="mt-4 text-gray-600">No transactions match your filters</p>
				<p class="mt-1 text-sm text-gray-500">Try adjusting or clearing your filters.</p>
			{:else}
				<p class="mt-4 text-gray-600">
					No transactions in {formatFiscalYear(data.fiscalYear, data.fiscalYearStartMonth)}
				</p>
				<p class="mt-1 text-sm text-gray-500">
					Tap Income or Expense above to add your first transaction.
				</p>
			{/if}
		</div>
	{:else}
		<div class="relative ms-3" data-component="transaction-timeline">
			<ol class="relative border-s-2 border-gray-200">
				{#each timelineGroups() as [date, { transactions: txns, quarterlyPayment, pendingInstances }] (date)}
					<li class="mb-6 ms-6" data-date={date}>
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
									class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-3"
									data-component="pending-instance"
								>
									<div class="flex items-start justify-between">
										<div class="flex items-start gap-3">
											<!-- Type indicator (muted) -->
											<div
												class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full {pending.type ===
												'income'
													? 'bg-green-100/50'
													: 'bg-red-100/50'}"
											>
												{#if pending.type === 'income'}
													<iconify-icon icon="solar:add-circle-bold" class="text-green-400" width="12" height="12"></iconify-icon>
												{:else}
													<iconify-icon icon="solar:minus-circle-bold" class="text-red-400" width="12" height="12"></iconify-icon>
												{/if}
											</div>

											<div>
												<div class="flex items-center gap-2">
													<span class="font-medium text-gray-500">{pending.payee}</span>
													<span
														class="text-sm {pending.type === 'income'
															? 'text-green-500'
															: 'text-red-500'}"
													>
														{pending.type === 'income' ? '+' : '-'}{formatCurrency(
															pending.amountCents
														)}
													</span>
													<span
														class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500"
														>Pending</span
													>
												</div>
												<div class="mt-0.5 text-xs text-gray-400">
													{pending.patternDescription}
												</div>
											</div>
										</div>

										<!-- Actions -->
										<div class="flex items-center gap-1">
											<a
												href="/w/{data.workspaceId}/transactions/new?type={pending.type}&from_recurring={pending.templatePublicId}&date={pending.date}"
												class="rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
											>
												Confirm
											</a>
											<form method="POST" action="?/skip" use:enhance class="inline">
												<input type="hidden" name="templateId" value={pending.templateId} />
												<input type="hidden" name="date" value={pending.date} />
												<button
													type="submit"
													class="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
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
			<!-- Timeline end marker -->
			<div class="absolute -bottom-2 -left-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-gray-300 bg-white"></div>
		</div>
	{/if}
</div>

