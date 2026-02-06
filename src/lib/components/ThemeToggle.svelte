<script lang="ts">
	import { themePreference, resolvedTheme } from '$lib/stores/theme';

	function toggleTheme() {
		const current = $resolvedTheme;
		themePreference.set(current === 'dark' ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	onclick={toggleTheme}
	class="button theme-toggle-btn"
	title="Toggle theme"
	data-component="theme-toggle"
>
	<span class="icon">
		{#if $resolvedTheme === 'dark'}
			<iconify-icon icon="solar:sun-bold" width="20" height="20"></iconify-icon>
		{:else}
			<iconify-icon icon="solar:moon-bold" width="20" height="20"></iconify-icon>
		{/if}
	</span>
</button>

<style>
	.theme-toggle-btn {
		background: transparent;
		border: none;
		color: var(--color-muted);
		border-radius: 0.5rem;
		padding: 0.5rem;
	}
	.theme-toggle-btn:hover {
		background-color: var(--color-surface);
		color: var(--color-foreground);
	}
</style>
