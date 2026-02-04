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

<!-- Footer with Penny -->
<footer class="pb-8 pt-12" data-component="penny-footer">
	<div class="flex justify-center">
		<img
			src="/brand/mascot-sitting-transparent.png"
			alt="Penny the Hedgehog"
			class="w-64 opacity-60 transition-opacity hover:opacity-80 md:w-96"
		/>
	</div>
</footer>
