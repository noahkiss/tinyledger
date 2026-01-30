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
	class="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:bg-blue-700 active:scale-95"
	aria-label="Add transaction"
>
	<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" />
	</svg>
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
			class="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl md:inset-auto md:bottom-24 md:right-6 md:w-96 md:rounded-2xl"
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
