<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();

	const workspace = $derived($page.params.workspace);

	// Format ISO timestamp for display
	function formatTimestamp(isoStr: string): string {
		const date = new Date(isoStr);
		return date.toLocaleString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Get badge color based on action
	function getActionBadge(action: string): { cls: string; label: string } {
		switch (action) {
			case 'created':
				return { cls: 'is-success', label: 'Created' };
			case 'updated':
				return { cls: 'is-info', label: 'Updated' };
			case 'voided':
				return { cls: 'is-warning', label: 'Voided' };
			case 'unvoided':
				return { cls: 'is-success', label: 'Restored' };
			case 'deleted':
				return { cls: 'is-danger', label: 'Deleted' };
			default:
				return { cls: '', label: action };
		}
	}

	// Parse changedFields JSON
	function parseChangedFields(json: unknown): string[] {
		if (!json) return [];
		if (typeof json === 'string') {
			try {
				return JSON.parse(json);
			} catch {
				return [];
			}
		}
		if (Array.isArray(json)) return json;
		return [];
	}

	// Format field name for display
	function formatFieldName(field: string): string {
		const names: Record<string, string> = {
			type: 'Type',
			amountCents: 'Amount',
			date: 'Date',
			payee: 'Payee',
			description: 'Description',
			paymentMethod: 'Payment Method',
			checkNumber: 'Check Number',
			tags: 'Tags'
		};
		return names[field] || field;
	}
</script>

<svelte:head>
	<title>History - {data.transaction.payee} | TinyLedger</title>
</svelte:head>

<div class="container history-container">
	<!-- Header -->
	<div class="mb-5">
		{#if data.transaction.isDeleted}
			<a
				href="/w/{workspace}/transactions"
				class="back-link"
			>
				<iconify-icon icon="solar:alt-arrow-left-linear" class="mr-1" width="20" height="20"></iconify-icon>
				Back to Transactions
			</a>
		{:else}
			<a
				href="/w/{workspace}/transactions/{data.transaction.publicId}"
				class="back-link"
			>
				<iconify-icon icon="solar:alt-arrow-left-linear" class="mr-1" width="20" height="20"></iconify-icon>
				Back to Transaction
			</a>
		{/if}
		<h1 class="title is-4 mt-4">History for {data.transaction.payee}</h1>
		{#if data.transaction.isDeleted}
			<p class="mt-1 is-size-7 has-text-danger">This transaction has been deleted</p>
		{/if}
	</div>

	<!-- Timeline -->
	{#if data.history.length === 0}
		<div class="box has-text-centered" style="padding: 2rem;">
			<p class="has-text-grey">No history records found</p>
		</div>
	{:else}
		<div class="timeline">
			<!-- Vertical timeline line -->
			<div class="timeline-line"></div>

			<!-- History entries -->
			<div class="timeline-entries">
				{#each data.history as entry, index}
					{@const badge = getActionBadge(entry.action)}
					{@const changedFields = parseChangedFields(entry.changedFields)}
					<div class="timeline-entry">
						<!-- Timeline dot -->
						<div class="timeline-dot {badge.cls}"></div>

						<!-- Entry card -->
						<div class="box mb-0 entry-card">
							<div class="is-flex is-align-items-center is-justify-content-space-between">
								<span class="tag is-light {badge.cls}">
									{badge.label}
								</span>
								<span class="is-size-7 has-text-grey">
									{formatTimestamp(entry.timestamp)}
								</span>
							</div>

							<!-- Changed fields for updates -->
							{#if entry.action === 'updated' && changedFields.length > 0}
								<div class="mt-3">
									<p class="is-size-7 has-text-weight-medium">Changed fields:</p>
									<div class="mt-1 tags are-small">
										{#each changedFields as field}
											<span class="tag">{formatFieldName(field)}</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Optional: Expandable previous state -->
							{#if entry.previousState && entry.action !== 'created'}
								<details class="mt-3">
									<summary class="is-size-7 has-text-grey previous-state-toggle">
										View previous state
									</summary>
									<pre class="previous-state-pre">{JSON.stringify(
											typeof entry.previousState === 'string'
												? JSON.parse(entry.previousState)
												: entry.previousState,
											null,
											2
										)}</pre>
								</details>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.history-container {
		max-width: 42rem;
		padding: 1.5rem;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		color: var(--color-primary);
	}
	.back-link:hover {
		color: var(--color-primary);
		opacity: 0.85;
	}
	.timeline {
		position: relative;
	}
	.timeline-line {
		position: absolute;
		left: 1rem;
		top: 0;
		bottom: 0;
		width: 2px;
		background-color: var(--color-border);
	}
	.timeline-entries {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.timeline-entry {
		position: relative;
		padding-left: 2.5rem;
	}
	.timeline-dot {
		position: absolute;
		left: 0.5rem;
		top: 0.25rem;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: 2px solid var(--color-card-bg);
		background-color: var(--color-surface);
	}
	.timeline-dot.is-success {
		background-color: var(--color-success);
	}
	.timeline-dot.is-info {
		background-color: var(--color-primary);
	}
	.timeline-dot.is-warning {
		background-color: var(--color-warning);
	}
	.timeline-dot.is-danger {
		background-color: var(--color-error);
	}
	.entry-card {
		padding: 1rem;
	}
	.previous-state-toggle {
		cursor: pointer;
	}
	.previous-state-toggle:hover {
		color: var(--color-foreground);
	}
	.previous-state-pre {
		margin-top: 0.5rem;
		overflow-x: auto;
		border-radius: 0.375rem;
		background-color: var(--color-surface);
		padding: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-muted);
	}
</style>
