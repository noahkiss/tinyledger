<script lang="ts">
	import '../app.css';
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
<footer class="mt-8" data-component="penny-footer">
	<!-- Daytime image (light mode) -->
	<img
		src="/brand/footer-daytime-mobile.png"
		alt="TinyLedger - Penny the Hedgehog reading her ledger on a sunny day"
		class="mx-auto w-full max-w-2xl dark:hidden"
	/>

	<!-- Nighttime image (dark mode) -->
	<img
		src="/brand/footer-nighttime-mobile.png"
		alt="TinyLedger - Penny the Hedgehog reading her ledger under the stars"
		class="mx-auto hidden w-full max-w-2xl dark:block"
	/>
</footer>
