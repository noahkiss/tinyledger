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
	<div class="notification is-warning offline-banner">
		You're offline - connect to continue
	</div>
{/if}

<style>
	.offline-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		border-radius: 0;
		padding: 0.5rem 1rem;
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
	}
</style>
