<script lang="ts">
	import type { PageData } from './$types';
	import FilingCard from '$lib/components/FilingCard.svelte';

	let { data }: { data: PageData } = $props();

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
	<h1 class="text-2xl font-bold text-fg">Filings</h1>

	<!-- Info banner -->
	<div class="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
		<p class="text-sm text-primary">
			Track your compliance filings. Past-due filings appear at the top.
			{#if summary.pastDue > 0}
				<span class="font-medium text-error">You have {summary.pastDue} past-due filing{summary.pastDue === 1 ? '' : 's'}.</span>
			{/if}
		</p>
	</div>

	<!-- Status summary -->
	<div class="flex gap-4 text-sm">
		{#if summary.pastDue > 0}
			<div class="flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-full bg-error"></span>
				<span class="text-muted">{summary.pastDue} past due</span>
			</div>
		{/if}
		{#if summary.upcoming > 0}
			<div class="flex items-center gap-1">
				<span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
				<span class="text-muted">{summary.upcoming} upcoming</span>
			</div>
		{/if}
		<div class="flex items-center gap-1">
			<span class="inline-block h-2 w-2 rounded-full bg-success"></span>
			<span class="text-muted">{summary.complete} complete</span>
		</div>
		<div class="text-muted">
			{summary.total} total
		</div>
	</div>

	{#if data.filings.length === 0}
		<!-- Empty state -->
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<iconify-icon icon="solar:document-text-bold" class="mx-auto text-muted" width="48" height="48"></iconify-icon>
			<h3 class="mt-4 text-lg font-medium text-fg">No filings found</h3>
			<p class="mt-1 text-sm text-muted">
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
