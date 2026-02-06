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

<div class="card breakdown-card">
	{#if variant === 'summary'}
		<!-- Summary variant: not clickable, no chevron -->
		<div class="card-content">
			<div class="is-flex is-align-items-center is-justify-content-space-between">
				<span class="has-text-weight-medium">{title}</span>
				<span class="is-size-5 has-text-weight-semibold">{formatCurrency(totalCents)}</span>
			</div>
		</div>
	{:else}
		<!-- Default variant: expandable -->
		<div class="card-content expandable-header" role="button" tabindex="0"
			onclick={() => (isExpanded = !isExpanded)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (isExpanded = !isExpanded)}
		>
			<div class="is-flex is-align-items-center is-justify-content-space-between">
				<span class="has-text-weight-medium">{title}</span>
				<div class="is-flex is-align-items-center">
					<span class="is-size-5 has-text-weight-semibold mr-3">{formatCurrency(totalCents)}</span>
					<iconify-icon
						icon="solar:alt-arrow-down-linear"
						class="chevron-icon"
						class:is-rotated={isExpanded}
						width="20"
						height="20"
					></iconify-icon>
				</div>
			</div>
		</div>

		{#if isExpanded}
			<div class="breakdown-details">
				<dl>
					{#each items as item}
						<div class="is-flex is-justify-content-space-between is-size-7 breakdown-row">
							<dt class="dt-label">
								{item.label}
								{#if item.formula}
									<span class="is-block formula-text">{item.formula}</span>
								{/if}
							</dt>
							<dd class="has-text-weight-medium">{formatCurrency(item.amountCents)}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/if}
	{/if}
</div>

<style>
	.breakdown-card {
		border: 1px solid var(--color-card-border);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.expandable-header {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.expandable-header:hover {
		background-color: var(--color-surface);
	}

	.chevron-icon {
		color: var(--color-muted);
		transition: transform 0.2s ease;
	}

	.chevron-icon.is-rotated {
		transform: rotate(180deg);
	}

	.breakdown-details {
		border-top: 1px solid var(--color-card-border);
		background-color: var(--color-surface);
		padding: 1rem;
	}

	.breakdown-row {
		margin-bottom: 0.5rem;
	}

	.breakdown-row:last-child {
		margin-bottom: 0;
	}

	.dt-label {
		color: var(--color-muted);
	}

	.formula-text {
		font-size: 0.75rem;
		color: var(--color-muted);
	}
</style>
