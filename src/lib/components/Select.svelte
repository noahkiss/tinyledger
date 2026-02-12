<script lang="ts">
	import { clickOutside } from '$lib/actions/clickOutside';

	type Option = {
		value: string | number;
		label: string;
	};

	let {
		value = $bindable(),
		options,
		onchange,
		name,
		id,
		placeholder = 'Select...',
		size = 'md',
		required = false
	}: {
		value?: string | number | null;
		options: Option[];
		onchange?: (value: string | number) => void;
		name?: string;
		id?: string;
		placeholder?: string;
		size?: 'sm' | 'md';
		required?: boolean;
	} = $props();

	let isOpen = $state(false);

	function handleSelect(optionValue: string | number) {
		if (optionValue === value) {
			isOpen = false;
			return;
		}
		value = optionValue;
		onchange?.(optionValue);
		isOpen = false;
	}

	const selectedLabel = $derived(options.find((o) => String(o.value) === String(value))?.label ?? placeholder);
	const hasValue = $derived(options.some((o) => String(o.value) === String(value)));

	const triggerClasses = $derived(
		size === 'sm'
			? 'px-3 py-2 text-sm'
			: 'px-4 py-3 text-sm'
	);
</script>

<div class="relative" use:clickOutside={() => { isOpen = false; }}>
	{#if name}
		<input type="hidden" {name} {id} value={value ?? ''} {required} />
	{/if}

	<button
		type="button"
		onclick={() => { isOpen = !isOpen; }}
		class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input-border bg-input font-medium text-fg shadow-sm hover:bg-surface focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors {triggerClasses}"
	>
		<span class={hasValue ? 'text-fg' : 'text-muted'}>{selectedLabel}</span>
		<iconify-icon
			icon="solar:alt-arrow-down-linear"
			class="text-muted transition-transform flex-shrink-0 {isOpen ? 'rotate-180' : ''}"
			width="14"
			height="14"
		></iconify-icon>
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg"
		>
			{#each options as option}
				<button
					type="button"
					onclick={() => handleSelect(option.value)}
					class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface {String(option.value) === String(value)
						? 'text-primary'
						: 'text-fg'}"
				>
					{#if String(option.value) === String(value)}
						<iconify-icon icon="solar:check-circle-bold" class="text-primary flex-shrink-0" width="14" height="14"></iconify-icon>
					{:else}
						<span class="w-3.5 flex-shrink-0"></span>
					{/if}
					<span>{option.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
