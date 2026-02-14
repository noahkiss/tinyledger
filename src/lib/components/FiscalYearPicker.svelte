<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { clickOutside } from '$lib/actions/clickOutside';

	let {
		fiscalYear,
		availableYears
	}: {
		fiscalYear: number;
		availableYears: number[];
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
</script>

<div class="relative" data-component="fiscal-year-picker" use:clickOutside={() => { isOpen = false; }}>
	<!-- Trigger button -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="flex h-full cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-fg hover:bg-surface transition-colors"
	>
		<iconify-icon icon="solar:calendar-bold" width="20" height="20" class="text-muted"></iconify-icon>
		<div class="text-left">
			<div class="flex items-center gap-1">
				<span class="text-xs font-medium text-muted">FY</span>
				<iconify-icon
					icon="solar:alt-arrow-down-linear"
					class="text-muted transition-transform {isOpen ? 'rotate-180' : ''}"
					width="12"
					height="12"
				></iconify-icon>
			</div>
			<div class="font-semibold leading-tight">{fiscalYear}</div>
		</div>
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
					<span>{year}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
