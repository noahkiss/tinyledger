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

	// Border and background colors based on status
	let borderClass = $derived.by(() => {
		if (isPaid) return 'border-success/30 bg-success/10';
		if (isSkipped) return 'border-overlay bg-surface-alt';
		if (isPastDue) return 'border-error/30 bg-error/10';
		if (isUpcoming) return 'border-warning/30 bg-warning/10';
		return 'border-input-border bg-surface';
	});

	// Status badge
	let statusBadge = $derived.by(() => {
		if (isPaid) return { text: 'Paid', class: 'bg-success/10 text-success' };
		if (isSkipped) return { text: 'Skipped', class: 'bg-surface-alt text-muted' };
		if (isPastDue) return { text: 'Past Due', class: 'bg-error/10 text-error' };
		if (isUpcoming) return { text: 'Upcoming', class: 'bg-warning/10 text-warning' };
		return null;
	});
</script>

<a
	href="/w/{workspaceId}/taxes"
	class="block rounded-lg border-2 border-dashed p-3 transition-colors hover:border-overlay {borderClass}"
	data-component="quarterly-payment-marker"
	data-quarter={quarter}
>
	<div class="flex items-start gap-3">
		<!-- Calendar icon -->
		<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
			<iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
		</div>

		<div class="min-w-0 flex-1">
			<!-- Top row: Quarter label + status badge -->
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-fg">Q{quarter} Estimated Tax</span>
				{#if statusBadge}
					<span class="rounded px-1.5 py-0.5 text-xs font-medium {statusBadge?.class}">
						{statusBadge?.text}
					</span>
				{/if}
			</div>

			<!-- Second row: Due date -->
			<time datetime={dueDate} class="block text-xs text-muted">
				Due {dueDateLabel}
			</time>

			<!-- Third row: Amounts -->
			<div class="mt-1">
				{#if isPaid}
					<div class="flex items-center gap-1 text-sm text-success">
						<iconify-icon icon="solar:check-circle-bold" width="14" height="14"></iconify-icon>
						<span>
							Federal {formatCurrency(paidFederalCents ?? 0)} | State {formatCurrency(paidStateCents ?? 0)} | Total {formatCurrency(paidTotal)}
						</span>
					</div>
				{:else if isSkipped}
					<div class="text-sm text-muted">
						Skipped - amount rolled to next quarter
					</div>
				{:else}
					<div class="text-sm text-muted">
						Recommended: {formatCurrency(recommendedTotal)}
						{#if rolloverCents > 0}
							<span class="text-warning"> (includes {formatCurrency(rolloverCents)} from missed)</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-1.5 flex items-center gap-2">
				{#if isPaid}
					<span class="text-xs font-medium text-primary">View Details</span>
				{:else if isSkipped}
					<span class="text-xs text-muted">Amount rolled forward</span>
				{:else if isPastDue}
					<!-- Past due: show both Mark Paid and Skip options -->
					<span class="text-xs font-medium text-primary">Mark Paid</span>
					<span class="text-muted">|</span>
					<form method="POST" action="/w/{workspaceId}/taxes?/skipQuarter" use:enhance class="inline">
						<input type="hidden" name="fiscalYear" value={fiscalYear} />
						<input type="hidden" name="quarter" value={quarter} />
						<button
							type="submit"
							class="cursor-pointer text-xs font-medium text-muted hover:text-fg"
							onclick={(e) => e.stopPropagation()}
						>
							Skip
						</button>
					</form>
				{:else}
					<span class="text-xs font-medium text-primary">Mark Paid</span>
				{/if}
			</div>
		</div>
	</div>
</a>
