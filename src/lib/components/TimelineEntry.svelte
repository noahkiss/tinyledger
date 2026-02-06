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
	class="card entry-card"
	class:is-voided={!!transaction.voidedAt}
	data-component="transaction-card"
>
	<div class="card-content py-3 px-3">
		<div class="is-flex is-justify-content-space-between is-align-items-start">
			<div class="entry-left">
				<div class="is-flex is-align-items-center">
					<span
						class="has-text-weight-medium"
						class:payee-voided={!!transaction.voidedAt}
					>
						{transaction.payee}
					</span>
					{#if transaction.voidedAt}
						<span class="tag is-rounded is-light ml-2">Voided</span>
					{/if}
					{#if hasAttachment}
						<iconify-icon
							icon="solar:paperclip-bold"
							class="ml-2 icon-muted"
							width="16"
							height="16"
							aria-label="Has receipt"
						></iconify-icon>
					{/if}
				</div>
				{#if primaryTag}
					<span class="is-size-7 tag-label mt-1">
						{primaryTag.tagName}
					</span>
				{/if}
			</div>

			<div class="is-flex is-align-items-center entry-amount ml-3">
				{#if transaction.type === 'income'}
					<iconify-icon
						icon="solar:arrow-up-bold"
						class={transaction.voidedAt ? 'icon-muted' : 'icon-success'}
						width="16"
						height="16"
					></iconify-icon>
				{:else}
					<iconify-icon
						icon="solar:arrow-down-bold"
						class={transaction.voidedAt ? 'icon-muted' : 'icon-error'}
						width="16"
						height="16"
					></iconify-icon>
				{/if}
				<span
					class="has-text-weight-semibold tabular-nums ml-1"
					class:amount-voided={!!transaction.voidedAt}
					class:amount-income={!transaction.voidedAt && transaction.type === 'income'}
					class:amount-expense={!transaction.voidedAt && transaction.type === 'expense'}
				>
					{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amountCents)}
				</span>
			</div>
		</div>
	</div>
</a>

<style>
	.entry-card {
		display: block;
		border: 1px solid var(--color-card-border);
		border-radius: 0.5rem;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		text-decoration: none;
	}

	.entry-card:hover {
		border-color: var(--color-border);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.is-voided {
		opacity: 0.6;
	}

	.entry-left {
		min-width: 0;
		flex: 1;
	}

	.payee-voided {
		color: var(--color-muted);
		text-decoration: line-through;
	}

	.tag-label {
		display: inline-block;
		color: var(--color-muted);
	}

	.icon-muted {
		color: var(--color-muted);
	}

	.icon-success {
		color: var(--color-success);
	}

	.icon-error {
		color: var(--color-error);
	}

	.amount-voided {
		color: var(--color-muted);
		text-decoration: line-through;
	}

	.amount-income {
		color: var(--color-success);
	}

	.amount-expense {
		color: var(--color-error);
	}
</style>
