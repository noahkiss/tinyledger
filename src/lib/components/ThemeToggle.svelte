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
	class="rounded-md p-2 text-muted hover:bg-surface hover:text-fg"
	title="Toggle theme"
	data-component="theme-toggle"
>
	{#if $resolvedTheme === 'dark'}
		<iconify-icon icon="solar:sun-bold" width="20" height="20"></iconify-icon>
	{:else}
		<iconify-icon icon="solar:moon-bold" width="20" height="20"></iconify-icon>
	{/if}
</button>
