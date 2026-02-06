<script lang="ts">
	import { dollarsToCents, centsToDollars } from '$lib/utils/currency';

	let {
		value = $bindable(0),
		name = 'amount',
		id = 'amount',
		required = false,
		class: className = ''
	}: {
		value?: number;
		name?: string;
		id?: string;
		required?: boolean;
		class?: string;
	} = $props();

	// Display value (formatted string)
	let displayValue = $state('');
	// Track if user is actively typing (input is focused)
	let isFocused = $state(false);

	// Format cents to display string
	function formatForDisplay(cents: number): string {
		const dollars = centsToDollars(cents);
		return dollars.toFixed(2);
	}

	// Parse display string to cents
	function parseToCents(input: string): number {
		// Remove all non-numeric except decimal
		const cleaned = input.replace(/[^\d.]/g, '');
		const dollars = parseFloat(cleaned) || 0;
		return dollarsToCents(dollars);
	}

	// Initialize display value from props - only when not focused
	$effect(() => {
		// Skip if user is typing - don't overwrite their input
		if (isFocused) return;

		// Only update display if it doesn't match current value
		const currentCents = parseToCents(displayValue);
		if (currentCents !== value) {
			displayValue = formatForDisplay(value);
		}
	});

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		displayValue = input.value;
		// Update bound value as user types for real-time validation
		value = parseToCents(displayValue);
	}

	function handleBlur() {
		isFocused = false;
		// Parse and reformat on blur
		value = parseToCents(displayValue);
		displayValue = formatForDisplay(value);
	}

	function handleFocus(event: Event) {
		isFocused = true;
		const input = event.target as HTMLInputElement;
		// Select all on focus for easy replacement
		input.select();
	}
</script>

<div class="field">
	<div class="control has-icons-left">
		<input
			type="text"
			inputmode="decimal"
			{id}
			{name}
			{required}
			value={displayValue}
			oninput={handleInput}
			onblur={handleBlur}
			onfocus={handleFocus}
			class="input {className}"
			placeholder="0.00"
		/>
		<span class="icon is-small is-left dollar-sign">$</span>
	</div>
	<!-- Hidden input for form submission with cents value -->
	<input type="hidden" name="{name}_cents" value={value} />
</div>

<style>
	.dollar-sign {
		color: var(--color-muted);
		pointer-events: none;
	}
</style>
