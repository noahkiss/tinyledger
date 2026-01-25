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
				return { bg: 'bg-green-100', text: 'text-green-800', label: 'Created' };
			case 'updated':
				return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Updated' };
			case 'voided':
				return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Voided' };
			case 'unvoided':
				return { bg: 'bg-green-100', text: 'text-green-800', label: 'Restored' };
			case 'deleted':
				return { bg: 'bg-red-100', text: 'text-red-800', label: 'Deleted' };
			default:
				return { bg: 'bg-gray-100', text: 'text-gray-800', label: action };
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
				class="inline-flex items-center text-blue-600 hover:text-blue-800"
			>
				<svg class="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Transactions
			</a>
		{:else}
			<a
				href="/w/{workspace}/transactions/{data.transaction.publicId}"
				class="inline-flex items-center text-blue-600 hover:text-blue-800"
			>
				<svg class="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Transaction
			</a>
		{/if}
		<h1 class="mt-4 text-2xl font-bold text-gray-900">History for {data.transaction.payee}</h1>
		{#if data.transaction.isDeleted}
			<p class="mt-1 text-sm text-red-600">This transaction has been deleted</p>
		{/if}
	</div>

	<!-- Timeline -->
	{#if data.history.length === 0}
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
			<p class="text-gray-500">No history records found</p>
		</div>
	{:else}
		<div class="relative">
			<!-- Vertical timeline line -->
			<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

			<!-- History entries -->
			<div class="space-y-6">
				{#each data.history as entry, index}
					{@const badge = getActionBadge(entry.action)}
					{@const changedFields = parseChangedFields(entry.changedFields)}
					<div class="relative pl-10">
						<!-- Timeline dot -->
						<div
							class="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-white {badge.bg}"
						></div>

						<!-- Entry card -->
						<div class="rounded-lg border border-gray-200 bg-white p-4">
							<div class="flex items-center justify-between">
								<span
									class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {badge.bg} {badge.text}"
								>
									{badge.label}
								</span>
								<span class="text-sm text-gray-500">
									{formatTimestamp(entry.timestamp)}
								</span>
							</div>

							<!-- Changed fields for updates -->
							{#if entry.action === 'updated' && changedFields.length > 0}
								<div class="mt-3">
									<p class="text-sm font-medium text-gray-700">Changed fields:</p>
									<div class="mt-1 flex flex-wrap gap-1.5">
										{#each changedFields as field}
											<span class="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
												{formatFieldName(field)}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Optional: Expandable previous state -->
							{#if entry.previousState && entry.action !== 'created'}
								<details class="mt-3">
									<summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
										View previous state
									</summary>
									<pre class="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">{JSON.stringify(
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
