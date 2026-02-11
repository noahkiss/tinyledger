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
	class="rounded-lg border border-border bg-input px-3 py-2 text-sm font-medium text-fg shadow-sm hover:bg-surface focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
>
	<option value="monthly">Monthly</option>
	<option value="quarterly">Quarterly</option>
</select>
