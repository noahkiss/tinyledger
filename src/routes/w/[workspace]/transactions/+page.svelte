<script lang="ts">
	import type { PageData } from './$types';
	import { formatCurrency } from '$lib/utils/currency';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Transactions - TinyLedger</title>
</svelte:head>

<div class="space-y-6">
	<!-- Heading -->
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-semibold text-gray-900">Transactions</h2>
	</div>

	<!-- Income / Expense buttons -->
	<div class="grid grid-cols-2 gap-4">
		<a
			href="/w/{data.workspaceId}/transactions/new?type=income"
			class="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-green-700 active:bg-green-800"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 6v12m6-6H6"
				/>
			</svg>
			Income
		</a>
		<a
			href="/w/{data.workspaceId}/transactions/new?type=expense"
			class="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-red-700 active:bg-red-800"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M20 12H4"
				/>
			</svg>
			Expense
		</a>
	</div>

	<!-- Transaction list -->
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
			<p class="mt-4 text-gray-600">No transactions yet</p>
			<p class="mt-1 text-sm text-gray-500">
				Tap Income or Expense above to add your first transaction.
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<div class="divide-y divide-gray-200">
				{#each data.transactions as txn}
					<a
						href="/w/{data.workspaceId}/transactions/{txn.publicId}"
						class="block px-4 py-3 hover:bg-gray-50"
						class:line-through={txn.voidedAt}
						class:opacity-60={txn.voidedAt}
					>
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span
										class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
										class:bg-green-100={txn.type === 'income'}
										class:text-green-800={txn.type === 'income'}
										class:bg-red-100={txn.type === 'expense'}
										class:text-red-800={txn.type === 'expense'}
									>
										{txn.type === 'income' ? 'Income' : 'Expense'}
									</span>
									{#if txn.voidedAt}
										<span
											class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
										>
											Voided
										</span>
									{/if}
								</div>
								<p class="mt-1 truncate font-medium text-gray-900">{txn.payee}</p>
								<p class="text-sm text-gray-500">{txn.date}</p>
							</div>
							<div class="ml-4 text-right">
								<p
									class="font-semibold"
									class:text-green-600={txn.type === 'income' && !txn.voidedAt}
									class:text-red-600={txn.type === 'expense' && !txn.voidedAt}
									class:text-gray-400={txn.voidedAt}
								>
									{txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amountCents)}
								</p>
								{#if txn.tags && txn.tags.length > 0}
									<p class="mt-1 text-xs text-gray-500">
										{txn.tags.map((t) => t.tagName).join(', ')}
									</p>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
