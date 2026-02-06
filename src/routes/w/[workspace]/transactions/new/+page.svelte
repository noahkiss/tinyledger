<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';
	import PayeeAutocomplete from '$lib/components/PayeeAutocomplete.svelte';
	import AttachmentUpload from '$lib/components/AttachmentUpload.svelte';
	import type { Tag } from '$lib/server/db/schema';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Check for recurring prefill first, then URL query param
	let transactionType = $derived(
		data.recurringPrefill?.type ||
			($page.url.searchParams.get('type') as 'income' | 'expense') ||
			'expense'
	);

	// Form state - initialize from recurring prefill if present
	let amountCents = $state(data.recurringPrefill?.amountCents || 0);
	let dateValue = $state(data.recurringPrefill?.date || getTodayDate());
	let payee = $state(data.recurringPrefill?.payee || '');
	let description = $state(data.recurringPrefill?.description || '');
	let paymentMethod = $state<'cash' | 'card' | 'check'>(
		data.recurringPrefill?.paymentMethod || 'cash'
	);
	let checkNumber = $state('');
	let tagAllocations = $state<{ tagId: number; percentage: number }[]>(
		data.recurringPrefill?.tags.map((t) => ({ tagId: t.id, percentage: t.percentage })) || []
	);

	// Predictive entry state
	let suggestedTags = $state<{ id: number; name: string; percentage: number }[]>([]);
	let suggestedAmount = $state<number | null>(null);

	// Keep track of available tags (can be updated when new tags are created)
	let availableTags = $state<Tag[]>(data.tags);

	// Helper to get today's date in YYYY-MM-DD format
	function getTodayDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Handle payee selection from autocomplete
	function handlePayeeSelect(payeeData: (typeof data.payeeHistory)[0]) {
		// Set tag suggestions (will be auto-populated by TagSelector if allocations is empty)
		suggestedTags = payeeData.lastTags;

		// Set amount hint (only if same transaction type)
		if (payeeData.lastType === transactionType) {
			suggestedAmount = payeeData.lastAmount;
		} else {
			suggestedAmount = null;
		}
	}

	// Handle using suggested amount
	function useSuggestedAmount() {
		if (suggestedAmount !== null) {
			amountCents = suggestedAmount;
			suggestedAmount = null;
		}
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

	// Derived for UI
	let typeLabel = $derived(transactionType === 'income' ? 'Income' : 'Expense');
	let submitButtonClass = $derived(
		transactionType === 'income' ? 'is-success' : 'is-danger'
	);
</script>

<svelte:head>
	<title>New {typeLabel} - TinyLedger</title>
</svelte:head>

<div class="new-transaction-page">
	<!-- Header -->
	<div class="is-flex is-align-items-center mb-5" style="gap: 1rem;">
		<a
			href="/w/{data.workspaceId}/transactions"
			class="back-button"
			aria-label="Back to transactions"
		>
			<iconify-icon icon="solar:alt-arrow-left-linear" width="20" height="20"></iconify-icon>
		</a>
		<h2 class="title is-4 mb-0">New {typeLabel} Transaction</h2>
	</div>

	<!-- Error display -->
	{#if form?.error}
		<div class="notification is-danger is-light mb-5">
			<p class="has-text-weight-medium">Error</p>
			<p class="mt-1 is-size-7">{form.error}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" use:enhance class="form-fields" enctype="multipart/form-data">
		<!-- Hidden field for transaction type -->
		<input type="hidden" name="type" value={transactionType} />
		<!-- Hidden field for recurring template ID (when confirming a recurring instance) -->
		{#if data.recurringPrefill?.templateId}
			<input type="hidden" name="recurringTemplateId" value={data.recurringPrefill.templateId} />
		{/if}

		<!-- Amount -->
		<div class="field">
			<label for="amount" class="label">Amount</label>
			<div class="control">
				<CurrencyInput bind:value={amountCents} name="amount" id="amount" required />
			</div>
			{#if suggestedAmount !== null}
				<p class="help">
					Last amount: ${(suggestedAmount / 100).toFixed(2)}
					<button type="button" class="suggested-amount-btn" onclick={useSuggestedAmount}>
						Use this
					</button>
				</p>
			{/if}
		</div>

		<!-- Date -->
		<div class="field">
			<label for="date" class="label">Date</label>
			<div class="control">
				<DateInput bind:value={dateValue} name="date" id="date" required />
			</div>
		</div>

		<!-- Payee with autocomplete -->
		<div class="field">
			<label for="payee" class="label">
				{transactionType === 'income' ? 'Received from' : 'Paid to'}
			</label>
			<div class="control">
				<PayeeAutocomplete
					payees={data.payeeHistory}
					bind:value={payee}
					onSelect={handlePayeeSelect}
					placeholder={transactionType === 'income' ? 'e.g., Client Name' : 'e.g., Office Depot'}
				/>
			</div>
		</div>

		<!-- Description -->
		<div class="field">
			<label for="description" class="label">
				Description
				<span class="has-text-weight-normal has-text-grey">(optional)</span>
			</label>
			<div class="control">
				<textarea
					id="description"
					name="description"
					bind:value={description}
					rows="2"
					class="textarea"
					placeholder="Add any notes about this transaction..."
				></textarea>
			</div>
		</div>

		<!-- Payment Method -->
		<div class="field">
			<label class="label">Payment Method</label>
			<div class="control">
				<PaymentMethodSelect bind:value={paymentMethod} bind:checkNumber />
			</div>
		</div>

		<!-- Tags -->
		<div class="field">
			<label class="label">
				Tags
				<span class="has-text-weight-normal has-text-grey">(optional)</span>
			</label>
			<div class="control">
				<TagSelector
					{availableTags}
					bind:allocations={tagAllocations}
					onCreateTag={data.tagsLocked ? undefined : handleCreateTag}
					locked={data.tagsLocked}
					{suggestedTags}
				/>
			</div>
		</div>

		<!-- Receipt Attachment -->
		<div class="field">
			<label class="label">
				Receipt
				<span class="has-text-weight-normal has-text-grey">(optional)</span>
			</label>
			<div class="control">
				<AttachmentUpload name="attachment" />
			</div>
		</div>

		<!-- Submit -->
		<div class="field pt-4">
			<div class="control">
				<button
					type="submit"
					class="button is-large is-fullwidth has-text-weight-semibold {submitButtonClass}"
				>
					Create {typeLabel}
				</button>
			</div>
		</div>
	</form>
</div>

<style>
	.new-transaction-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border-radius: 0.5rem;
		color: var(--color-muted);
	}
	.back-button:hover {
		background-color: var(--color-surface);
	}
	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.suggested-amount-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		padding: 0;
		margin-left: 0.25rem;
		font-size: inherit;
	}
	.suggested-amount-btn:hover {
		text-decoration: underline;
	}
</style>
