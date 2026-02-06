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

<div class="dropdown" class:is-active={isOpen} data-component="fiscal-year-picker">
	<!-- Trigger button -->
	<div class="dropdown-trigger">
		<button
			type="button"
			onclick={toggleDropdown}
			class="button is-small"
			aria-haspopup="true"
			aria-controls="fy-dropdown-menu"
		>
			<span class="icon is-small" style="color: var(--color-muted)">
				<iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
			</span>
			<span>{formatYear(fiscalYear)}</span>
			<span class="icon is-small" style="color: var(--color-muted)">
				<iconify-icon
					icon="solar:alt-arrow-down-linear"
					class="chevron-icon {isOpen ? 'is-rotated' : ''}"
					width="14"
					height="14"
				></iconify-icon>
			</span>
		</button>
	</div>

	<div class="dropdown-menu" id="fy-dropdown-menu" role="menu">
		<div class="dropdown-content">
			{#each availableYears as year}
				<a
					href="#!"
					class="dropdown-item {year === fiscalYear ? 'is-active' : ''}"
					role="menuitem"
					onclick={(e) => { e.preventDefault(); handleSelect(year); }}
				>
					{#if year === fiscalYear}
						<span class="icon is-small mr-2" style="color: var(--color-primary)">
							<iconify-icon icon="solar:check-circle-bold" width="14" height="14"></iconify-icon>
						</span>
					{:else}
						<span class="icon is-small mr-2"></span>
					{/if}
					<span>{formatYear(year)}</span>
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	.dropdown-item {
		display: flex;
		align-items: center;
	}
	.chevron-icon.is-rotated {
		transform: rotate(180deg);
	}
	.chevron-icon {
		transition: transform 0.2s;
	}
</style>
