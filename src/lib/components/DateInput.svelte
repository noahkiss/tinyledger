<script lang="ts">
	let {
		value = $bindable(''),
		name = 'date',
		id = 'date',
		required = false,
		class: className = ''
	}: {
		value?: string;
		name?: string;
		id?: string;
		required?: boolean;
		class?: string;
	} = $props();

	// Warning for dates > 1 year in future
	let showFutureWarning = $derived.by(() => {
		if (!value) return false;
		const inputDate = new Date(value);
		if (isNaN(inputDate.getTime())) return false;
		const oneYearFromNow = new Date();
		oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
		return inputDate > oneYearFromNow;
	});

	// Parse flexible date formats to ISO YYYY-MM-DD
	function parseFlexibleDate(input: string): string | null {
		const trimmed = input.trim();
		if (!trimmed) return null;

		// Already ISO format YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			return trimmed;
		}

		// Try MM/DD/YYYY or M/D/YYYY
		const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (slashMatch) {
			const [, month, day, year] = slashMatch;
			return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
		}

		// Try MMDDYYYY (8 digits, no slashes)
		const noSlashMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
		if (noSlashMatch) {
			const [, month, day, year] = noSlashMatch;
			return `${year}-${month}-${day}`;
		}

		return null;
	}

	// Validate that a parsed date is a real date
	function isValidDate(dateStr: string): boolean {
		const [year, month, day] = dateStr.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return (
			date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
		);
	}

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		value = input.value;
	}

	function handleBlur(event: Event) {
		const input = event.target as HTMLInputElement;
		const inputValue = input.value;

		// Try to parse flexible formats
		const parsed = parseFlexibleDate(inputValue);
		if (parsed && isValidDate(parsed)) {
			value = parsed;
			input.value = parsed;
		}
	}
</script>

<div>
	<input
		type="date"
		{id}
		{name}
		{required}
		{value}
		oninput={handleInput}
		onblur={handleBlur}
		class="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {className}"
	/>
	{#if showFutureWarning}
		<p class="mt-1 text-sm text-amber-600">Warning: This date is more than 1 year in the future</p>
	{/if}
</div>
