<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';

	interface BreakdownItem {
		label: string;
		amountCents: number;
		formula?: string;
	}

	interface Props {
		title: string;
		totalCents: number;
		items: BreakdownItem[];
		expanded?: boolean;
		variant?: 'default' | 'summary';
	}

	let { title, totalCents, items, expanded = false, variant = 'default' }: Props = $props();

	// svelte-ignore state_referenced_locally
	let isExpanded = $state(expanded);
</script>

<div class="rounded-lg border border-card-border bg-card overflow-hidden">
	{#if variant === 'summary'}
		<!-- Summary variant: not clickable, no chevron -->
		<div class="flex items-center justify-between p-4">
			<span class="font-medium text-fg">{title}</span>
			<span class="text-lg font-semibold text-fg">{formatCurrency(totalCents)}</span>
		</div>
	{:else}
		<!-- Default variant: expandable -->
		<button
			type="button"
			class="flex w-full items-center justify-between p-4 text-left hover:bg-surface transition-colors"
			onclick={() => (isExpanded = !isExpanded)}
		>
			<span class="font-medium text-fg">{title}</span>
			<div class="flex items-center gap-3">
				<span class="text-lg font-semibold text-fg">{formatCurrency(totalCents)}</span>
				<iconify-icon
					icon="solar:alt-arrow-down-linear"
					class="text-muted transition-transform {isExpanded ? 'rotate-180' : ''}"
					width="20"
					height="20"
				></iconify-icon>
			</div>
		</button>

		{#if isExpanded}
			<div class="border-t border-card-border bg-surface p-4">
				<dl class="space-y-2">
					{#each items as item}
						<div class="flex justify-between text-sm">
							<dt class="text-text-tertiary">
								{item.label}
								{#if item.formula}
									<span class="block text-xs text-text-quaternary">{item.formula}</span>
								{/if}
							</dt>
							<dd class="font-medium text-fg">{formatCurrency(item.amountCents)}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/if}
	{/if}
</div>
