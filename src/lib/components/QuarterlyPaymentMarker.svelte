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
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
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
						<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
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
