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
	class="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:bg-primary-hover active:scale-95"
	aria-label="Add transaction"
	data-component="quick-entry-fab"
>
	<iconify-icon icon="solar:add-circle-bold" width="32" height="32"></iconify-icon>
</button>

<!-- Form overlay -->
{#if showForm}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/50"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && (showForm = false)}
		role="button"
		tabindex="-1"
		aria-label="Close form"
	>
		<!-- Form sheet -->
		<div
			class="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card p-6 shadow-xl md:inset-auto md:bottom-24 md:right-6 md:w-96 md:rounded-2xl"
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
