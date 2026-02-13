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

	// State for dropdowns
	let showTagDropdown = $state(false);
	let showMethodDropdown = $state(false);
	let showDateDropdown = $state(false);

	// Search sub-toolbar state (auto-open if URL has payee param)
	let showSearchBar = $state(!!currentFilters.payee);
	let searchInputEl: HTMLInputElement | undefined = $state();

	// Mobile filter panel state
	let showFilterPanel = $state(false);

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

	// Check if any "detail" filters are active (tags, date, method — the ones behind mobile Filters button)
	let hasDetailFilters = $derived(
		currentFilters.tags.length > 0 ||
			currentFilters.from ||
			currentFilters.to ||
			currentFilters.method
	);

	// Count of active detail filters for mobile badge
	let activeDetailFilterCount = $derived(
		(currentFilters.tags.length > 0 ? 1 : 0) +
			(currentFilters.from || currentFilters.to ? 1 : 0) +
			(currentFilters.method ? 1 : 0)
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

	function toggleSearch() {
		if (showSearchBar) {
			showSearchBar = false;
			payeeInput = '';
			updateURL('payee', '');
		} else {
			showSearchBar = true;
			setTimeout(() => searchInputEl?.focus(), 0);
		}
	}

	function handleTypeChange(type: string) {
		updateURL('type', type);
	}

	function handleMethodToggle(method: string) {
		if (currentFilters.method === method) {
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
		const fy = url.searchParams.get('fy');
		const sort = url.searchParams.get('sort');
		url.search = '';
		if (fy) url.searchParams.set('fy', fy);
		if (sort) url.searchParams.set('sort', sort);
		payeeInput = '';
		showSearchBar = false;
		showFilterPanel = false;
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function clearDateFilter() {
		updateURL('from', '');
		updateURL('to', '');
		showDateDropdown = false;
	}

	function getSelectedMethodName(): string {
		if (!currentFilters.method) return 'All';
		const method = paymentMethods.find((m) => m.value === currentFilters.method);
		return method?.label ?? 'All';
	}

	function getSelectedTagNames(): string {
		if (currentFilters.tags.length === 0) return 'Tags';
		const names = currentFilters.tags
			.map((id) => availableTags.find((t) => t.id === id)?.name)
			.filter(Boolean);
		if (names.length === 1) return names[0] as string;
		return `${names.length} tags`;
	}

	function formatDateCompact(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getDateRangeDisplay(): string {
		const from = currentFilters.from || fyStart;
		const to = currentFilters.to || fyEnd;
		if (!from && !to) return 'Date';
		return `${formatDateCompact(from)} - ${formatDateCompact(to)}`;
	}
</script>

<div class="flex flex-col gap-2 py-3" data-component="filter-bar">
	<!-- Main filter bar -->
	<div class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
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

		<!-- Divider -->
		<div class="h-5 w-px bg-border"></div>

		<!-- Search toggle button -->
		<button
			type="button"
			onclick={toggleSearch}
			class="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface
				{showSearchBar ? 'bg-primary/10 text-primary' : 'text-muted hover:text-fg'}"
			aria-label={showSearchBar ? 'Close search' : 'Search payee'}
			aria-pressed={showSearchBar}
		>
			<iconify-icon icon="solar:magnifer-linear" width="16" height="16"></iconify-icon>
		</button>

		<!-- Divider -->
		<div class="h-5 w-px bg-border"></div>

		<!-- Desktop filters: Tags, Date, Method (hidden on mobile, inline on desktop) -->
		<div class="hidden sm:contents">
			<!-- Tags dropdown -->
			<div class="relative">
				<button
					type="button"
					class="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface
						{currentFilters.tags.length > 0 ? 'bg-primary/10 text-primary' : 'text-muted'}"
					onclick={() => (showTagDropdown = !showTagDropdown)}
					aria-expanded={showTagDropdown}
					aria-haspopup="true"
					aria-label="Tags: {getSelectedTagNames()}"
				>
					<iconify-icon icon="solar:tag-bold" width="16" height="16"></iconify-icon>
					<span>{getSelectedTagNames()}</span>
					<iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
				</button>

				{#if showTagDropdown}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="fixed inset-0 z-10" onclick={() => (showTagDropdown = false)}></div>
					<div
						class="absolute left-0 top-full z-20 mt-1 max-h-64 w-48 overflow-auto rounded-lg border border-border bg-card shadow-lg"
						role="group"
						aria-label="Filter by tags"
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

			<!-- Divider -->
			<div class="h-5 w-px bg-border"></div>

			<!-- Date range pill -->
			<div class="relative">
				<button
					type="button"
					class="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface
						{hasDateFilter ? 'bg-primary/10 text-primary' : 'text-muted'}"
					onclick={() => (showDateDropdown = !showDateDropdown)}
					aria-expanded={showDateDropdown}
					aria-haspopup="true"
					aria-label="Date range: {getDateRangeDisplay()}"
				>
					<iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
					<span>{getDateRangeDisplay()}</span>
					<iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
				</button>

				{#if showDateDropdown}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="fixed inset-0 z-10" onclick={() => (showDateDropdown = false)}></div>
					<div
						class="absolute left-0 top-full z-20 mt-1 rounded-lg border border-border bg-card p-3 shadow-lg"
						role="group"
						aria-label="Filter by date range"
					>
						<div class="flex flex-col gap-2">
							<label class="text-xs font-medium text-muted">From</label>
							<input
								type="date"
								value={currentFilters.from || fyStart}
								onchange={handleFromChange}
								class="rounded-lg border border-input-border bg-input px-2 py-1.5 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
							/>
							<label class="text-xs font-medium text-muted">To</label>
							<input
								type="date"
								value={currentFilters.to || fyEnd}
								onchange={handleToChange}
								class="rounded-lg border border-input-border bg-input px-2 py-1.5 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
							/>
							{#if hasDateFilter}
								<button
									type="button"
									onclick={clearDateFilter}
									class="mt-1 flex cursor-pointer items-center justify-center gap-1 rounded-md bg-surface px-2 py-1.5 text-xs text-muted hover:text-fg"
								>
									<iconify-icon icon="solar:close-circle-linear" width="14" height="14"></iconify-icon>
									Clear dates
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Divider -->
			<div class="h-5 w-px bg-border"></div>

			<!-- Payment method dropdown -->
			<div class="relative">
				<button
					type="button"
					class="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface
						{currentFilters.method ? 'bg-primary/10 text-primary' : 'text-muted'}"
					onclick={() => (showMethodDropdown = !showMethodDropdown)}
					aria-expanded={showMethodDropdown}
					aria-haspopup="true"
					aria-label="Payment method: {getSelectedMethodName()}"
				>
					<iconify-icon icon="solar:card-bold" width="16" height="16"></iconify-icon>
					<span>{getSelectedMethodName()}</span>
					<iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
				</button>

				{#if showMethodDropdown}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="fixed inset-0 z-10" onclick={() => (showMethodDropdown = false)}></div>
					<div
						class="absolute left-0 top-full z-20 mt-1 w-36 overflow-auto rounded-lg border border-border bg-card shadow-lg"
						role="menu"
					>
						<button
							type="button"
							role="menuitem"
							class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface
								{!currentFilters.method ? 'text-primary' : 'text-fg'}"
							onclick={() => handleMethodToggle('')}
						>
							{#if !currentFilters.method}
								<iconify-icon icon="solar:check-circle-bold" width="14" height="14" class="text-primary"></iconify-icon>
							{:else}
								<span class="w-3.5"></span>
							{/if}
							All Methods
						</button>
						{#each paymentMethods as method}
							<button
								type="button"
								role="menuitem"
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface
									{currentFilters.method === method.value ? 'text-primary' : 'text-fg'}"
								onclick={() => handleMethodToggle(method.value)}
							>
								{#if currentFilters.method === method.value}
									<iconify-icon icon="solar:check-circle-bold" width="14" height="14" class="text-primary"></iconify-icon>
								{:else}
									<span class="w-3.5"></span>
								{/if}
								{method.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Mobile Filters button (hidden on desktop) -->
		<div class="relative sm:hidden">
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface
					{hasDetailFilters ? 'bg-primary/10 text-primary' : 'text-muted'}"
				onclick={() => (showFilterPanel = !showFilterPanel)}
				aria-expanded={showFilterPanel}
				aria-haspopup="true"
				aria-label="Filters"
			>
				<iconify-icon icon="solar:filter-bold" width="16" height="16"></iconify-icon>
				{#if activeDetailFilterCount > 0}
					<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
						{activeDetailFilterCount}
					</span>
				{/if}
			</button>

			{#if showFilterPanel}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="fixed inset-0 z-10" onclick={() => (showFilterPanel = false)}></div>
				<div
					class="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg"
					role="group"
					aria-label="Filter options"
				>
					<!-- Tags section -->
					<div class="mb-3">
						<div class="mb-1.5 text-xs font-medium text-muted">Tags</div>
						<div class="max-h-32 overflow-auto">
							{#if availableTags.length === 0}
								<div class="text-sm text-muted">No tags available</div>
							{:else}
								{#each availableTags as tag}
									<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-surface">
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
					</div>

					<!-- Divider -->
					<div class="mb-3 border-t border-border"></div>

					<!-- Date range section -->
					<div class="mb-3">
						<div class="mb-1.5 text-xs font-medium text-muted">Date Range</div>
						<div class="flex flex-col gap-2">
							<div class="flex items-center gap-2">
								<label class="w-10 text-xs text-muted">From</label>
								<input
									type="date"
									value={currentFilters.from || fyStart}
									onchange={handleFromChange}
									class="flex-1 rounded-lg border border-input-border bg-input px-2 py-1.5 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
								/>
							</div>
							<div class="flex items-center gap-2">
								<label class="w-10 text-xs text-muted">To</label>
								<input
									type="date"
									value={currentFilters.to || fyEnd}
									onchange={handleToChange}
									class="flex-1 rounded-lg border border-input-border bg-input px-2 py-1.5 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
								/>
							</div>
							{#if hasDateFilter}
								<button
									type="button"
									onclick={clearDateFilter}
									class="flex cursor-pointer items-center justify-center gap-1 rounded-md bg-surface px-2 py-1.5 text-xs text-muted hover:text-fg"
								>
									<iconify-icon icon="solar:close-circle-linear" width="14" height="14"></iconify-icon>
									Clear dates
								</button>
							{/if}
						</div>
					</div>

					<!-- Divider -->
					<div class="mb-3 border-t border-border"></div>

					<!-- Payment method section -->
					<div>
						<div class="mb-1.5 text-xs font-medium text-muted">Payment Method</div>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								class="cursor-pointer rounded-md px-2.5 py-1.5 text-sm transition-colors
									{!currentFilters.method ? 'bg-primary/10 text-primary font-medium' : 'text-fg hover:bg-surface'}"
								onclick={() => handleMethodToggle('')}
							>
								All
							</button>
							{#each paymentMethods as method}
								<button
									type="button"
									class="cursor-pointer rounded-md px-2.5 py-1.5 text-sm transition-colors
										{currentFilters.method === method.value ? 'bg-primary/10 text-primary font-medium' : 'text-fg hover:bg-surface'}"
									onclick={() => handleMethodToggle(method.value)}
								>
									{method.label}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Divider -->
		<div class="h-5 w-px bg-border"></div>

		<!-- Sort toggle -->
		<button
			type="button"
			onclick={handleSortToggle}
			class="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-fg"
			title={currentFilters.sort === 'asc' ? 'Oldest first (click for newest first)' : 'Newest first (click for oldest first)'}
			aria-label={currentFilters.sort === 'asc' ? 'Sort: oldest first' : 'Sort: newest first'}
			aria-pressed={currentFilters.sort === 'desc'}
		>
			{#if currentFilters.sort === 'asc'}
				<iconify-icon icon="solar:sort-from-top-to-bottom-linear" width="16" height="16"></iconify-icon>
			{:else}
				<iconify-icon icon="solar:sort-from-bottom-to-top-linear" width="16" height="16"></iconify-icon>
			{/if}
		</button>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Filter count -->
		<div class="text-sm text-muted whitespace-nowrap">
			{filteredCount === totalCount
				? `${totalCount} transactions`
				: `${filteredCount} of ${totalCount}`}
		</div>

		<!-- Clear filters -->
		{#if hasActiveFilters}
			<button
				type="button"
				onclick={clearAllFilters}
				class="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface hover:text-fg"
				aria-label="Clear all filters"
			>
				<iconify-icon icon="solar:close-circle-linear" width="16" height="16"></iconify-icon>
				<span class="hidden sm:inline">Clear</span>
			</button>
		{/if}
	</div>

	<!-- Search sub-toolbar -->
	{#if showSearchBar}
		<div class="rounded-lg border border-border bg-card p-2">
			<div class="relative">
				<iconify-icon
					icon="solar:magnifer-linear"
					class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
					width="16"
					height="16"
				></iconify-icon>
				<input
					bind:this={searchInputEl}
					type="text"
					placeholder="Search payee..."
					value={payeeInput}
					oninput={handlePayeeInput}
					class="w-full rounded-lg border border-input-border bg-input py-2 pl-9 pr-3 text-sm text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
				/>
			</div>
		</div>
	{/if}
</div>
