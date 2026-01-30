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

<div class="flex flex-col gap-3 py-3">
	<!-- First row: Type filter + Payee search + Count -->
	<div class="flex items-center gap-3">
		<!-- Type segmented buttons -->
		<div class="flex rounded-lg border border-gray-200 bg-white">
			<button
				type="button"
				class="px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg
					{currentFilters.type === '' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => handleTypeChange('')}
			>
				All
			</button>
			<button
				type="button"
				class="border-l border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors
					{currentFilters.type === 'income' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => handleTypeChange('income')}
			>
				Income
			</button>
			<button
				type="button"
				class="border-l border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors last:rounded-r-lg
					{currentFilters.type === 'expense' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => handleTypeChange('expense')}
			>
				Expense
			</button>
		</div>

		<!-- Payee search -->
		<div class="relative flex-1">
			<svg
				class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<input
				type="text"
				placeholder="Search payee..."
				value={payeeInput}
				oninput={handlePayeeInput}
				class="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<!-- Filter count -->
		<div class="text-sm text-gray-500">
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
				class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50
					{currentFilters.tags.length > 0 ? 'border-blue-500 text-blue-600' : 'text-gray-600'}"
				onclick={() => (showTagDropdown = !showTagDropdown)}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
					/>
				</svg>
				{getSelectedTagNames()}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if showTagDropdown}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="fixed inset-0 z-10" onclick={() => (showTagDropdown = false)}></div>
				<div
					class="absolute left-0 top-full z-20 mt-1 max-h-64 w-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
				>
					{#if availableTags.length === 0}
						<div class="px-3 py-2 text-sm text-gray-500">No tags available</div>
					{:else}
						{#each availableTags as tag}
							<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50">
								<input
									type="checkbox"
									checked={currentFilters.tags.includes(tag.id)}
									onchange={() => handleTagToggle(tag.id)}
									class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span class="text-sm text-gray-700">{tag.name}</span>
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
				class="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
			<span class="text-gray-400">-</span>
			<input
				type="date"
				value={currentFilters.to}
				onchange={handleToChange}
				class="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<!-- Payment method -->
		<select
			value={currentFilters.method}
			onchange={handleMethodChange}
			class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
				{currentFilters.method ? 'border-blue-500 text-blue-600' : 'text-gray-600'}"
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
				class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
				Clear
			</button>
		{/if}
	</div>
</div>
