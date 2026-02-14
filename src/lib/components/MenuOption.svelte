<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		selected = false,
		onclick,
		class: className = '',
		children
	}: {
		selected?: boolean;
		onclick: () => void;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface {selected ? 'text-primary' : 'text-fg'} {className}"
>
	{#if selected}
		<iconify-icon icon="solar:check-circle-bold" class="text-primary flex-shrink-0" width="14" height="14"></iconify-icon>
	{:else}
		<span class="w-3.5 flex-shrink-0"></span>
	{/if}
	{@render children()}
</button>
