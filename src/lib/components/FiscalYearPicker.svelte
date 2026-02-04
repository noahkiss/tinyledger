<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';

	let {
		fiscalYear,
		availableYears,
		startMonth = 1,
		compact = false
	}: {
		fiscalYear: number;
		availableYears: number[];
		startMonth?: number;
		compact?: boolean;
	} = $props();

	let isOpen = $state(false);

	function handleSelect(year: number) {
		if (year === fiscalYear) {
			isOpen = false;
			return;
		}

		const url = new URL($page.url);
		url.searchParams.set('fy', String(year));
		goto(url.toString(), { replaceState: true, noScroll: true });
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('[data-component="fiscal-year-picker"]')) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	// Compact format always shows just "FY YYYY"
	function formatYear(year: number): string {
		if (compact) {
			return `FY ${year}`;
		}
		return formatFiscalYear(year, startMonth);
	}
</script>

<div class="relative" data-component="fiscal-year-picker">
	<!-- Trigger button -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface transition-colors"
	>
		<iconify-icon icon="solar:calendar-bold" width="16" height="16" class="text-muted"></iconify-icon>
		<span>{formatYear(fiscalYear)}</span>
		<iconify-icon
			icon="solar:alt-arrow-down-linear"
			class="text-muted transition-transform {isOpen ? 'rotate-180' : ''}"
			width="14"
			height="14"
		></iconify-icon>
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 top-full z-50 mt-1 min-w-full rounded-lg border border-border bg-card py-1 shadow-lg"
		>
			{#each availableYears as year}
				<button
					type="button"
					onclick={() => handleSelect(year)}
					class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface {year === fiscalYear
						? 'text-primary'
						: 'text-fg'}"
				>
					{#if year === fiscalYear}
						<iconify-icon icon="solar:check-circle-bold" class="text-primary" width="14" height="14"></iconify-icon>
					{:else}
						<span class="w-3.5"></span>
					{/if}
					<span>{formatYear(year)}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
