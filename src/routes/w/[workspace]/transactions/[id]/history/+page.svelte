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
	function getActionBadge(action: string): { bg: string; text: string; label: string } {
		switch (action) {
			case 'created':
				return { bg: 'bg-success/10', text: 'text-success', label: 'Created' };
			case 'updated':
				return { bg: 'bg-primary/10', text: 'text-primary', label: 'Updated' };
			case 'voided':
				return { bg: 'bg-warning/10', text: 'text-warning', label: 'Voided' };
			case 'unvoided':
				return { bg: 'bg-success/10', text: 'text-success', label: 'Restored' };
			case 'deleted':
				return { bg: 'bg-error/10', text: 'text-error', label: 'Deleted' };
			default:
				return { bg: 'bg-surface', text: 'text-fg', label: action };
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

<div class="mx-auto max-w-2xl p-6">
	<!-- Header -->
	<div class="mb-6">
		{#if data.transaction.isDeleted}
			<a
				href="/w/{workspace}/transactions"
				class="inline-flex items-center text-primary hover:text-primary-hover"
			>
				<iconify-icon icon="solar:alt-arrow-left-linear" class="mr-1" width="20" height="20"></iconify-icon>
				Back to Transactions
			</a>
		{:else}
			<a
				href="/w/{workspace}/transactions/{data.transaction.publicId}"
				class="inline-flex items-center text-primary hover:text-primary-hover"
			>
				<iconify-icon icon="solar:alt-arrow-left-linear" class="mr-1" width="20" height="20"></iconify-icon>
				Back to Transaction
			</a>
		{/if}
		<h1 class="mt-4 text-2xl font-bold text-fg">History for {data.transaction.payee}</h1>
		{#if data.transaction.isDeleted}
			<p class="mt-1 text-sm text-error">This transaction has been deleted</p>
		{/if}
	</div>

	<!-- Timeline -->
	{#if data.history.length === 0}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<p class="text-muted">No history records found</p>
		</div>
	{:else}
		<div class="relative">
			<!-- Vertical timeline line -->
			<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

			<!-- History entries -->
			<div class="space-y-6">
				{#each data.history as entry, index}
					{@const badge = getActionBadge(entry.action)}
					{@const changedFields = parseChangedFields(entry.changedFields)}
					<div class="relative pl-10">
						<!-- Timeline dot -->
						<div
							class="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-card {badge.bg}"
						></div>

						<!-- Entry card -->
						<div class="rounded-lg border border-border bg-card p-4">
							<div class="flex items-center justify-between">
								<span
									class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {badge.bg} {badge.text}"
								>
									{badge.label}
								</span>
								<span class="text-sm text-muted">
									{formatTimestamp(entry.timestamp)}
								</span>
							</div>

							<!-- Changed fields for updates -->
							{#if entry.action === 'updated' && changedFields.length > 0}
								<div class="mt-3">
									<p class="text-sm font-medium text-fg">Changed fields:</p>
									<div class="mt-1 flex flex-wrap gap-1.5">
										{#each changedFields as field}
											<span class="inline-flex items-center rounded bg-surface px-2 py-0.5 text-xs text-fg">
												{formatFieldName(field)}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Optional: Expandable previous state -->
							{#if entry.previousState && entry.action !== 'created'}
								<details class="mt-3">
									<summary class="cursor-pointer text-sm text-muted hover:text-fg">
										View previous state
									</summary>
									<pre class="mt-2 overflow-x-auto rounded bg-surface p-2 text-xs text-muted">{JSON.stringify(
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
