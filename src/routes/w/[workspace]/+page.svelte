<script lang="ts">
	// This page redirects to /transactions in +page.server.ts
	// This component is a fallback if redirect doesn't happen (e.g., JS disabled)
</script>

<svelte:head>
	<title>Redirecting... - TinyLedger</title>
</svelte:head>

<div class="has-text-centered redirect-page">
	<p style="color: var(--color-muted)">Redirecting to transactions...</p>
</div>

<style>
	.redirect-page {
		padding: 2rem 0;
	}
</style>
