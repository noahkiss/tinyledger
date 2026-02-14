<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { formatCurrency } from '$lib/utils/currency';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';
	import PayeeAutocomplete from '$lib/components/PayeeAutocomplete.svelte';
	import AttachmentUpload from '$lib/components/AttachmentUpload.svelte';
	import type { Tag } from '$lib/server/db/schema';

	let { data, form } = $props();

	// Edit mode toggle
	let editMode = $state(false);

	// Edit form state (initialized from data)
	// svelte-ignore state_referenced_locally
	let editType = $state<'income' | 'expense'>(data.transaction.type);
	// svelte-ignore state_referenced_locally
	let editAmount = $state(data.transaction.amountCents);
	// svelte-ignore state_referenced_locally
	let editDate = $state(data.transaction.date);
	// svelte-ignore state_referenced_locally
	let editPayee = $state(data.transaction.payee);
	// svelte-ignore state_referenced_locally
	let editDescription = $state(data.transaction.description || '');
	// svelte-ignore state_referenced_locally
	let editPaymentMethod = $state<'cash' | 'card' | 'check'>(data.transaction.paymentMethod);
	// svelte-ignore state_referenced_locally
	let editCheckNumber = $state(data.transaction.checkNumber || '');
	// svelte-ignore state_referenced_locally
	let editAllocations = $state(
		data.tagAllocations.map((t) => ({
			tagId: t.tagId,
			percentage: t.percentage
		}))
	);

	// Keep track of available tags (can be updated when new tags are created)
	// svelte-ignore state_referenced_locally
	let availableTags = $state<Tag[]>(data.availableTags);

	// Attachment state for edit mode
	let removeAttachment = $state(false);
	// svelte-ignore state_referenced_locally
	let editExistingUrl = $state<string | null>(data.attachment?.url || null);

	// Reset form to current data
	function resetForm() {
		editType = data.transaction.type;
		editAmount = data.transaction.amountCents;
		editDate = data.transaction.date;
		editPayee = data.transaction.payee;
		editDescription = data.transaction.description || '';
		editPaymentMethod = data.transaction.paymentMethod;
		editCheckNumber = data.transaction.checkNumber || '';
		editAllocations = data.tagAllocations.map((t) => ({
			tagId: t.tagId,
			percentage: t.percentage
		}));
		removeAttachment = false;
		editExistingUrl = data.attachment?.url || null;
	}

	// Handle attachment removal in edit mode
	function handleAttachmentRemove() {
		removeAttachment = true;
		editExistingUrl = null;
	}

	// Generate export filename for download link
	function getExportFilename(): string {
		const date = data.transaction.date;
		// Sanitize payee: remove special chars, replace spaces with _, limit 30 chars
		const sanitizedPayee = data.transaction.payee
			.replace(/[^a-zA-Z0-9\s]/g, '')
			.replace(/\s+/g, '_')
			.substring(0, 30);
		const amountDollars = Math.round(data.transaction.amountCents / 100);
		return `${date}_${sanitizedPayee}_$${amountDollars}.jpg`;
	}

	function enterEditMode() {
		resetForm();
		editMode = true;
	}

	function cancelEdit() {
		editMode = false;
		resetForm();
	}

	// Handle inline tag creation
	async function handleCreateTag(name: string): Promise<Tag | null> {
		const formData = new FormData();
		formData.set('name', name);

		const response = await fetch('?/createTag', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success' && result.data?.tag) {
			// Add to available tags list
			availableTags = [...availableTags, result.data.tag].sort((a: Tag, b: Tag) =>
				a.name.localeCompare(b.name)
			);
			return result.data.tag;
		}

		if (result.data?.error) {
			throw new Error(result.data.error);
		}

		return null;
	}

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Format ISO timestamp for display
	function formatTimestamp(isoStr: string): string {
		const date = new Date(isoStr);
		return date.toLocaleString('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	// Get workspace from URL
	const workspace = $derived($page.params.workspace);

	// Check if transaction is voided
	const isVoided = $derived(!!data.transaction.voidedAt);

	// Validation for tag allocations
	const totalPercentage = $derived(editAllocations.reduce((sum, a) => sum + a.percentage, 0));
	const tagsValid = $derived(editAllocations.length === 0 || totalPercentage === 100);
</script>

<svelte:head>
	<title>{data.transaction.payee} - Transaction | TinyLedger</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<!-- Back link -->
	<a href="/w/{workspace}/transactions" class="mb-4 inline-flex items-center text-primary hover:text-primary-hover">
		<iconify-icon icon="solar:alt-arrow-left-linear" class="mr-1" width="20" height="20"></iconify-icon>
		Back to Transactions
	</a>

	<!-- Voided banner -->
	{#if isVoided}
		<div class="mb-4 rounded-md bg-warning/10 border border-warning/30 p-4">
			<div class="flex items-center gap-2">
				<iconify-icon icon="solar:danger-triangle-bold" class="text-warning" width="20" height="20"></iconify-icon>
				<div>
					<p class="font-medium text-warning">This transaction is voided</p>
					<p class="text-sm text-warning/80">Voided on {formatTimestamp(data.transaction.voidedAt!)}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error display -->
	{#if form?.error}
		<div class="mb-4 rounded-md bg-error/10 border border-error/30 p-4 text-error" role="alert">
			{form.error}
		</div>
	{/if}

	<!-- Success display -->
	{#if form?.success}
		<div class="mb-4 rounded-md bg-success/10 border border-success/30 p-4 text-success" role="status" aria-live="polite">
			{#if form.action === 'voided'}
				Transaction has been voided.
			{:else if form.action === 'unvoided'}
				Transaction has been restored.
			{:else if form.message}
				{form.message}
			{:else}
				Changes saved successfully.
			{/if}
		</div>
	{/if}

	<div class="rounded-lg bg-card border border-border" class:opacity-75={isVoided && !editMode}>
		{#if editMode}
			<!-- Edit Mode -->
			<form method="POST" action="?/edit" enctype="multipart/form-data" use:enhance={() => {
				return async ({ update }) => {
					await update();
					editMode = false;
				};
			}}>
				<div class="border-b border-border p-6">
					<h1 class="text-xl font-semibold text-fg">Edit Transaction</h1>
				</div>

				<div class="space-y-6 p-6">
					<!-- Type -->
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-fg mb-2">Type</label>
						<div class="flex gap-4">
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" name="type" value="income" bind:group={editType} class="text-success focus:ring-success" />
								<span class="text-success font-medium">Income</span>
							</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" name="type" value="expense" bind:group={editType} class="text-error focus:ring-error" />
								<span class="text-error font-medium">Expense</span>
							</label>
						</div>
					</div>

					<!-- Amount -->
					<div>
						<label for="amount" class="block text-sm font-medium text-fg mb-2">Amount</label>
						<CurrencyInput bind:value={editAmount} name="amount" id="amount" required class="w-full" />
					</div>

					<!-- Date -->
					<div>
						<label for="date" class="block text-sm font-medium text-fg mb-2">Date</label>
						<DateInput bind:value={editDate} name="date" id="date" required class="w-full" />
					</div>

					<!-- Payee with autocomplete -->
					<div>
						<label for="payee" class="block text-sm font-medium text-fg mb-2">Payee</label>
						<PayeeAutocomplete
							payees={data.payeeHistory}
							bind:value={editPayee}
							placeholder="Enter payee name..."
						/>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="block text-sm font-medium text-fg mb-2">Description (optional)</label>
						<textarea
							id="description"
							name="description"
							bind:value={editDescription}
							rows="2"
							class="w-full rounded-md border border-input-border bg-input px-3 py-2 focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
						></textarea>
					</div>

					<!-- Payment Method -->
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-fg mb-2">Payment Method</label>
						<PaymentMethodSelect bind:value={editPaymentMethod} bind:checkNumber={editCheckNumber} />
					</div>

					<!-- Tags -->
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-fg mb-2">Tags</label>
						<TagSelector
							{availableTags}
							bind:allocations={editAllocations}
							onCreateTag={data.tagsLocked ? undefined : handleCreateTag}
							locked={data.tagsLocked}
						/>
					</div>

					<!-- Receipt Attachment -->
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-fg mb-2">
							Receipt
							<span class="font-normal text-muted">(optional)</span>
						</label>
						<input type="hidden" name="removeAttachment" value={removeAttachment.toString()} />
						<AttachmentUpload
							name="attachment"
							existingUrl={editExistingUrl}
							existingFilename={data.attachment?.filename}
							onRemove={handleAttachmentRemove}
						/>
					</div>
				</div>

				<!-- Edit Actions -->
				<div class="flex justify-end gap-3 border-t border-border p-6">
					<button
						type="button"
						onclick={cancelEdit}
						class="rounded-md border border-input-border px-4 py-2 text-fg transition-colors hover:bg-surface"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!tagsValid}
						class="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Save Changes
					</button>
				</div>
			</form>
		{:else}
			<!-- View Mode -->
			<div class="border-b border-border p-6">
				<div class="flex items-start justify-between">
					<div>
						<span
							class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
							{data.transaction.type === 'income' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}"
						>
							{data.transaction.type === 'income' ? 'Income' : 'Expense'}
						</span>
						<h1 class="mt-2 text-2xl font-bold text-fg">
							{formatCurrency(data.transaction.amountCents)}
						</h1>
					</div>
					<a
						href="/w/{workspace}/transactions/{data.transaction.publicId}/history"
						class="text-sm text-primary hover:text-primary-hover"
					>
						View History
					</a>
				</div>
			</div>

			<div class="space-y-4 p-6">
				<!-- Payee -->
				<div>
					<dt class="text-sm font-medium text-muted">Payee</dt>
					<dd class="mt-1 text-fg">{data.transaction.payee}</dd>
				</div>

				<!-- Date -->
				<div>
					<dt class="text-sm font-medium text-muted">Date</dt>
					<dd class="mt-1 text-fg">{formatDate(data.transaction.date)}</dd>
				</div>

				<!-- Description -->
				{#if data.transaction.description}
					<div>
						<dt class="text-sm font-medium text-muted">Description</dt>
						<dd class="mt-1 text-fg">{data.transaction.description}</dd>
					</div>
				{/if}

				<!-- Payment Method -->
				<div>
					<dt class="text-sm font-medium text-muted">Payment Method</dt>
					<dd class="mt-1 text-fg capitalize">
						{data.transaction.paymentMethod}
						{#if data.transaction.checkNumber}
							<span class="text-muted">#{data.transaction.checkNumber}</span>
						{/if}
					</dd>
				</div>

				<!-- Tags -->
				{#if data.tagAllocations.length > 0}
					<div>
						<dt class="text-sm font-medium text-muted">Tags</dt>
						<dd class="mt-2 flex flex-wrap gap-2">
							{#each data.tagAllocations as allocation}
								<span class="inline-flex items-center rounded-full bg-surface px-3 py-1 text-sm text-fg">
									{allocation.tagName}
									<span class="ml-1 text-muted">({allocation.percentage}%)</span>
								</span>
							{/each}
						</dd>
					</div>
				{/if}

				<!-- Attachment -->
				{#if data.attachment}
					<div>
						<dt class="text-sm font-medium text-muted">Receipt</dt>
						<dd class="mt-2">
							<img
								src={data.attachment.url}
								alt="Receipt attachment"
								class="max-h-64 rounded-md shadow-sm"
							/>
							<div class="mt-2 flex gap-3 text-sm">
								<a
									href={data.attachment.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary hover:text-primary-hover"
								>
									View full size
								</a>
								<a
									href="{data.attachment.downloadUrl}&exportName={encodeURIComponent(getExportFilename())}"
									class="text-primary hover:text-primary-hover"
								>
									Download
								</a>
							</div>
						</dd>
					</div>
				{/if}

				<!-- Timestamps -->
				<div class="border-t border-card-border pt-4 text-sm text-muted">
					<p>Created: {formatTimestamp(data.transaction.createdAt)}</p>
					{#if data.transaction.updatedAt !== data.transaction.createdAt}
						<p>Updated: {formatTimestamp(data.transaction.updatedAt)}</p>
					{/if}
				</div>
			</div>

			<!-- View Actions -->
			<div class="flex flex-wrap gap-3 border-t border-border p-6">
				{#if !isVoided}
					<button
						onclick={enterEditMode}
						class="rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-hover"
					>
						Edit
					</button>
					<form method="POST" action="?/void" use:enhance>
						<button
							type="submit"
							onclick={(e) => {
								if (!confirm('Are you sure you want to void this transaction?')) {
									e.preventDefault();
								}
							}}
							class="rounded-md bg-warning px-4 py-2 text-white transition-colors hover:bg-warning-hover"
						>
							Void Transaction
						</button>
					</form>
				{:else}
					<form method="POST" action="?/unvoid" use:enhance>
						<button
							type="submit"
							class="rounded-md bg-success px-4 py-2 text-white transition-colors hover:bg-success-hover"
						>
							Restore Transaction
						</button>
					</form>
					<form method="POST" action="?/delete" use:enhance>
						<button
							type="submit"
							onclick={(e) => {
								if (!confirm('Are you sure you want to permanently delete this transaction? This action cannot be undone.')) {
									e.preventDefault();
								}
							}}
							class="rounded-md bg-error px-4 py-2 text-white transition-colors hover:bg-error-hover"
						>
							Permanently Delete
						</button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>
