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

<div>
	<!-- Header with fiscal year picker -->
	<div class="is-flex is-align-items-center is-justify-content-space-between mb-5">
		<h1 class="title is-4 mb-0">Filings</h1>

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

	<!-- Info banner -->
	<div class="notification is-info is-light mb-4">
		<p class="is-size-7">
			Track your compliance filings. Past-due filings appear at the top.
			{#if summary.pastDue > 0}
				<span class="has-text-weight-medium has-text-danger">You have {summary.pastDue} past-due filing{summary.pastDue === 1 ? '' : 's'}.</span>
			{/if}
		</p>
	</div>

	<!-- Status summary -->
	<div class="is-flex is-size-7 mb-5" style="gap: 1rem;">
		{#if summary.pastDue > 0}
			<div class="is-flex is-align-items-center" style="gap: 0.25rem;">
				<span class="status-dot is-danger"></span>
				<span class="has-text-grey">{summary.pastDue} past due</span>
			</div>
		{/if}
		{#if summary.upcoming > 0}
			<div class="is-flex is-align-items-center" style="gap: 0.25rem;">
				<span class="status-dot is-warning"></span>
				<span class="has-text-grey">{summary.upcoming} upcoming</span>
			</div>
		{/if}
		<div class="is-flex is-align-items-center" style="gap: 0.25rem;">
			<span class="status-dot is-success"></span>
			<span class="has-text-grey">{summary.complete} complete</span>
		</div>
		<div class="has-text-grey">
			{summary.total} total
		</div>
	</div>

	{#if data.filings.length === 0}
		<!-- Empty state -->
		<div class="box has-text-centered p-6">
			<iconify-icon icon="solar:document-text-bold" class="has-text-grey" width="48" height="48"></iconify-icon>
			<h3 class="title is-5 mt-4">No filings found</h3>
			<p class="is-size-7 has-text-grey mt-1">
				No compliance filings are configured for this workspace type.
			</p>
		</div>
	{:else}
		<!-- Grid of FilingCards -->
		<div class="columns is-multiline">
			{#each data.filings as filing (filing.id)}
				<div class="column is-one-third-desktop is-half-tablet">
					<FilingCard
						{filing}
						fiscalYear={data.fiscalYear}
						showMarkCompleteForm={openFormId === filing.id}
						onToggleForm={() => toggleForm(filing.id)}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.status-dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}
	.status-dot.is-danger {
		background-color: var(--bulma-danger);
	}
	.status-dot.is-warning {
		background-color: var(--bulma-warning);
	}
	.status-dot.is-success {
		background-color: var(--bulma-success);
	}
</style>
