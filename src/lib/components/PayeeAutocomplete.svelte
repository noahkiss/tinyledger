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

<div class="dropdown autocomplete-dropdown" class:is-active={showDropdown && filteredPayees.length > 0}>
	<div class="dropdown-trigger autocomplete-trigger">
		<div class="control">
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
				class="input"
			/>
		</div>
	</div>

	{#if showDropdown && filteredPayees.length > 0}
		<div class="dropdown-menu" role="menu">
			<div class="dropdown-content">
				{#each filteredPayees as payee, i (payee.payee)}
					<a
						href="#!"
						class="dropdown-item"
						class:is-active={i === highlightedIndex}
						role="menuitem"
						onmousedown={() => handleSelect(payee)}
					>
						<p class="has-text-weight-medium">{payee.payee}</p>
						<p class="payee-meta is-size-7">
							<span>Used {payee.count} time{payee.count === 1 ? '' : 's'}</span>
							<span class="separator">|</span>
							<span>Last: {formatAmount(payee.lastAmount)}</span>
							<span class="tag is-rounded ml-2 {payee.lastType === 'income' ? 'is-success is-light' : 'is-danger is-light'}">
								{payee.lastType}
							</span>
						</p>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.autocomplete-dropdown {
		display: block;
		width: 100%;
	}
	.autocomplete-trigger {
		width: 100%;
	}
	.autocomplete-dropdown :global(.dropdown-menu) {
		width: 100%;
	}
	.payee-meta {
		color: var(--color-muted);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.separator {
		color: var(--color-muted);
	}
</style>
