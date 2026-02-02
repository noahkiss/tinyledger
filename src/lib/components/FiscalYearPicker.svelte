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
	class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
	data-component="fiscal-year-picker"
>
	{#each availableYears as year}
		<option value={year}>{formatFiscalYear(year, startMonth)}</option>
	{/each}
</select>
