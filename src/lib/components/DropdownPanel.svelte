<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		class: className = '',
		children
	}: {
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class="absolute left-0 top-full z-50 mt-1 max-h-[min(15rem,50vh)] overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg {className}"
>
	{@render children()}
</div>
