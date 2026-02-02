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

	let isExpanded = $state(expanded);
</script>

<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
	{#if variant === 'summary'}
		<!-- Summary variant: not clickable, no chevron -->
		<div class="flex items-center justify-between p-4">
			<span class="font-medium text-gray-900">{title}</span>
			<span class="text-lg font-semibold text-gray-900">{formatCurrency(totalCents)}</span>
		</div>
	{:else}
		<!-- Default variant: expandable -->
		<button
			type="button"
			class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
			onclick={() => (isExpanded = !isExpanded)}
		>
			<span class="font-medium text-gray-900">{title}</span>
			<div class="flex items-center gap-3">
				<span class="text-lg font-semibold text-gray-900">{formatCurrency(totalCents)}</span>
				<svg
					class="h-5 w-5 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
		</button>

		{#if isExpanded}
			<div class="border-t border-gray-100 bg-gray-50 p-4">
				<dl class="space-y-2">
					{#each items as item}
						<div class="flex justify-between text-sm">
							<dt class="text-gray-600">
								{item.label}
								{#if item.formula}
									<span class="block text-xs text-gray-400">{item.formula}</span>
								{/if}
							</dt>
							<dd class="font-medium text-gray-900">{formatCurrency(item.amountCents)}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/if}
	{/if}
</div>
