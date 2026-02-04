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
	let submitButtonColor = $derived(
		transactionType === 'income'
			? 'bg-green-600 hover:bg-green-700 active:bg-green-800'
			: 'bg-red-600 hover:bg-red-700 active:bg-red-800'
	);
</script>

<svelte:head>
	<title>New {typeLabel} - TinyLedger</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a
			href="/w/{data.workspaceId}/transactions"
			class="rounded-lg p-2 text-muted hover:bg-surface"
			aria-label="Back to transactions"
		>
			<iconify-icon icon="solar:alt-arrow-left-linear" width="20" height="20"></iconify-icon>
		</a>
		<h2 class="text-2xl font-semibold text-fg">New {typeLabel} Transaction</h2>
	</div>

	<!-- Error display -->
	{#if form?.error}
		<div class="rounded-lg bg-error/10 p-4 text-error">
			<p class="font-medium">Error</p>
			<p class="mt-1 text-sm">{form.error}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" use:enhance class="space-y-6" enctype="multipart/form-data">
		<!-- Hidden field for transaction type -->
		<input type="hidden" name="type" value={transactionType} />
		<!-- Hidden field for recurring template ID (when confirming a recurring instance) -->
		{#if data.recurringPrefill?.templateId}
			<input type="hidden" name="recurringTemplateId" value={data.recurringPrefill.templateId} />
		{/if}

		<!-- Amount -->
		<div>
			<label for="amount" class="block text-sm font-medium text-fg">Amount</label>
			<div class="mt-1">
				<CurrencyInput bind:value={amountCents} name="amount" id="amount" required class="w-full" />
			</div>
			{#if suggestedAmount !== null}
				<p class="mt-1 text-xs text-muted">
					Last amount: ${(suggestedAmount / 100).toFixed(2)}
					<button type="button" class="ml-1 text-primary hover:underline" onclick={useSuggestedAmount}>
						Use this
					</button>
				</p>
			{/if}
		</div>

		<!-- Date -->
		<div>
			<label for="date" class="block text-sm font-medium text-fg">Date</label>
			<div class="mt-1">
				<DateInput bind:value={dateValue} name="date" id="date" required class="w-full" />
			</div>
		</div>

		<!-- Payee with autocomplete -->
		<div>
			<label for="payee" class="block text-sm font-medium text-fg">
				{transactionType === 'income' ? 'Received from' : 'Paid to'}
			</label>
			<div class="mt-1">
				<PayeeAutocomplete
					payees={data.payeeHistory}
					bind:value={payee}
					onSelect={handlePayeeSelect}
					placeholder={transactionType === 'income' ? 'e.g., Client Name' : 'e.g., Office Depot'}
				/>
			</div>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="block text-sm font-medium text-fg">
				Description
				<span class="font-normal text-muted">(optional)</span>
			</label>
			<div class="mt-1">
				<textarea
					id="description"
					name="description"
					bind:value={description}
					rows="2"
					class="w-full rounded-lg border border-input-border bg-input px-3 py-2 focus:border-input-focus focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="Add any notes about this transaction..."
				></textarea>
			</div>
		</div>

		<!-- Payment Method -->
		<div>
			<label class="block text-sm font-medium text-fg">Payment Method</label>
			<div class="mt-1">
				<PaymentMethodSelect bind:value={paymentMethod} bind:checkNumber />
			</div>
		</div>

		<!-- Tags -->
		<div>
			<label class="block text-sm font-medium text-fg">
				Tags
				<span class="font-normal text-muted">(optional)</span>
			</label>
			<div class="mt-1">
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
		<div>
			<label class="block text-sm font-medium text-fg">
				Receipt
				<span class="font-normal text-muted">(optional)</span>
			</label>
			<div class="mt-1">
				<AttachmentUpload name="attachment" />
			</div>
		</div>

		<!-- Submit -->
		<div class="pt-4">
			<button
				type="submit"
				class="w-full rounded-xl px-6 py-4 text-lg font-semibold text-white shadow-sm {submitButtonColor}"
			>
				Create {typeLabel}
			</button>
		</div>
	</form>
</div>
