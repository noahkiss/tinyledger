<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatFiscalYear } from '$lib/utils/fiscal-year';

	let {
		fiscalYear,
		availableYears,
		startMonth = 1
	}: {
		fiscalYear: number;
		availableYears: number[];
		startMonth?: number;
	} = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const newFY = target.value;
		const url = new URL($page.url);
		url.searchParams.set('fy', newFY);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}
</script>

<select
	value={fiscalYear}
	onchange={handleChange}
	class="rounded-lg border border-border bg-input px-3 py-2 text-sm font-medium text-fg shadow-sm hover:bg-surface focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-primary"
	data-component="fiscal-year-picker"
>
	{#each availableYears as year}
		<option value={year}>{formatFiscalYear(year, startMonth)}</option>
	{/each}
</select>
