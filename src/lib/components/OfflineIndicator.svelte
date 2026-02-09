<script lang="ts">
	let online = $state(true);

	$effect(() => {
		const handleOnline = () => (online = true);
		const handleOffline = () => (online = false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		online = navigator.onLine;

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

{#if !online}
	<div
		class="fixed top-0 left-0 right-0 z-50 bg-warning/10 text-warning px-4 py-2 text-center text-sm font-medium"
		role="alert"
	>
		You're offline - connect to continue
	</div>
{/if}
