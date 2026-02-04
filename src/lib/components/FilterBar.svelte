<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Tag } from '$lib/server/db/schema';

	let {
		currentFilters,
		availableTags = [],
		filteredCount,
		totalCount
	}: {
		currentFilters: {
			fy: number;
			payee: string;
			tags: number[];
			from: string;
			to: string;
			type: string;
			method: string;
		};
		availableTags: Tag[];
		filteredCount: number;
		totalCount: number;
	} = $props();

	// Local state for debounced payee input
	let payeeInput = $state(currentFilters.payee);
	let payeeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	// State for tag dropdown
	let showTagDropdown = $state(false);

	// Check if any filters are active (besides fiscal year)
	let hasActiveFilters = $derived(
		currentFilters.payee ||
			currentFilters.tags.length > 0 ||
			currentFilters.from ||
			currentFilters.to ||
			currentFilters.type ||
			currentFilters.method
	);

	function updateURL(key: string, value: string | string[] | null) {
		const url = new URL($page.url);

		if (Array.isArray(value)) {
			url.searchParams.delete(key);
			value.forEach((v) => url.searchParams.append(key, v));
		} else if (value === null || value === '') {
			url.searchParams.delete(key);
		} else {
			url.searchParams.set(key, value);
		}

		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function handlePayeeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		payeeInput = target.value;

		if (payeeDebounceTimer) clearTimeout(payeeDebounceTimer);
		payeeDebounceTimer = setTimeout(() => {
			updateURL('payee', payeeInput);
		}, 300);
	}

	function handleTypeChange(type: string) {
		updateURL('type', type);
	}

	function handleMethodChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		updateURL('method', target.value);
	}

	function handleTagToggle(tagId: number) {
		const currentTags = [...currentFilters.tags];
		const index = currentTags.indexOf(tagId);

		if (index === -1) {
			currentTags.push(tagId);
		} else {
			currentTags.splice(index, 1);
		}

		updateURL(
			'tag',
			currentTags.map(String)
		);
	}

	function handleFromChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateURL('from', target.value);
	}

	function handleToChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateURL('to', target.value);
	}

	function clearAllFilters() {
		const url = new URL($page.url);
		// Keep only fy param
		const fy = url.searchParams.get('fy');
		url.search = '';
		if (fy) url.searchParams.set('fy', fy);
		payeeInput = '';
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	// Get tag names for selected tags
	function getSelectedTagNames(): string {
		if (currentFilters.tags.length === 0) return 'Tags';
		const names = currentFilters.tags
			.map((id) => availableTags.find((t) => t.id === id)?.name)
			.filter(Boolean);
		if (names.length === 1) return names[0] as string;
		return `${names.length} tags`;
	}
</script>

<div class="flex flex-col gap-3 py-3" data-component="filter-bar">
	<!-- First row: Type filter + Payee search + Count -->
	<div class="flex items-center gap-3">
		<!-- Type segmented buttons -->
		<div class="flex rounded-lg border border-border bg-card">
			<button
				type="button"
				class="cursor-pointer px-3 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg
					{currentFilters.type === '' ? 'bg-primary text-white' : 'text-muted hover:bg-surface'}"
				onclick={() => handleTypeChange('')}
			>
				All
			</button>
			<button
				type="button"
				class="cursor-pointer border-l border-border px-3 py-2 text-sm font-medium transition-colors
					{currentFilters.type === 'income' ? 'bg-success text-white' : 'text-muted hover:bg-surface'}"
				onclick={() => handleTypeChange('income')}
			>
				Income
			</button>
			<button
				type="button"
				class="cursor-pointer border-l border-border px-3 py-2 text-sm font-medium transition-colors last:rounded-r-lg
					{currentFilters.type === 'expense' ? 'bg-error text-white' : 'text-muted hover:bg-surface'}"
				onclick={() => handleTypeChange('expense')}
			>
				Expense
			</button>
		</div>

		<!-- Payee search -->
		<div class="relative flex-1">
			<iconify-icon
				icon="solar:magnifer-linear"
				class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
				width="16"
				height="16"
			></iconify-icon>
			<input
				type="text"
				placeholder="Search payee..."
				value={payeeInput}
				oninput={handlePayeeInput}
				class="w-full rounded-lg border border-input-border bg-input py-2 pl-9 pr-3 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
			/>
		</div>

		<!-- Filter count -->
		<div class="text-sm text-muted">
			{filteredCount === totalCount
				? `${totalCount} transactions`
				: `${filteredCount} of ${totalCount}`}
		</div>
	</div>

	<!-- Second row: Additional filters -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Tags dropdown -->
		<div class="relative">
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-surface
					{currentFilters.tags.length > 0 ? 'border-primary text-primary' : 'border-border text-muted'}"
				onclick={() => (showTagDropdown = !showTagDropdown)}
			>
				<iconify-icon icon="solar:tag-bold" width="16" height="16"></iconify-icon>
				{getSelectedTagNames()}
				<iconify-icon icon="solar:alt-arrow-down-linear" width="16" height="16"></iconify-icon>
			</button>

			{#if showTagDropdown}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="fixed inset-0 z-10" onclick={() => (showTagDropdown = false)}></div>
				<div
					class="absolute left-0 top-full z-20 mt-1 max-h-64 w-48 overflow-auto rounded-lg border border-border bg-card shadow-lg"
				>
					{#if availableTags.length === 0}
						<div class="px-3 py-2 text-sm text-muted">No tags available</div>
					{:else}
						{#each availableTags as tag}
							<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface">
								<input
									type="checkbox"
									checked={currentFilters.tags.includes(tag.id)}
									onchange={() => handleTagToggle(tag.id)}
									class="rounded border-border text-primary focus:ring-primary"
								/>
								<span class="text-sm text-fg">{tag.name}</span>
							</label>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Date range -->
		<div class="flex items-center gap-1">
			<input
				type="date"
				value={currentFilters.from}
				onchange={handleFromChange}
				class="rounded-lg border border-input-border bg-input px-2 py-2 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
			/>
			<span class="text-muted">-</span>
			<input
				type="date"
				value={currentFilters.to}
				onchange={handleToChange}
				class="rounded-lg border border-input-border bg-input px-2 py-2 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus"
			/>
		</div>

		<!-- Payment method -->
		<select
			value={currentFilters.method}
			onchange={handleMethodChange}
			class="cursor-pointer rounded-lg border bg-input px-3 py-2 text-sm focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-input-focus
				{currentFilters.method ? 'border-primary text-primary' : 'border-input-border text-muted'}"
		>
			<option value="">All Methods</option>
			<option value="cash">Cash</option>
			<option value="card">Card</option>
			<option value="check">Check</option>
		</select>

		<!-- Clear filters -->
		{#if hasActiveFilters}
			<button
				type="button"
				onclick={clearAllFilters}
				class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
			>
				<iconify-icon icon="solar:close-circle-linear" width="16" height="16"></iconify-icon>
				Clear
			</button>
		{/if}
	</div>
</div>
