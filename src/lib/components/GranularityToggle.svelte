<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Select from '$lib/components/Select.svelte';

	let { granularity }: { granularity: 'monthly' | 'quarterly' } = $props();

	const options = [
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'quarterly', label: 'Quarterly' }
	];

	function handleChange(val: string | number) {
		const url = new URL($page.url);
		url.searchParams.set('granularity', String(val));
		goto(url.toString(), { replaceState: true, noScroll: true });
	}
</script>

<Select value={granularity} {options} onchange={handleChange} size="sm" />
