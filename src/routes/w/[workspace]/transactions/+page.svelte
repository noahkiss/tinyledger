<script lang="ts">
	import type { PageData } from './$types';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';
	import FiscalYearPicker from '$lib/components/FiscalYearPicker.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import TimelineEntry from '$lib/components/TimelineEntry.svelte';
	import TimelineDateMarker from '$lib/components/TimelineDateMarker.svelte';
	import QuickEntryFAB from '$lib/components/QuickEntryFAB.svelte';

	let { data }: { data: PageData } = $props();

	// Group transactions by date
	let groupedTransactions = $derived(() => {
		const groups = new Map<
			string,
			{
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
			}[]
		>();

		for (const txn of data.transactions) {
			const existing = groups.get(txn.date);
			if (existing) {
				existing.push(txn);
			} else {
				groups.set(txn.date, [txn]);
			}
		}

		// Convert to array sorted by date descending
		return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
	});

	// Check if any filters are active (for empty state messaging)
	let hasActiveFilters = $derived(
		data.currentFilters.payee ||
			data.currentFilters.tags.length > 0 ||
			data.currentFilters.from ||
			data.currentFilters.to ||
			data.currentFilters.type ||
			data.currentFilters.method
	);

	// Scroll to current/most recent on initial load
	let timelineContainer: HTMLElement | undefined = $state();
	let hasScrolled = $state(false);

	$effect(() => {
		// Only scroll on initial load when no filters are active
		if (timelineContainer && !hasScrolled && !hasActiveFilters && data.transactions.length > 0) {
			// Find today's date or most recent
			const today = new Date().toISOString().split('T')[0];
			const todayMarker = timelineContainer.querySelector(`[data-date="${today}"]`);
			const firstMarker = timelineContainer.querySelector('[data-date]');

			const targetEl = todayMarker || firstMarker;
			if (targetEl) {
				// Scroll after a brief delay to ensure layout is complete
				setTimeout(() => {
					targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
					// Adjust for sticky header (approximately 60px)
					window.scrollBy(0, -70);
				}, 50);
			}
			hasScrolled = true;
		}
	});
</script>

<svelte:head>
	<title>Transactions - TinyLedger</title>
</svelte:head>

<div class="space-y-4">
	<!-- Income / Expense buttons -->
	<div class="grid grid-cols-2 gap-4">
		<a
			href="/w/{data.workspaceId}/transactions/new?type=income"
			class="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-green-700 active:bg-green-800"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" />
			</svg>
			Income
		</a>
		<a
			href="/w/{data.workspaceId}/transactions/new?type=expense"
			class="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-red-700 active:bg-red-800"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
			</svg>
			Expense
		</a>
	</div>

	<!-- Sticky header with fiscal year and totals -->
	<header
		class="sticky top-0 z-10 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur"
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
	{#if data.transactions.length === 0}
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
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
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
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
		<ol bind:this={timelineContainer} class="relative ms-3 border-s-2 border-gray-200">
			{#each groupedTransactions() as [date, txns] (date)}
				<li class="mb-6 ms-6" data-date={date}>
					<TimelineDateMarker {date} />
					<div class="space-y-2">
						{#each txns as txn (txn.id)}
							<TimelineEntry transaction={txn} workspaceId={data.workspaceId} />
						{/each}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<!-- Quick Entry FAB -->
<QuickEntryFAB
	workspaceId={data.workspaceId}
	availableTags={data.tags}
	payeeHistory={data.payeeHistory}
/>
