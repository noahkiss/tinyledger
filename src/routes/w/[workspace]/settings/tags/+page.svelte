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
	<div class="is-flex is-align-items-center is-justify-content-space-between mb-5">
		<div>
			<h2 class="title is-4 mb-1">Manage Tags</h2>
			<p class="is-size-7 has-text-grey">{data.tags.length} tags</p>
		</div>

		<!-- Lock toggle -->
		<form method="POST" action="?/toggleLock" use:enhance>
			<label class="is-flex is-align-items-center" style="cursor: pointer; gap: 0.75rem;">
				<span class="is-size-7">Lock Tags</span>
				<button
					type="submit"
					class="toggle-switch {data.tagsLocked ? 'is-active' : ''}"
					aria-pressed={data.tagsLocked}
				>
					<span
						class="toggle-knob {data.tagsLocked ? 'is-on' : ''}"
					></span>
				</button>
			</label>
		</form>
	</div>

	{#if data.tagsLocked}
		<div class="notification is-primary is-light mb-4">
			Tags are locked. New tags cannot be created during transaction entry.
		</div>
	{/if}

	{#if form?.error}
		<div class="notification is-danger is-light mb-4">
			{form.error}
		</div>
	{/if}

	{#if form?.success && form?.renamed}
		<div class="notification is-success is-light mb-4">Tag renamed successfully!</div>
	{/if}

	{#if form?.success && form?.merged}
		<div class="notification is-success is-light mb-4">
			Merged "{form.merged.from}" into "{form.merged.to}" successfully!
		</div>
	{/if}

	{#if form?.success && form?.deleted}
		<div class="notification is-success is-light mb-4">Tag deleted successfully!</div>
	{/if}

	<!-- Tags list -->
	<div class="tag-list">
		{#each data.tags as tag (tag.id)}
			<div class="box tag-item">
				<div class="is-flex-grow-1">
					<div class="has-text-weight-medium">{tag.name}</div>
					<div class="is-size-7 has-text-grey">
						Used in {tag.usageCount}
						{tag.usageCount === 1 ? 'transaction' : 'transactions'}
					</div>
				</div>

				<div class="buttons are-small">
					<button
						type="button"
						onclick={() => openRenameDialog(tag.id, tag.name)}
						class="button is-light"
					>
						Rename
					</button>

					<button
						type="button"
						onclick={() => openMergeDialog(tag.id)}
						class="button is-warning is-light"
					>
						Merge
					</button>

					{#if tag.usageCount === 0}
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={tag.id} />
							<button
								type="submit"
								class="button is-danger is-light is-small"
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
		<div class="has-text-centered has-text-grey mt-6">
			<p>No tags yet. Tags will be created when you add transactions.</p>
		</div>
	{/if}
</div>

<!-- Rename Dialog -->
{#if renameTagId !== null}
	<div
		class="modal is-active"
		onclick={() => closeRenameDialog()}
		onkeydown={(e) => e.key === 'Escape' && closeRenameDialog()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal-background"></div>
		<div
			class="modal-card"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<header class="modal-card-head">
				<p class="modal-card-title">Rename Tag</p>
				<button class="delete" aria-label="close" onclick={() => closeRenameDialog()}></button>
			</header>

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
				<section class="modal-card-body">
					<input type="hidden" name="id" value={renameTagId} />

					<div class="field">
						<label for="newName" class="label">New Name</label>
						<div class="control">
							<input
								type="text"
								id="newName"
								name="newName"
								bind:value={renameValue}
								required
								class="input"
							/>
						</div>
					</div>
				</section>

				<footer class="modal-card-foot is-justify-content-flex-end">
					<button
						type="button"
						onclick={() => closeRenameDialog()}
						class="button is-light"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="button is-primary"
					>
						Rename
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}

<!-- Merge Dialog -->
{#if mergeSourceId !== null}
	{@const sourceTag = getTagById(mergeSourceId)}
	<div
		class="modal is-active"
		onclick={() => closeMergeDialog()}
		onkeydown={(e) => e.key === 'Escape' && closeMergeDialog()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal-background"></div>
		<div
			class="modal-card"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<header class="modal-card-head">
				<p class="modal-card-title">Merge Tag</p>
				<button class="delete" aria-label="close" onclick={() => closeMergeDialog()}></button>
			</header>

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
				<section class="modal-card-body">
					<p class="mb-4 has-text-grey">
						Merge "<span class="has-text-weight-medium">{sourceTag?.name}</span>" into another tag.
						{#if sourceTag && sourceTag.usageCount > 0}
							All {sourceTag.usageCount}
							{sourceTag.usageCount === 1 ? 'transaction' : 'transactions'} will be reassigned.
						{/if}
					</p>

					<input type="hidden" name="sourceId" value={mergeSourceId} />

					<div class="field">
						<label for="targetId" class="label">Merge Into</label>
						<div class="control">
							<div class="select is-fullwidth">
								<select
									id="targetId"
									name="targetId"
									bind:value={mergeTargetId}
									required
								>
									<option value="">Select target tag...</option>
									{#each data.tags.filter((t) => t.id !== mergeSourceId) as tag}
										<option value={tag.id}>{tag.name} ({tag.usageCount} transactions)</option>
									{/each}
								</select>
							</div>
						</div>
					</div>

					<div class="notification is-warning is-light">
						Warning: This action cannot be undone. The source tag will be permanently deleted.
					</div>
				</section>

				<footer class="modal-card-foot is-justify-content-flex-end">
					<button
						type="button"
						onclick={() => closeMergeDialog()}
						class="button is-light"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!mergeTargetId}
						class="button is-warning"
					>
						Merge
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Toggle switch */
	.toggle-switch {
		position: relative;
		display: inline-flex;
		align-items: center;
		width: 2.75rem;
		height: 1.5rem;
		border-radius: 9999px;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
		background-color: var(--color-surface-alt);
	}
	.toggle-switch.is-active {
		background-color: var(--color-primary);
	}
	.toggle-knob {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background-color: var(--color-card-bg);
		transition: transform 0.2s;
		transform: translateX(0.25rem);
	}
	.toggle-knob.is-on {
		transform: translateX(1.5rem);
	}

	/* Tag list */
	.tag-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.tag-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
	}

	/* Modal card max-width */
	.modal-card {
		max-width: 28rem;
		width: 100%;
	}
</style>
