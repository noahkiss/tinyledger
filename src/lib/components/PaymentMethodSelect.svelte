<script lang="ts">
	type PaymentMethod = 'cash' | 'card' | 'check';

	let {
		value = $bindable<PaymentMethod>('cash'),
		checkNumber = $bindable(''),
		name = 'paymentMethod'
	}: {
		value?: PaymentMethod;
		checkNumber?: string;
		name?: string;
	} = $props();

	// Show check number field only when check is selected
	let showCheckNumber = $derived(value === 'check');

	const options: { value: PaymentMethod; label: string }[] = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'card', label: 'Card' },
		{ value: 'check', label: 'Check' }
	];

	function selectMethod(method: PaymentMethod) {
		value = method;
		// Clear check number when switching away from check
		if (method !== 'check') {
			checkNumber = '';
		}
	}
</script>

<div class="space-y-3">
	<div class="flex gap-2">
		{#each options as option}
			<label class="flex-1 cursor-pointer">
				<input
					type="radio"
					{name}
					value={option.value}
					checked={value === option.value}
					onchange={() => selectMethod(option.value)}
					class="sr-only"
				/>
				<span
					class="block rounded-md px-4 py-2 text-center transition-colors
					{value === option.value
						? 'bg-primary text-white'
						: 'bg-surface text-fg hover:bg-surface-alt'}"
				>
					{option.label}
				</span>
			</label>
		{/each}
	</div>

	{#if showCheckNumber}
		<div class="flex items-center gap-2">
			<label for="checkNumber" class="text-sm font-medium text-fg">Check #</label>
			<input
				type="text"
				id="checkNumber"
				name="checkNumber"
				bind:value={checkNumber}
				placeholder="Enter check number"
				class="flex-1 rounded-md border border-input-border bg-input px-3 py-2 focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
			/>
		</div>
	{/if}
</div>
