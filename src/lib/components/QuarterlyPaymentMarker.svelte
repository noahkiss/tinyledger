<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';
	import { enhance } from '$app/forms';

	interface Props {
		quarter: 1 | 2 | 3 | 4;
		dueDate: string;
		dueDateLabel: string;
		federalRecommendedCents: number;
		stateRecommendedCents: number;
		isPaid: boolean;
		paidFederalCents?: number | null;
		paidStateCents?: number | null;
		isPastDue: boolean;
		isUpcoming: boolean;
		isSkipped?: boolean;
		rolloverCents?: number;
		workspaceId: string;
		fiscalYear: number;
	}

	let {
		quarter,
		dueDate,
		dueDateLabel,
		federalRecommendedCents,
		stateRecommendedCents,
		isPaid,
		paidFederalCents = null,
		paidStateCents = null,
		isPastDue,
		isUpcoming,
		isSkipped = false,
		rolloverCents = 0,
		workspaceId,
		fiscalYear
	}: Props = $props();

	// Calculate totals
	let recommendedTotal = $derived(federalRecommendedCents + stateRecommendedCents);
	let paidTotal = $derived((paidFederalCents ?? 0) + (paidStateCents ?? 0));

	// Status variant
	let statusVariant = $derived(() => {
		if (isPaid) return 'paid';
		if (isSkipped) return 'skipped';
		if (isPastDue) return 'past-due';
		if (isUpcoming) return 'upcoming';
		return 'default';
	});

	// Status badge info
	let statusBadge = $derived(() => {
		if (isPaid) return { text: 'Paid', tagClass: 'is-success is-light' };
		if (isSkipped) return { text: 'Skipped', tagClass: 'is-light' };
		if (isPastDue) return { text: 'Past Due', tagClass: 'is-danger is-light' };
		if (isUpcoming) return { text: 'Upcoming', tagClass: 'is-warning is-light' };
		return null;
	});
</script>

<a
	href="/w/{workspaceId}/taxes"
	class="card qpm-card"
	class:qpm-paid={statusVariant() === 'paid'}
	class:qpm-skipped={statusVariant() === 'skipped'}
	class:qpm-past-due={statusVariant() === 'past-due'}
	class:qpm-upcoming={statusVariant() === 'upcoming'}
	data-component="quarterly-payment-marker"
	data-quarter={quarter}
>
	<div class="card-content py-3 px-3">
		<div class="is-flex is-align-items-start">
			<!-- Calendar icon -->
			<div class="calendar-icon mr-3">
				<iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
			</div>

			<div class="qpm-body">
				<!-- Top row: Quarter label + status badge -->
				<div class="is-flex is-align-items-center">
					<span class="is-size-7 has-text-weight-medium">Q{quarter} Estimated Tax</span>
					{#if statusBadge()}
						<span class="tag is-small is-rounded ml-2 {statusBadge()?.tagClass}">
							{statusBadge()?.text}
						</span>
					{/if}
				</div>

				<!-- Second row: Due date -->
				<time datetime={dueDate} class="is-block is-size-7 muted-text">
					Due {dueDateLabel}
				</time>

				<!-- Third row: Amounts -->
				<div class="mt-1">
					{#if isPaid}
						<div class="is-flex is-align-items-center is-size-7 paid-text">
							<iconify-icon icon="solar:check-circle-bold" width="14" height="14" class="mr-1"></iconify-icon>
							<span>
								Federal {formatCurrency(paidFederalCents ?? 0)} | State {formatCurrency(paidStateCents ?? 0)} | Total {formatCurrency(paidTotal)}
							</span>
						</div>
					{:else if isSkipped}
						<div class="is-size-7 muted-text">
							Skipped - amount rolled to next quarter
						</div>
					{:else}
						<div class="is-size-7 muted-text">
							Recommended: {formatCurrency(recommendedTotal)}
							{#if rolloverCents > 0}
								<span class="warning-text"> (includes {formatCurrency(rolloverCents)} from missed)</span>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="mt-1 is-flex is-align-items-center">
					{#if isPaid}
						<span class="is-size-7 has-text-weight-medium action-link">View Details</span>
					{:else if isSkipped}
						<span class="is-size-7 muted-text">Amount rolled forward</span>
					{:else if isPastDue}
						<!-- Past due: show both Mark Paid and Skip options -->
						<span class="is-size-7 has-text-weight-medium action-link">Mark Paid</span>
						<span class="muted-text mx-1">|</span>
						<form method="POST" action="/w/{workspaceId}/taxes?/skipQuarter" use:enhance class="is-inline">
							<input type="hidden" name="fiscalYear" value={fiscalYear} />
							<input type="hidden" name="quarter" value={quarter} />
							<button
								type="submit"
								class="button is-ghost is-small skip-btn"
								onclick={(e) => e.stopPropagation()}
							>
								Skip
							</button>
						</form>
					{:else}
						<span class="is-size-7 has-text-weight-medium action-link">Mark Paid</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
</a>

<style>
	.qpm-card {
		display: block;
		border: 2px dashed var(--color-border);
		border-radius: 0.5rem;
		transition: border-color 0.15s ease;
		text-decoration: none;
	}

	.qpm-card:hover {
		border-color: var(--color-overlay);
	}

	.qpm-paid {
		border-color: var(--color-success);
		background-color: color-mix(in srgb, var(--color-success) 5%, var(--color-card-bg));
	}

	.qpm-skipped {
		border-color: var(--color-overlay);
		background-color: var(--color-surface-alt);
	}

	.qpm-past-due {
		border-color: var(--color-error);
		background-color: color-mix(in srgb, var(--color-error) 5%, var(--color-card-bg));
	}

	.qpm-upcoming {
		border-color: var(--color-warning);
		background-color: color-mix(in srgb, var(--color-warning) 5%, var(--color-card-bg));
	}

	.calendar-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		border-radius: 0.5rem;
		background-color: var(--color-surface);
		color: var(--color-muted);
	}

	.qpm-body {
		min-width: 0;
		flex: 1;
	}

	.muted-text {
		color: var(--color-muted);
	}

	.paid-text {
		color: var(--color-success);
	}

	.warning-text {
		color: var(--color-warning);
	}

	.action-link {
		color: var(--color-primary);
	}

	.skip-btn {
		color: var(--color-muted);
		padding: 0;
		height: auto;
		font-size: 0.75rem;
		font-weight: 500;
		text-decoration: none;
	}

	.skip-btn:hover {
		color: var(--color-foreground);
	}
</style>
