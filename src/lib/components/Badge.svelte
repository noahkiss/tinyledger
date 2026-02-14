<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant,
		class: className = '',
		children
	}: {
		variant: 'success' | 'error' | 'warning' | 'muted' | 'primary';
		class?: string;
		children: Snippet;
	} = $props();

	const variantMap = {
		success: 'bg-success/10 text-success',
		error: 'bg-error/10 text-error',
		warning: 'bg-warning/10 text-warning',
		muted: 'bg-surface text-muted',
		primary: 'bg-primary/10 text-primary'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {variantMap[variant]} {className}"
>
	{@render children()}
</span>
