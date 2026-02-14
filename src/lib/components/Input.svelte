<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		class: className = '',
		inputSize = 'md',
		value = $bindable(),
		...rest
	}: Omit<HTMLInputAttributes, 'size'> & {
		inputSize?: 'sm' | 'md' | 'lg';
		value?: HTMLInputAttributes['value'];
	} = $props();

	const sizeMap = {
		sm: 'px-2 py-1.5 text-sm',
		md: 'px-3 py-2 text-sm',
		lg: 'px-4 py-3'
	};
</script>

<input
	class="rounded-md border border-input-border bg-input text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50 {sizeMap[inputSize]} {className}"
	bind:value
	{...rest}
/>
