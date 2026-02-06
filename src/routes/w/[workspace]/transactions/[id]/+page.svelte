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
	let editType = $state<'income' | 'expense'>(data.transaction.type);
	let editAmount = $state(data.transaction.amountCents);
	let editDate = $state(data.transaction.date);
	let editPayee = $state(data.transaction.payee);
	let editDescription = $state(data.transaction.description || '');
	let editPaymentMethod = $state<'cash' | 'card' | 'check'>(data.transaction.paymentMethod);
	let editCheckNumber = $state(data.transaction.checkNumber || '');
	let editAllocations = $state(
		data.tagAllocations.map((t) => ({
			tagId: t.tagId,
			percentage: t.percentage
		}))
	);

	// Keep track of available tags (can be updated when new tags are created)
	let availableTags = $state<Tag[]>(data.availableTags);

	// Attachment state for edit mode
	let removeAttachment = $state(false);
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

<div class="container detail-container">
	<!-- Back link -->
	<a href="/w/{workspace}/transactions" class="back-link mb-4">
		<iconify-icon icon="solar:alt-arrow-left-linear" class="mr-1" width="20" height="20"></iconify-icon>
		Back to Transactions
	</a>

	<!-- Voided banner -->
	{#if isVoided}
		<div class="notification is-warning is-light mb-4">
			<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
				<iconify-icon icon="solar:danger-triangle-bold" width="20" height="20"></iconify-icon>
				<div>
					<p class="has-text-weight-medium">This transaction is voided</p>
					<p class="is-size-7 voided-date">Voided on {formatTimestamp(data.transaction.voidedAt!)}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error display -->
	{#if form?.error}
		<div class="notification is-danger is-light mb-4">
			{form.error}
		</div>
	{/if}

	<!-- Success display -->
	{#if form?.success}
		<div class="notification is-success is-light mb-4">
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

	<div class="box" class:is-voided={isVoided && !editMode}>
		{#if editMode}
			<!-- Edit Mode -->
			<form method="POST" action="?/edit" enctype="multipart/form-data" use:enhance={() => {
				return async ({ update }) => {
					await update();
					editMode = false;
				};
			}}>
				<div class="card-section card-section-border-bottom">
					<h1 class="title is-5 mb-0">Edit Transaction</h1>
				</div>

				<div class="card-section form-fields">
					<!-- Type -->
					<div class="field">
						<label class="label">Type</label>
						<div class="is-flex" style="gap: 1rem;">
							<label class="radio-label">
								<input type="radio" name="type" value="income" bind:group={editType} class="radio" />
								<span class="has-text-success has-text-weight-medium">Income</span>
							</label>
							<label class="radio-label">
								<input type="radio" name="type" value="expense" bind:group={editType} class="radio" />
								<span class="has-text-danger has-text-weight-medium">Expense</span>
							</label>
						</div>
					</div>

					<!-- Amount -->
					<div class="field">
						<label for="amount" class="label">Amount</label>
						<CurrencyInput bind:value={editAmount} name="amount" id="amount" required />
					</div>

					<!-- Date -->
					<div class="field">
						<label for="date" class="label">Date</label>
						<DateInput bind:value={editDate} name="date" id="date" required />
					</div>

					<!-- Payee with autocomplete -->
					<div class="field">
						<label for="payee" class="label">Payee</label>
						<PayeeAutocomplete
							payees={data.payeeHistory}
							bind:value={editPayee}
							placeholder="Enter payee name..."
						/>
					</div>

					<!-- Description -->
					<div class="field">
						<label for="description" class="label">Description (optional)</label>
						<textarea
							id="description"
							name="description"
							bind:value={editDescription}
							rows="2"
							class="textarea"
						></textarea>
					</div>

					<!-- Payment Method -->
					<div class="field">
						<label class="label">Payment Method</label>
						<PaymentMethodSelect bind:value={editPaymentMethod} bind:checkNumber={editCheckNumber} />
					</div>

					<!-- Tags -->
					<div class="field">
						<label class="label">Tags</label>
						<TagSelector
							{availableTags}
							bind:allocations={editAllocations}
							onCreateTag={data.tagsLocked ? undefined : handleCreateTag}
							locked={data.tagsLocked}
						/>
					</div>

					<!-- Receipt Attachment -->
					<div class="field">
						<label class="label">
							Receipt
							<span class="has-text-weight-normal has-text-grey">(optional)</span>
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
				<div class="card-section card-section-border-top is-flex is-justify-content-flex-end" style="gap: 0.75rem;">
					<button
						type="button"
						onclick={cancelEdit}
						class="button is-light"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!tagsValid}
						class="button is-primary"
					>
						Save Changes
					</button>
				</div>
			</form>
		{:else}
			<!-- View Mode -->
			<div class="card-section card-section-border-bottom">
				<div class="is-flex is-justify-content-space-between" style="align-items: flex-start;">
					<div>
						<span
							class="tag is-medium {data.transaction.type === 'income' ? 'is-success is-light' : 'is-danger is-light'}"
						>
							{data.transaction.type === 'income' ? 'Income' : 'Expense'}
						</span>
						<h1 class="title is-4 mt-2 mb-0">
							{formatCurrency(data.transaction.amountCents)}
						</h1>
					</div>
					<a
						href="/w/{workspace}/transactions/{data.transaction.publicId}/history"
						class="history-link is-size-7"
					>
						View History
					</a>
				</div>
			</div>

			<div class="card-section detail-fields">
				<!-- Payee -->
				<div>
					<dt class="label is-small">Payee</dt>
					<dd class="mt-1">{data.transaction.payee}</dd>
				</div>

				<!-- Date -->
				<div>
					<dt class="label is-small">Date</dt>
					<dd class="mt-1">{formatDate(data.transaction.date)}</dd>
				</div>

				<!-- Description -->
				{#if data.transaction.description}
					<div>
						<dt class="label is-small">Description</dt>
						<dd class="mt-1">{data.transaction.description}</dd>
					</div>
				{/if}

				<!-- Payment Method -->
				<div>
					<dt class="label is-small">Payment Method</dt>
					<dd class="mt-1 payment-method">
						{data.transaction.paymentMethod}
						{#if data.transaction.checkNumber}
							<span class="has-text-grey">#{data.transaction.checkNumber}</span>
						{/if}
					</dd>
				</div>

				<!-- Tags -->
				{#if data.tagAllocations.length > 0}
					<div>
						<dt class="label is-small">Tags</dt>
						<dd class="mt-2 tags">
							{#each data.tagAllocations as allocation}
								<span class="tag">
									{allocation.tagName}
									<span class="has-text-grey ml-1">({allocation.percentage}%)</span>
								</span>
							{/each}
						</dd>
					</div>
				{/if}

				<!-- Attachment -->
				{#if data.attachment}
					<div>
						<dt class="label is-small">Receipt</dt>
						<dd class="mt-2">
							<img
								src={data.attachment.url}
								alt="Receipt attachment"
								class="receipt-image"
							/>
							<div class="mt-2 is-flex is-size-7" style="gap: 0.75rem;">
								<a
									href={data.attachment.url}
									target="_blank"
									rel="noopener noreferrer"
									class="history-link"
								>
									View full size
								</a>
								<a
									href="{data.attachment.downloadUrl}&exportName={encodeURIComponent(getExportFilename())}"
									class="history-link"
								>
									Download
								</a>
							</div>
						</dd>
					</div>
				{/if}

				<!-- Timestamps -->
				<div class="timestamps">
					<p>Created: {formatTimestamp(data.transaction.createdAt)}</p>
					{#if data.transaction.updatedAt !== data.transaction.createdAt}
						<p>Updated: {formatTimestamp(data.transaction.updatedAt)}</p>
					{/if}
				</div>
			</div>

			<!-- View Actions -->
			<div class="card-section card-section-border-top is-flex is-flex-wrap-wrap" style="gap: 0.75rem;">
				{#if !isVoided}
					<button
						onclick={enterEditMode}
						class="button is-primary"
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
							class="button is-warning"
						>
							Void Transaction
						</button>
					</form>
				{:else}
					<form method="POST" action="?/unvoid" use:enhance>
						<button
							type="submit"
							class="button is-success"
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
							class="button is-danger"
						>
							Permanently Delete
						</button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.detail-container {
		max-width: 42rem;
		padding: 1.5rem;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		color: var(--color-primary);
	}
	.back-link:hover {
		color: var(--color-primary);
		opacity: 0.85;
	}
	.voided-date {
		opacity: 0.8;
	}
	.is-voided {
		opacity: 0.75;
	}
	.card-section {
		padding: 1.5rem;
	}
	.card-section-border-bottom {
		border-bottom: 1px solid var(--color-border);
	}
	.card-section-border-top {
		border-top: 1px solid var(--color-border);
	}
	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.detail-fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.radio-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}
	.history-link {
		color: var(--color-primary);
	}
	.history-link:hover {
		color: var(--color-primary);
		opacity: 0.85;
	}
	.payment-method {
		text-transform: capitalize;
	}
	.receipt-image {
		max-height: 16rem;
		border-radius: 0.5rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}
	.timestamps {
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}
</style>
