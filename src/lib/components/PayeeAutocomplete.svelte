<script lang="ts">
	import createFuzzySearch from '@nozbe/microfuzz';
	
	type PayeeHistory = {
		payee: string;
		count: number;
		lastAmount: number;
		lastType: 'income' | 'expense';
		lastTags: { id: number; name: string; percentage: number }[];
	};

	let {
		payees = [],
		value = $bindable(''),
		onSelect,
		placeholder = 'Enter payee name...'
	}: {
		payees: PayeeHistory[];
		value?: string;
		onSelect?: (payee: PayeeHistory) => void;
		placeholder?: string;
	} = $props();

	let showDropdown = $state(false);
	let highlightedIndex = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);

	// Create fuzzy search function from payees list
	const fuzzySearch = $derived(createFuzzySearch(payees, { key: 'payee' }));

	// Filter results based on input value
	let filteredPayees = $derived(
		value.trim() ? fuzzySearch(value).map((r) => r.item).slice(0, 8) : payees.slice(0, 8)
	);

	// Reset highlighted index when filtered list changes
	$effect(() => {
		if (filteredPayees.length > 0 && highlightedIndex >= filteredPayees.length) {
			highlightedIndex = Math.max(0, filteredPayees.length - 1);
		}
	});

	function handleSelect(payee: PayeeHistory) {
		value = payee.payee;
		showDropdown = false;
		onSelect?.(payee);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showDropdown || filteredPayees.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredPayees.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (filteredPayees[highlightedIndex]) {
					handleSelect(filteredPayees[highlightedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				showDropdown = false;
				break;
		}
	}

	function handleFocus() {
		showDropdown = true;
		highlightedIndex = 0;
	}

	function handleBlur() {
		// Delay to allow click events on dropdown items to fire first
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}

	// Format amount for display
	function formatAmount(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
</script>

<div class="relative">
	<input
		type="text"
		bind:this={inputRef}
		bind:value
		name="payee"
		required
		{placeholder}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		autocomplete="off"
		role="combobox"
		aria-autocomplete="list"
		aria-expanded={showDropdown && filteredPayees.length > 0}
		aria-controls="payee-listbox"
		aria-activedescendant={showDropdown && filteredPayees.length > 0 ? `payee-option-${highlightedIndex}` : undefined}
		class="w-full rounded-md border border-input-border bg-input px-3 py-2 focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
	/>

	{#if showDropdown && filteredPayees.length > 0}
		<ul
			class="absolute z-10 mt-1 w-full max-h-[min(15rem,50vh)] overflow-auto rounded-lg border border-border bg-card shadow-lg"
			role="listbox"
			id="payee-listbox"
		>
			{#each filteredPayees as payee, i (payee.payee)}
				<li
					id="payee-option-{i}"
					role="option"
					aria-selected={i === highlightedIndex}
				>
					<button
						type="button"
						class="w-full px-3 py-2 text-left hover:bg-surface"
						class:bg-surface={i === highlightedIndex}
						onmousedown={() => handleSelect(payee)}
					>
						<div class="font-medium text-fg">{payee.payee}</div>
						<div class="flex items-center gap-2 text-sm text-muted">
							<span>Used {payee.count} time{payee.count === 1 ? '' : 's'}</span>
							<span class="text-muted">|</span>
							<span>Last: {formatAmount(payee.lastAmount)}</span>
							<span
								class="inline-block rounded-full px-2 py-0.5 text-xs {payee.lastType === 'income'
									? 'bg-success/10 text-success'
									: 'bg-error/10 text-error'}"
							>
								{payee.lastType}
							</span>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
