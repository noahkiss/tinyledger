<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';

	type TransactionWithTags = {
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

	let {
		transaction,
		workspaceId,
		hasAttachment = false
	}: {
		transaction: TransactionWithTags;
		workspaceId: string;
		hasAttachment?: boolean;
	} = $props();

	// Get primary tag (first tag or highest percentage)
	let primaryTag = $derived(
		transaction.tags.length > 0
			? transaction.tags.reduce((a, b) => (a.percentage > b.percentage ? a : b))
			: null
	);
</script>

<a
	href="/w/{workspaceId}/transactions/{transaction.publicId}"
	class="block rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-gray-200 hover:shadow-md
		{transaction.voidedAt ? 'opacity-60' : ''}"
	data-component="transaction-card"
>
	<div class="flex items-start justify-between">
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span
					class="font-medium {transaction.voidedAt ? 'text-gray-500 line-through' : 'text-gray-900'}"
				>
					{transaction.payee}
				</span>
				{#if transaction.voidedAt}
					<span
						class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
					>
						Voided
					</span>
				{/if}
				{#if hasAttachment}
					<iconify-icon
						icon="solar:paperclip-bold"
						class="text-gray-400"
						width="16"
						height="16"
						aria-label="Has receipt"
					></iconify-icon>
				{/if}
			</div>
			{#if primaryTag}
				<span class="mt-1 inline-block text-xs text-gray-500">
					{primaryTag.tagName}
				</span>
			{/if}
		</div>

		<div class="ml-3 flex items-center gap-1.5">
			{#if transaction.type === 'income'}
				<iconify-icon
					icon="solar:arrow-up-bold"
					class={transaction.voidedAt ? 'text-gray-400' : 'text-green-500'}
					width="16"
					height="16"
				></iconify-icon>
			{:else}
				<iconify-icon
					icon="solar:arrow-down-bold"
					class={transaction.voidedAt ? 'text-gray-400' : 'text-red-500'}
					width="16"
					height="16"
				></iconify-icon>
			{/if}
			<span
				class="font-semibold
					{transaction.voidedAt
					? 'text-gray-400 line-through'
					: transaction.type === 'income'
						? 'text-green-600'
						: 'text-red-600'}"
			>
				{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amountCents)}
			</span>
		</div>
	</div>
</a>
