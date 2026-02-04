<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import FilingCard from '$lib/components/FilingCard.svelte';

	let { data }: { data: PageData } = $props();

	// Fiscal year picker handler
	function handleFYChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const fy = select.value;
		goto(`/w/${data.workspaceId}/filings?fy=${fy}`, { replaceState: true, noScroll: true });
	}

	// Track which card has form open
	let openFormId = $state<string | null>(null);

	function toggleForm(filingId: string) {
		if (openFormId === filingId) {
			openFormId = null;
		} else {
			openFormId = filingId;
		}
	}

	// Count filings by status for summary
	const summary = $derived({
		pastDue: data.filings.filter((f) => f.isPastDue).length,
		upcoming: data.filings.filter((f) => f.isUpcoming).length,
		complete: data.filings.filter((f) => f.isComplete).length,
		total: data.filings.length
	});
</script>

<svelte:head>
	<title>Filings - TinyLedger</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header with fiscal year picker -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Filings</h1>

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

	<!-- Info banner -->
	<div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
		<p class="text-sm text-blue-800">
			Track your compliance filings. Past-due filings appear at the top.
			{#if summary.pastDue > 0}
				<span class="font-medium text-red-700">You have {summary.pastDue} past-due filing{summary.pastDue === 1 ? '' : 's'}.</span>
			{/if}
		</p>
	</div>

	<!-- Status summary -->
	<div class="flex gap-4 text-sm">
		{#if summary.pastDue > 0}
			<div class="flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-full bg-red-500"></span>
				<span class="text-gray-600">{summary.pastDue} past due</span>
			</div>
		{/if}
		{#if summary.upcoming > 0}
			<div class="flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
				<span class="text-gray-600">{summary.upcoming} upcoming</span>
			</div>
		{/if}
		<div class="flex items-center gap-1">
			<span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
			<span class="text-gray-600">{summary.complete} complete</span>
		</div>
		<div class="text-gray-400">
			{summary.total} total
		</div>
	</div>

	{#if data.filings.length === 0}
		<!-- Empty state -->
		<div class="rounded-xl border border-gray-200 bg-white p-8 text-center">
			<iconify-icon icon="solar:document-text-bold" class="mx-auto text-gray-400" width="48" height="48"></iconify-icon>
			<h3 class="mt-4 text-lg font-medium text-gray-900">No filings found</h3>
			<p class="mt-1 text-sm text-gray-500">
				No compliance filings are configured for this workspace type.
			</p>
		</div>
	{:else}
		<!-- Grid of FilingCards -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.filings as filing (filing.id)}
				<FilingCard
					{filing}
					fiscalYear={data.fiscalYear}
					showMarkCompleteForm={openFormId === filing.id}
					onToggleForm={() => toggleForm(filing.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
