<script lang="ts">
	import QuickEntryForm from './QuickEntryForm.svelte';
	import type { Tag } from '$lib/server/db/schema';

	type PayeeHistory = {
		payee: string;
		count: number;
		lastAmount: number;
		lastType: 'income' | 'expense';
		lastTags: { id: number; name: string; percentage: number }[];
	};

	let {
		workspaceId,
		availableTags = [],
		payeeHistory = []
	}: {
		workspaceId: string;
		availableTags: Tag[];
		payeeHistory: PayeeHistory[];
	} = $props();

	let showForm = $state(false);

	function handleBackdropClick(e: MouseEvent) {
		// Only close if clicking the backdrop itself, not the form
		if (e.target === e.currentTarget) {
			showForm = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showForm) {
			showForm = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- FAB Button -->
<button
	type="button"
	onclick={() => (showForm = true)}
	class="button is-primary is-rounded fab-button"
	aria-label="Add transaction"
	data-component="quick-entry-fab"
>
	<iconify-icon icon="solar:add-circle-bold" width="32" height="32"></iconify-icon>
</button>

<!-- Form overlay -->
{#if showForm}
	<!-- Backdrop -->
	<div
		class="fab-backdrop"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && (showForm = false)}
		role="button"
		tabindex="-1"
		aria-label="Close form"
	>
		<!-- Form sheet -->
		<div
			class="box fab-form-sheet"
			role="dialog"
			aria-modal="true"
			aria-label="Quick entry form"
		>
			<QuickEntryForm
				{workspaceId}
				{availableTags}
				{payeeHistory}
				onClose={() => (showForm = false)}
			/>
		</div>
	</div>
{/if}

<style>
	.fab-button {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 30;
		width: 3.5rem;
		height: 3.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
		transition: transform 0.15s ease;
	}

	.fab-button:active {
		transform: scale(0.95);
	}

	.fab-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background-color: rgba(0, 0, 0, 0.5);
	}

	.fab-form-sheet {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 50;
		max-height: 90vh;
		overflow-y: auto;
		border-radius: 1rem 1rem 0 0;
		padding: 1.5rem;
	}

	@media (min-width: 769px) {
		.fab-form-sheet {
			inset: auto;
			bottom: 6rem;
			right: 1.5rem;
			width: 24rem;
			border-radius: 1rem;
		}
	}
</style>
