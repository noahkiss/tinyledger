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
<footer class="relative mt-8" data-component="penny-footer">
	<!-- Fade gradient overlay at top -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg to-transparent"
	></div>

	<!-- Daytime image (light mode) -->
	<img
		src="/brand/footer-daytime.png"
		alt="Penny the Hedgehog reading her ledger on a sunny day"
		class="mx-auto w-full max-w-2xl dark:hidden"
	/>

	<!-- Nighttime image (dark mode) -->
	<img
		src="/brand/footer-nighttime.png"
		alt="Penny the Hedgehog reading her ledger under the stars"
		class="mx-auto hidden w-full max-w-2xl dark:block"
	/>
</footer>
