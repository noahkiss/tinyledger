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

<div class="field">
	<div class="buttons has-addons mb-3">
		{#each options as option}
			<button
				type="button"
				class="button {value === option.value ? 'is-primary is-selected' : ''}"
				onclick={() => selectMethod(option.value)}
			>
				{option.label}
			</button>
			<input
				type="radio"
				{name}
				value={option.value}
				checked={value === option.value}
				onchange={() => selectMethod(option.value)}
				class="is-hidden"
			/>
		{/each}
	</div>

	{#if showCheckNumber}
		<div class="field is-horizontal">
			<div class="field-label is-small">
				<label for="checkNumber" class="label">Check #</label>
			</div>
			<div class="field-body">
				<div class="field">
					<div class="control">
						<input
							type="text"
							id="checkNumber"
							name="checkNumber"
							bind:value={checkNumber}
							placeholder="Enter check number"
							class="input is-small"
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
