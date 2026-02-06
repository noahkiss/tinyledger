<script lang="ts">
	import type { Tag } from '$lib/server/db/schema';

	type TagAllocation = {
		tagId: number;
		percentage: number;
	};

	type SuggestedTag = {
		id: number;
		name: string;
		percentage: number;
	};

	let {
		availableTags = [],
		allocations = $bindable<TagAllocation[]>([]),
		onCreateTag,
		locked = false,
		suggestedTags = []
	}: {
		availableTags: Tag[];
		allocations?: TagAllocation[];
		onCreateTag?: (name: string) => Promise<Tag | null>;
		locked?: boolean;
		suggestedTags?: SuggestedTag[];
	} = $props();

	// State for inline tag creation
	let newTagName = $state('');
	let isCreating = $state(false);
	let createError = $state('');

	// Track if we've auto-populated from suggestions
	let hasAutoPopulated = $state(false);

	// Computed validation
	let totalPercentage = $derived(allocations.reduce((sum, a) => sum + a.percentage, 0));
	let isValid = $derived(totalPercentage === 100);
	let remainingPercentage = $derived(100 - totalPercentage);

	// Auto-populate from suggested tags when allocations is empty and suggestions exist
	$effect(() => {
		if (suggestedTags.length > 0 && allocations.length === 0 && !hasAutoPopulated) {
			// Verify suggested tags exist in available tags
			const validSuggestions = suggestedTags.filter((s) =>
				availableTags.some((t) => t.id === s.id)
			);
			if (validSuggestions.length > 0) {
				allocations = validSuggestions.map((t) => ({
					tagId: t.id,
					percentage: t.percentage
				}));
				hasAutoPopulated = true;
			}
		}
	});

	// Reset auto-populated flag when suggested tags change
	$effect(() => {
		// When suggestedTags changes (e.g., different payee selected), allow re-population
		if (suggestedTags.length === 0) {
			hasAutoPopulated = false;
		}
	});

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

	// Handle inline tag creation
	async function handleCreateTag() {
		if (!onCreateTag || !newTagName.trim() || locked || isCreating) return;

		createError = '';
		isCreating = true;
		try {
			const newTag = await onCreateTag(newTagName.trim());
			if (newTag) {
				// Add to allocations with remaining percentage
				const remaining = 100 - allocations.reduce((sum, a) => sum + a.percentage, 0);
				allocations = [
					...allocations,
					{
						tagId: newTag.id,
						percentage: remaining > 0 ? remaining : 0
					}
				];
				newTagName = '';
			}
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create tag';
		} finally {
			isCreating = false;
		}
	}

	function handleCreateKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleCreateTag();
		}
	}
</script>

<div>
	{#each allocations as allocation, i (i)}
		<div class="field is-grouped mb-3">
			<div class="control is-expanded">
				<div class="select is-fullwidth">
					<select
						name="tag_{i}"
						value={allocation.tagId}
						onchange={(e) => updateTag(i, parseInt(e.currentTarget.value))}
					>
						{#if availableTags.length === 0}
							<option value="0" disabled>No tags available</option>
						{:else}
							{#each availableTags as tag}
								<option value={tag.id}>{tag.name}</option>
							{/each}
						{/if}
					</select>
				</div>
			</div>

			<div class="control percentage-control">
				<input
					type="number"
					name="percentage_{i}"
					value={allocation.percentage}
					min="0"
					max="100"
					oninput={(e) => updatePercentage(i, parseInt(e.currentTarget.value) || 0)}
					class="input percentage-input"
				/>
			</div>
			<div class="control">
				<span class="percent-symbol">%</span>
			</div>

			<div class="control">
				<button
					type="button"
					onclick={() => removeTag(i)}
					class="button is-ghost remove-btn"
					aria-label="Remove tag"
				>
					<iconify-icon icon="solar:close-circle-linear" width="20" height="20"></iconify-icon>
				</button>
			</div>
		</div>
	{/each}

	<div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
		<button type="button" onclick={addTag} class="button is-ghost is-small add-tag-btn">
			+ Add Tag
		</button>

		{#if allocations.length > 0}
			<span class="is-size-7 {isValid ? 'has-text-success' : 'has-text-danger'}">
				Total: {totalPercentage}%
				{#if !isValid && remainingPercentage > 0}
					<button
						type="button"
						onclick={distributeRemaining}
						class="button is-ghost is-small distribute-btn"
					>
						Add {remainingPercentage}% to last
					</button>
				{/if}
			</span>
		{/if}
	</div>

	{#if allocations.length > 0 && !isValid}
		<p class="help is-danger">Tag percentages must sum to exactly 100%</p>
	{/if}

	<!-- Inline tag creation section -->
	{#if !locked && onCreateTag}
		<div class="field is-grouped create-section">
			<div class="control is-expanded">
				<input
					type="text"
					bind:value={newTagName}
					placeholder="Create new tag..."
					onkeydown={handleCreateKeydown}
					class="input is-small"
				/>
			</div>
			<div class="control">
				<button
					type="button"
					onclick={handleCreateTag}
					disabled={isCreating || !newTagName.trim()}
					class="button is-primary is-small"
				>
					{isCreating ? '...' : 'Create'}
				</button>
			</div>
		</div>
		{#if createError}
			<p class="help is-danger mt-1">{createError}</p>
		{/if}
	{:else if locked}
		<p class="help mt-2" style="color: var(--color-muted)">Tag creation is locked. Manage tags in settings.</p>
	{/if}
</div>

<style>
	.percentage-control {
		width: 5rem;
	}
	.percentage-input {
		text-align: center;
	}
	.percent-symbol {
		line-height: 2.5em;
		color: var(--color-muted);
	}
	.remove-btn {
		color: var(--bulma-danger);
		text-decoration: none;
	}
	.remove-btn:hover {
		background: var(--color-error-muted);
	}
	.add-tag-btn {
		color: var(--color-primary);
		text-decoration: none;
	}
	.distribute-btn {
		color: var(--color-primary);
		text-decoration: none;
	}
	.distribute-btn:hover {
		text-decoration: underline;
	}
	.create-section {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}
</style>
