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
					class="block rounded-lg px-4 py-2 text-center transition-colors
					{value === option.value
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					{option.label}
				</span>
			</label>
		{/each}
	</div>

	{#if showCheckNumber}
		<div class="flex items-center gap-2">
			<label for="checkNumber" class="text-sm font-medium text-gray-700">Check #</label>
			<input
				type="text"
				id="checkNumber"
				name="checkNumber"
				bind:value={checkNumber}
				placeholder="Enter check number"
				class="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>
	{/if}
</div>
