<script lang="ts">
	import type { Tag } from '$lib/server/db/schema';

	type TagAllocation = {
		tagId: number;
		percentage: number;
	};

	let {
		availableTags = [],
		allocations = $bindable<TagAllocation[]>([])
	}: {
		availableTags: Tag[];
		allocations?: TagAllocation[];
	} = $props();

	// Computed validation
	let totalPercentage = $derived(allocations.reduce((sum, a) => sum + a.percentage, 0));
	let isValid = $derived(totalPercentage === 100);
	let remainingPercentage = $derived(100 - totalPercentage);

	function addTag() {
		// Default to remaining percentage or 0
		const defaultPercentage = remainingPercentage > 0 ? remainingPercentage : 0;
		const defaultTagId = availableTags[0]?.id ?? 0;
		allocations = [...allocations, { tagId: defaultTagId, percentage: defaultPercentage }];
	}

	function removeTag(index: number) {
		allocations = allocations.filter((_, i) => i !== index);
	}

	function updateTag(index: number, tagId: number) {
		allocations = allocations.map((a, i) => (i === index ? { ...a, tagId } : a));
	}

	function updatePercentage(index: number, percentage: number) {
		const clampedPercentage = Math.max(0, Math.min(100, percentage));
		allocations = allocations.map((a, i) =>
			i === index ? { ...a, percentage: clampedPercentage } : a
		);
	}

	// Auto-distribute remaining to last tag
	function distributeRemaining() {
		if (allocations.length === 0) return;
		const lastIdx = allocations.length - 1;
		allocations = allocations.map((a, i) =>
			i === lastIdx ? { ...a, percentage: a.percentage + remainingPercentage } : a
		);
	}
</script>

<div class="space-y-3">
	{#each allocations as allocation, i (i)}
		<div class="flex items-center gap-2">
			<select
				name="tag_{i}"
				value={allocation.tagId}
				onchange={(e) => updateTag(i, parseInt(e.currentTarget.value))}
				class="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>
				{#if availableTags.length === 0}
					<option value="0" disabled>No tags available</option>
				{:else}
					{#each availableTags as tag}
						<option value={tag.id}>{tag.name}</option>
					{/each}
				{/if}
			</select>

			<div class="flex items-center gap-1">
				<input
					type="number"
					name="percentage_{i}"
					value={allocation.percentage}
					min="0"
					max="100"
					oninput={(e) => updatePercentage(i, parseInt(e.currentTarget.value) || 0)}
					class="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
				<span class="text-gray-500">%</span>
			</div>

			<button
				type="button"
				onclick={() => removeTag(i)}
				class="rounded p-1 text-red-600 hover:bg-red-50"
				aria-label="Remove tag"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	{/each}

	<div class="flex items-center justify-between">
		<button type="button" onclick={addTag} class="text-sm text-blue-600 hover:text-blue-800">
			+ Add Tag
		</button>

		{#if allocations.length > 0}
			<div class="text-sm" class:text-green-600={isValid} class:text-red-600={!isValid}>
				Total: {totalPercentage}%
				{#if !isValid && remainingPercentage > 0}
					<button
						type="button"
						onclick={distributeRemaining}
						class="ml-2 text-blue-600 hover:underline"
					>
						Add {remainingPercentage}% to last
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if allocations.length > 0 && !isValid}
		<p class="text-sm text-red-600">Tag percentages must sum to exactly 100%</p>
	{/if}
</div>
