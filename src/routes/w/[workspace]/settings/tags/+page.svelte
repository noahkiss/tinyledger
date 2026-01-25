<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Merge dialog state
	let mergeSourceId = $state<number | null>(null);
	let mergeTargetId = $state<number | null>(null);

	// Rename dialog state
	let renameTagId = $state<number | null>(null);
	let renameValue = $state('');

	// Find tag by ID
	function getTagById(id: number) {
		return data.tags.find((t) => t.id === id);
	}

	function openMergeDialog(tagId: number) {
		mergeSourceId = tagId;
		mergeTargetId = null;
	}

	function closeMergeDialog() {
		mergeSourceId = null;
		mergeTargetId = null;
	}

	function openRenameDialog(tagId: number, currentName: string) {
		renameTagId = tagId;
		renameValue = currentName;
	}

	function closeRenameDialog() {
		renameTagId = null;
		renameValue = '';
	}
</script>

<svelte:head>
	<title>Manage Tags - TinyLedger</title>
</svelte:head>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="text-xl font-semibold text-gray-800">Manage Tags</h2>
			<p class="mt-1 text-sm text-gray-500">{data.tags.length} tags</p>
		</div>

		<!-- Lock toggle -->
		<form method="POST" action="?/toggleLock" use:enhance>
			<label class="flex cursor-pointer items-center gap-3">
				<span class="text-sm text-gray-700">Lock Tags</span>
				<button
					type="submit"
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {data.tagsLocked
						? 'bg-blue-600'
						: 'bg-gray-200'}"
					aria-pressed={data.tagsLocked}
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {data.tagsLocked
							? 'translate-x-6'
							: 'translate-x-1'}"
					></span>
				</button>
			</label>
		</form>
	</div>

	{#if data.tagsLocked}
		<div class="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
			Tags are locked. New tags cannot be created during transaction entry.
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
			{form.error}
		</div>
	{/if}

	{#if form?.success && form?.renamed}
		<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Tag renamed successfully!</div>
	{/if}

	{#if form?.success && form?.merged}
		<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
			Merged "{form.merged.from}" into "{form.merged.to}" successfully!
		</div>
	{/if}

	{#if form?.success && form?.deleted}
		<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Tag deleted successfully!</div>
	{/if}

	<!-- Tags list -->
	<div class="space-y-2">
		{#each data.tags as tag (tag.id)}
			<div class="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
				<div class="flex-1">
					<div class="font-medium text-gray-900">{tag.name}</div>
					<div class="text-sm text-gray-500">
						Used in {tag.usageCount}
						{tag.usageCount === 1 ? 'transaction' : 'transactions'}
					</div>
				</div>

				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => openRenameDialog(tag.id, tag.name)}
						class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
					>
						Rename
					</button>

					<button
						type="button"
						onclick={() => openMergeDialog(tag.id)}
						class="rounded-lg bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-200"
					>
						Merge
					</button>

					{#if tag.usageCount === 0}
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={tag.id} />
							<button
								type="submit"
								class="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
							>
								Delete
							</button>
						</form>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if data.tags.length === 0}
		<div class="mt-8 text-center text-gray-500">
			<p>No tags yet. Tags will be created when you add transactions.</p>
		</div>
	{/if}
</div>

<!-- Rename Dialog -->
{#if renameTagId !== null}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={() => closeRenameDialog()}
		onkeydown={(e) => e.key === 'Escape' && closeRenameDialog()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Rename Tag</h3>

			<form
				method="POST"
				action="?/rename"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						closeRenameDialog();
					};
				}}
			>
				<input type="hidden" name="id" value={renameTagId} />

				<div class="mb-4">
					<label for="newName" class="block text-sm font-medium text-gray-700">New Name</label>
					<input
						type="text"
						id="newName"
						name="newName"
						bind:value={renameValue}
						required
						class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => closeRenameDialog()}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						Rename
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Merge Dialog -->
{#if mergeSourceId !== null}
	{@const sourceTag = getTagById(mergeSourceId)}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={() => closeMergeDialog()}
		onkeydown={(e) => e.key === 'Escape' && closeMergeDialog()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Merge Tag</h3>

			<p class="mb-4 text-gray-600">
				Merge "<span class="font-medium">{sourceTag?.name}</span>" into another tag.
				{#if sourceTag && sourceTag.usageCount > 0}
					All {sourceTag.usageCount}
					{sourceTag.usageCount === 1 ? 'transaction' : 'transactions'} will be reassigned.
				{/if}
			</p>

			<form
				method="POST"
				action="?/merge"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						closeMergeDialog();
					};
				}}
			>
				<input type="hidden" name="sourceId" value={mergeSourceId} />

				<div class="mb-4">
					<label for="targetId" class="block text-sm font-medium text-gray-700">Merge Into</label>
					<select
						id="targetId"
						name="targetId"
						bind:value={mergeTargetId}
						required
						class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">Select target tag...</option>
						{#each data.tags.filter((t) => t.id !== mergeSourceId) as tag}
							<option value={tag.id}>{tag.name} ({tag.usageCount} transactions)</option>
						{/each}
					</select>
				</div>

				<div class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
					Warning: This action cannot be undone. The source tag will be permanently deleted.
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => closeMergeDialog()}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!mergeTargetId}
						class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
					>
						Merge
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
