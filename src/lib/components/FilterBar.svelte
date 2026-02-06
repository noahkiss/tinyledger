<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Tag } from '$lib/server/db/schema';

	let {
		currentFilters,
		availableTags = [],
		filteredCount,
		totalCount,
		fyStart = '',
		fyEnd = ''
	}: {
		currentFilters: {
			fy: number;
			payee: string;
			tags: number[];
			from: string;
			to: string;
			type: string;
			method: string;
			sort: string;
		};
		availableTags: Tag[];
		filteredCount: number;
		totalCount: number;
		fyStart?: string;
		fyEnd?: string;
	} = $props();

	// Local state for debounced payee input
	let payeeInput = $state(currentFilters.payee);
	let payeeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	// State for dropdowns and search expansion
	let showTagDropdown = $state(false);
	let showMethodDropdown = $state(false);
	let showDateDropdown = $state(false);
	let searchExpanded = $state(false);
	let searchInputEl: HTMLInputElement | undefined = $state();

	// Payment methods
	const paymentMethods = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'card', label: 'Card' },
		{ value: 'check', label: 'Check' }
	];

	// Check if any filters are active (besides fiscal year)
	let hasActiveFilters = $derived(
		currentFilters.payee ||
			currentFilters.tags.length > 0 ||
			currentFilters.from ||
			currentFilters.to ||
			currentFilters.type ||
			currentFilters.method
	);

	// Check if date filter is active
	let hasDateFilter = $derived(currentFilters.from || currentFilters.to);

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

	function handleMethodToggle(method: string) {
		if (currentFilters.method === method) {
			// Deselect if already selected
			updateURL('method', '');
		} else {
			updateURL('method', method);
		}
		showMethodDropdown = false;
	}

	function handleSortToggle() {
		const newSort = currentFilters.sort === 'asc' ? 'desc' : 'asc';
		updateURL('sort', newSort);
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
		// Keep only fy and sort params
		const fy = url.searchParams.get('fy');
		const sort = url.searchParams.get('sort');
		url.search = '';
		if (fy) url.searchParams.set('fy', fy);
		if (sort) url.searchParams.set('sort', sort);
		payeeInput = '';
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function clearDateFilter() {
		updateURL('from', '');
		updateURL('to', '');
		showDateDropdown = false;
	}

	// Get display name for selected method
	function getSelectedMethodName(): string {
		if (!currentFilters.method) return 'All';
		const method = paymentMethods.find((m) => m.value === currentFilters.method);
		return method?.label ?? 'All';
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

	// Format date for display (compact)
	function formatDateCompact(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Get date range display
	function getDateRangeDisplay(): string {
		const from = currentFilters.from || fyStart;
		const to = currentFilters.to || fyEnd;
		if (!from && !to) return 'Date';
		return `${formatDateCompact(from)} - ${formatDateCompact(to)}`;
	}

	// Expand search and focus input
	function expandSearch() {
		searchExpanded = true;
		// Focus input after DOM updates
		setTimeout(() => searchInputEl?.focus(), 0);
	}

	// Collapse search if empty
	function handleSearchBlur() {
		if (!payeeInput) {
			searchExpanded = false;
		}
	}

	// Handle click outside for search
	function handleSearchClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		// Ignore clicks on elements no longer in the DOM (e.g. the button that was
		// replaced by the input when searchExpanded became true)
		if (!document.contains(target)) return;
		if (!target.closest('[data-search-container]') && !payeeInput) {
			searchExpanded = false;
		}
	}

	$effect(() => {
		if (searchExpanded) {
			document.addEventListener('click', handleSearchClickOutside);
			return () => document.removeEventListener('click', handleSearchClickOutside);
		}
	});
</script>

<div class="py-3" data-component="filter-bar">
	<!-- Filter bar (unified container) -->
	<div class="box filter-container">
		<div class="is-flex is-flex-wrap-wrap is-align-items-center filter-row">
			<!-- Type segmented buttons -->
			<div class="buttons has-addons mb-0">
				<button
					type="button"
					class="button is-small"
					class:is-primary={currentFilters.type === ''}
					class:is-selected={currentFilters.type === ''}
					onclick={() => handleTypeChange('')}
				>
					All
				</button>
				<button
					type="button"
					class="button is-small"
					class:is-success={currentFilters.type === 'income'}
					class:is-selected={currentFilters.type === 'income'}
					onclick={() => handleTypeChange('income')}
				>
					Income
				</button>
				<button
					type="button"
					class="button is-small"
					class:is-danger={currentFilters.type === 'expense'}
					class:is-selected={currentFilters.type === 'expense'}
					onclick={() => handleTypeChange('expense')}
				>
					Expense
				</button>
			</div>

			<!-- Divider -->
			<span class="filter-divider"></span>

			<!-- Collapsible Search -->
			<div data-search-container>
				{#if searchExpanded || payeeInput}
					<div class="control has-icons-left">
						<input
							bind:this={searchInputEl}
							type="text"
							placeholder="Search payee..."
							value={payeeInput}
							oninput={handlePayeeInput}
							onblur={handleSearchBlur}
							class="input is-small"
						/>
						<span class="icon is-small is-left">
							<iconify-icon icon="solar:magnifer-linear" width="16" height="16"></iconify-icon>
						</span>
					</div>
				{:else}
					<button
						type="button"
						onclick={expandSearch}
						class="button is-small is-ghost filter-pill"
					>
						<span class="icon is-small">
							<iconify-icon icon="solar:magnifer-linear" width="16" height="16"></iconify-icon>
						</span>
						<span class="is-hidden-mobile">Search</span>
					</button>
				{/if}
			</div>

			<!-- Divider -->
			<span class="filter-divider"></span>

			<!-- Tags dropdown -->
			<div class="dropdown" class:is-active={showTagDropdown}>
				<div class="dropdown-trigger">
					<button
						type="button"
						class="button is-small filter-pill"
						class:is-active-filter={currentFilters.tags.length > 0}
						onclick={() => (showTagDropdown = !showTagDropdown)}
						aria-haspopup="true"
					>
						<span class="icon is-small">
							<iconify-icon icon="solar:tag-bold" width="16" height="16"></iconify-icon>
						</span>
						<span class="is-hidden-mobile">{getSelectedTagNames()}</span>
						<span class="icon is-small">
							<iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
						</span>
					</button>
				</div>

				{#if showTagDropdown}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="dropdown-backdrop" onclick={() => (showTagDropdown = false)}></div>
					<div class="dropdown-menu" role="menu">
						<div class="dropdown-content">
							{#if availableTags.length === 0}
								<div class="dropdown-item is-size-7 muted-text">No tags available</div>
							{:else}
								{#each availableTags as tag}
									<label class="dropdown-item is-flex is-align-items-center">
										<input
											type="checkbox"
											checked={currentFilters.tags.includes(tag.id)}
											onchange={() => handleTagToggle(tag.id)}
											class="mr-2"
										/>
										<span class="is-size-7">{tag.name}</span>
									</label>
								{/each}
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Divider -->
			<span class="filter-divider"></span>

			<!-- Date range -->
			<div class="dropdown" class:is-active={showDateDropdown}>
				<div class="dropdown-trigger">
					<button
						type="button"
						class="button is-small filter-pill"
						class:is-active-filter={!!hasDateFilter}
						onclick={() => (showDateDropdown = !showDateDropdown)}
						aria-haspopup="true"
					>
						<span class="icon is-small">
							<iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
						</span>
						<span class="is-hidden-mobile">{getDateRangeDisplay()}</span>
						<span class="icon is-small">
							<iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
						</span>
					</button>
				</div>

				{#if showDateDropdown}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="dropdown-backdrop" onclick={() => (showDateDropdown = false)}></div>
					<div class="dropdown-menu" role="menu">
						<div class="dropdown-content p-3">
							<div class="field">
								<label class="label is-small">From</label>
								<div class="control">
									<input
										type="date"
										value={currentFilters.from || fyStart}
										onchange={handleFromChange}
										class="input is-small"
									/>
								</div>
							</div>
							<div class="field">
								<label class="label is-small">To</label>
								<div class="control">
									<input
										type="date"
										value={currentFilters.to || fyEnd}
										onchange={handleToChange}
										class="input is-small"
									/>
								</div>
							</div>
							{#if hasDateFilter}
								<button
									type="button"
									onclick={clearDateFilter}
									class="button is-small is-fullwidth is-ghost mt-1"
								>
									<span class="icon is-small">
										<iconify-icon icon="solar:close-circle-linear" width="14" height="14"></iconify-icon>
									</span>
									<span>Clear dates</span>
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Divider -->
			<span class="filter-divider"></span>

			<!-- Payment method dropdown -->
			<div class="dropdown" class:is-active={showMethodDropdown}>
				<div class="dropdown-trigger">
					<button
						type="button"
						class="button is-small filter-pill"
						class:is-active-filter={!!currentFilters.method}
						onclick={() => (showMethodDropdown = !showMethodDropdown)}
						aria-haspopup="true"
					>
						<span class="icon is-small">
							<iconify-icon icon="solar:card-bold" width="16" height="16"></iconify-icon>
						</span>
						<span class="is-hidden-mobile">{getSelectedMethodName()}</span>
						<span class="icon is-small">
							<iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
						</span>
					</button>
				</div>

				{#if showMethodDropdown}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="dropdown-backdrop" onclick={() => (showMethodDropdown = false)}></div>
					<div class="dropdown-menu" role="menu">
						<div class="dropdown-content">
							<button
								type="button"
								class="dropdown-item is-flex is-align-items-center"
								class:is-active={!currentFilters.method}
								onclick={() => handleMethodToggle('')}
							>
								{#if !currentFilters.method}
									<iconify-icon icon="solar:check-circle-bold" width="14" height="14" class="mr-2 primary-icon"></iconify-icon>
								{:else}
									<span class="icon-spacer mr-2"></span>
								{/if}
								All Methods
							</button>
							{#each paymentMethods as method}
								<button
									type="button"
									class="dropdown-item is-flex is-align-items-center"
									class:is-active={currentFilters.method === method.value}
									onclick={() => handleMethodToggle(method.value)}
								>
									{#if currentFilters.method === method.value}
										<iconify-icon icon="solar:check-circle-bold" width="14" height="14" class="mr-2 primary-icon"></iconify-icon>
									{:else}
										<span class="icon-spacer mr-2"></span>
									{/if}
									{method.label}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Divider -->
			<span class="filter-divider"></span>

			<!-- Sort toggle -->
			<button
				type="button"
				onclick={handleSortToggle}
				class="button is-small is-ghost filter-pill"
				title={currentFilters.sort === 'asc' ? 'Oldest first (click for newest first)' : 'Newest first (click for oldest first)'}
			>
				{#if currentFilters.sort === 'asc'}
					<span class="icon is-small">
						<iconify-icon icon="solar:sort-from-top-to-bottom-linear" width="16" height="16"></iconify-icon>
					</span>
				{:else}
					<span class="icon is-small">
						<iconify-icon icon="solar:sort-from-bottom-to-top-linear" width="16" height="16"></iconify-icon>
					</span>
				{/if}
			</button>

			<!-- Spacer -->
			<div class="is-flex-grow-1"></div>

			<!-- Filter count -->
			<span class="is-size-7 muted-text filter-count">
				{filteredCount === totalCount
					? `${totalCount} transactions`
					: `${filteredCount} of ${totalCount}`}
			</span>

			<!-- Clear filters -->
			{#if hasActiveFilters}
				<button
					type="button"
					onclick={clearAllFilters}
					class="button is-small is-ghost filter-pill"
				>
					<span class="icon is-small">
						<iconify-icon icon="solar:close-circle-linear" width="16" height="16"></iconify-icon>
					</span>
					<span class="is-hidden-mobile">Clear</span>
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.filter-container {
		padding: 0.5rem;
	}

	.filter-row {
		gap: 0.5rem;
	}

	.filter-divider {
		display: inline-block;
		width: 1px;
		height: 1.25rem;
		background-color: var(--color-border);
	}

	.filter-pill {
		color: var(--color-muted);
		border: none;
	}

	.filter-pill:hover {
		background-color: var(--color-surface);
		color: var(--color-foreground);
	}

	.is-active-filter {
		background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
		color: var(--color-primary);
	}

	.muted-text {
		color: var(--color-muted);
	}

	.filter-count {
		white-space: nowrap;
	}

	.dropdown-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.dropdown-menu {
		z-index: 20;
	}

	.dropdown-content {
		max-height: 16rem;
		overflow-y: auto;
	}

	.icon-spacer {
		display: inline-block;
		width: 0.875rem;
	}

	.primary-icon {
		color: var(--color-primary);
	}

	/* Override Bulma's dropdown-item to work as buttons */
	:global(.dropdown-item) {
		cursor: pointer;
	}

	.buttons.has-addons .button {
		margin-bottom: 0;
	}
</style>
