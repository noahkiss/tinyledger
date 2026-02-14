<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { clickOutside } from '$lib/actions/clickOutside';
	import DropdownPanel from './DropdownPanel.svelte';
	import MenuOption from './MenuOption.svelte';

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
		<DropdownPanel class="min-w-full">
			{#each availableYears as year}
				<MenuOption
					selected={year === fiscalYear}
					onclick={() => handleSelect(year)}
				>
					<span>{year}</span>
				</MenuOption>
			{/each}
		</DropdownPanel>
	{/if}
</div>
