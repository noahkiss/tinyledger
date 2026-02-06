<script lang="ts">
	import '../app.scss';
	import OfflineIndicator from '$lib/components/OfflineIndicator.svelte';
	import { initTheme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<OfflineIndicator />
{@render children()}

<!-- Footer with Penny scene -->
<footer class="mt-5" data-component="penny-footer">
	<!-- Daytime image (light mode) -->
	<img
		src="/brand/footer-daytime-mobile.webp"
		alt="TinyLedger - Penny the Hedgehog reading her ledger on a sunny day"
		class="light-only is-block mx-auto"
		style="max-width: 42rem; width: 100%;"
	/>

	<!-- Nighttime image (dark mode) -->
	<img
		src="/brand/footer-nighttime-mobile.webp"
		alt="TinyLedger - Penny the Hedgehog reading her ledger under the stars"
		class="dark-only mx-auto"
		style="max-width: 42rem; width: 100%;"
	/>
</footer>
