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

	// Initialize display value from props
	$effect(() => {
		// Only update display if it doesn't match current value
		// This prevents overwriting user input during typing
		const currentCents = parseToCents(displayValue);
		if (currentCents !== value) {
			displayValue = formatForDisplay(value);
		}
	});

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		displayValue = input.value;
	}

	function handleBlur() {
		// Parse and reformat on blur
		value = parseToCents(displayValue);
		displayValue = formatForDisplay(value);
	}

	function handleFocus(event: Event) {
		const input = event.target as HTMLInputElement;
		// Select all on focus for easy replacement
		input.select();
	}
</script>

<div class="relative">
	<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
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
		class="rounded-lg border border-gray-300 px-3 py-2 pl-7 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {className}"
		placeholder="0.00"
	/>
	<!-- Hidden input for form submission with cents value -->
	<input type="hidden" name="{name}_cents" value={value} />
</div>
