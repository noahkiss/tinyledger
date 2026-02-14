<script lang="ts">
	import '@fontsource-variable/inter';
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
