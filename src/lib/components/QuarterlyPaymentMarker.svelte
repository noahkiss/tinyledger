<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';

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
		workspaceId: string;
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
		workspaceId
	}: Props = $props();

	// Calculate totals
	let recommendedTotal = $derived(federalRecommendedCents + stateRecommendedCents);
	let paidTotal = $derived((paidFederalCents ?? 0) + (paidStateCents ?? 0));

	// Border and background colors based on status
	let borderClass = $derived(() => {
		if (isPaid) return 'border-green-400 bg-green-50';
		if (isPastDue) return 'border-red-400 bg-red-50';
		if (isUpcoming) return 'border-yellow-400 bg-yellow-50';
		return 'border-gray-300 bg-gray-50';
	});

	// Status badge
	let statusBadge = $derived(() => {
		if (isPaid) return { text: 'Paid', class: 'bg-green-100 text-green-700' };
		if (isPastDue) return { text: 'Past Due', class: 'bg-red-100 text-red-700' };
		if (isUpcoming) return { text: 'Upcoming', class: 'bg-yellow-100 text-yellow-700' };
		return null;
	});
</script>

<a
	href="/w/{workspaceId}/taxes"
	class="block rounded-lg border-2 border-dashed p-3 transition-colors hover:border-gray-400 {borderClass()}"
	data-component="quarterly-payment-marker"
	data-quarter={quarter}
>
	<div class="flex items-start gap-3">
		<!-- Calendar icon -->
		<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
			<iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
		</div>

		<div class="min-w-0 flex-1">
			<!-- Top row: Quarter label + status badge -->
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-gray-700">Q{quarter} Estimated Tax</span>
				{#if statusBadge()}
					<span class="rounded px-1.5 py-0.5 text-xs font-medium {statusBadge()?.class}">
						{statusBadge()?.text}
					</span>
				{/if}
			</div>

			<!-- Second row: Due date -->
			<time datetime={dueDate} class="block text-xs text-gray-500">
				Due {dueDateLabel}
			</time>

			<!-- Third row: Amounts -->
			<div class="mt-1">
				{#if isPaid}
					<div class="flex items-center gap-1 text-sm text-green-700">
						<iconify-icon icon="solar:check-circle-bold" width="14" height="14"></iconify-icon>
						<span>
							Federal {formatCurrency(paidFederalCents ?? 0)} | State {formatCurrency(paidStateCents ?? 0)} | Total {formatCurrency(paidTotal)}
						</span>
					</div>
				{:else}
					<div class="text-sm text-gray-600">
						Recommended: Federal {formatCurrency(federalRecommendedCents)} + State {formatCurrency(stateRecommendedCents)} = {formatCurrency(recommendedTotal)}
					</div>
				{/if}
			</div>

			<!-- Link text -->
			<div class="mt-1.5">
				<span class="text-xs font-medium text-blue-600 hover:text-blue-700">
					{#if isPaid}
						View Details
					{:else}
						Mark Paid
					{/if}
				</span>
			</div>
		</div>
	</div>
</a>
