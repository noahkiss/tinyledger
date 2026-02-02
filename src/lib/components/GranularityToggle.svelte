<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { granularity }: { granularity: 'monthly' | 'quarterly' } = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const url = new URL($page.url);
		url.searchParams.set('granularity', target.value);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}
</script>

<select
	value={granularity}
	onchange={handleChange}
	class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
>
	<option value="monthly">Monthly</option>
	<option value="quarterly">Quarterly</option>
</select>
