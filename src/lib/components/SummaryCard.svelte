<script lang="ts">
	import type { Snippet } from 'svelte';
	import { formatCurrency } from '$lib/utils/currency';

	interface Props {
		label: string;
		value: number;
		percentChange: number | null;
		variant?: 'hero' | 'default';
		valuePrefix?: string;
		children?: Snippet;
	}

	let {
		label,
		value,
		percentChange,
		variant = 'default',
		valuePrefix = '',
		children
	}: Props = $props();

	// Format percent change for display
	const percentDisplay = $derived(
		percentChange !== null
			? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`
			: null
	);

	// Determine percent change styling
	const percentClass = $derived(
		percentChange === null
			? 'text-muted bg-surface'
			: percentChange >= 0
				? 'text-success bg-success/10'
				: 'text-error bg-error/10'
	);
</script>

{#if variant === 'hero'}
	<!-- Hero card: larger, more prominent -->
	<div
		class="rounded-lg border border-card-border bg-gradient-to-br from-card to-surface p-6 shadow-sm"
	>
		<div class="flex items-start justify-between">
			<div>
				<span class="text-sm font-medium text-muted">{label}</span>
				<div class="mt-2 flex items-baseline gap-2">
					<span class="text-3xl font-bold {value >= 0 ? 'text-fg' : 'text-error'}">
						{valuePrefix}{formatCurrency(value)}
					</span>
					{#if percentDisplay}
						<span class="rounded-full px-2 py-0.5 text-xs font-medium {percentClass}">
							{percentDisplay}
						</span>
					{/if}
				</div>
			</div>
			{#if children}
				<div class="flex-shrink-0">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Default card: compact supporting card -->
	<div class="rounded-lg border border-card-border bg-card p-4 shadow-sm">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-muted">{label}</span>
			{#if percentDisplay}
				<span class="rounded-full px-2 py-0.5 text-xs font-medium {percentClass}">
					{percentDisplay}
				</span>
			{/if}
		</div>
		<div class="mt-2">
			<span class="text-xl font-semibold text-fg">
				{valuePrefix}{formatCurrency(value)}
			</span>
		</div>
		{#if children}
			<div class="mt-2">
				{@render children()}
			</div>
		{/if}
	</div>
{/if}
