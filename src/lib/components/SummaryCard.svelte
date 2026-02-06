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

	// Determine percent change tag color
	const percentTagClass = $derived(
		percentChange === null
			? 'muted-tag'
			: percentChange >= 0
				? 'is-success is-light'
				: 'is-danger is-light'
	);
</script>

{#if variant === 'hero'}
	<!-- Hero card: larger, more prominent -->
	<div class="card hero-card">
		<div class="card-content">
			<div class="is-flex is-justify-content-space-between is-align-items-start">
				<div>
					<p class="is-size-7 has-text-weight-medium label-text">{label}</p>
					<div class="is-flex is-align-items-baseline mt-2">
						<span class="is-size-3 has-text-weight-bold" class:value-negative={value < 0}>
							{valuePrefix}{formatCurrency(value)}
						</span>
						{#if percentDisplay}
							<span class="tag is-rounded ml-3 {percentTagClass}">
								{percentDisplay}
							</span>
						{/if}
					</div>
				</div>
				{#if children}
					<div class="is-flex-shrink-0">
						{@render children()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- Default card: compact supporting card -->
	<div class="card">
		<div class="card-content">
			<div class="is-flex is-align-items-center is-justify-content-space-between">
				<span class="is-size-7 has-text-weight-medium label-text">{label}</span>
				{#if percentDisplay}
					<span class="tag is-rounded {percentTagClass}">
						{percentDisplay}
					</span>
				{/if}
			</div>
			<div class="mt-2">
				<span class="is-size-5 has-text-weight-semibold">
					{valuePrefix}{formatCurrency(value)}
				</span>
			</div>
			{#if children}
				<div class="mt-2">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.card {
		border: 1px solid var(--color-card-border);
		border-radius: 0.75rem;
	}

	.hero-card {
		background: linear-gradient(135deg, var(--color-card-bg), var(--color-surface));
	}

	.label-text {
		color: var(--color-muted);
	}

	.value-negative {
		color: var(--color-error);
	}

	.muted-tag {
		background-color: var(--color-surface);
		color: var(--color-muted);
	}
</style>
