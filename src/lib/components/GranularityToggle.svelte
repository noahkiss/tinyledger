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

<div class="field">
	<div class="control">
		<div class="select is-small">
			<select
				value={granularity}
				onchange={handleChange}
			>
				<option value="monthly">Monthly</option>
				<option value="quarterly">Quarterly</option>
			</select>
		</div>
	</div>
</div>
