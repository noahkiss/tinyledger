<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';
	import PayeeAutocomplete from '$lib/components/PayeeAutocomplete.svelte';
	import type { Tag } from '$lib/server/db/schema';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Get type from URL query param, default to expense
	let transactionType = $derived(
		($page.url.searchParams.get('type') as 'income' | 'expense') || 'expense'
	);

	// Form state
	let amountCents = $state(0);
	let dateValue = $state(getTodayDate());
	let payee = $state('');
	let description = $state('');
	let paymentMethod = $state<'cash' | 'card' | 'check'>('cash');
	let checkNumber = $state('');
	let tagAllocations = $state<{ tagId: number; percentage: number }[]>([]);

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
			class="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
			aria-label="Back to transactions"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
		</a>
		<h2 class="text-2xl font-semibold text-gray-900">New {typeLabel} Transaction</h2>
	</div>

	<!-- Error display -->
	{#if form?.error}
		<div class="rounded-lg bg-red-50 p-4 text-red-700">
			<p class="font-medium">Error</p>
			<p class="mt-1 text-sm">{form.error}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" use:enhance class="space-y-6">
		<!-- Hidden field for transaction type -->
		<input type="hidden" name="type" value={transactionType} />

		<!-- Amount -->
		<div>
			<label for="amount" class="block text-sm font-medium text-gray-700">Amount</label>
			<div class="mt-1">
				<CurrencyInput bind:value={amountCents} name="amount" id="amount" required class="w-full" />
			</div>
			{#if suggestedAmount !== null}
				<p class="mt-1 text-xs text-gray-500">
					Last amount: ${(suggestedAmount / 100).toFixed(2)}
					<button type="button" class="ml-1 text-blue-600 hover:underline" onclick={useSuggestedAmount}>
						Use this
					</button>
				</p>
			{/if}
		</div>

		<!-- Date -->
		<div>
			<label for="date" class="block text-sm font-medium text-gray-700">Date</label>
			<div class="mt-1">
				<DateInput bind:value={dateValue} name="date" id="date" required class="w-full" />
			</div>
		</div>

		<!-- Payee with autocomplete -->
		<div>
			<label for="payee" class="block text-sm font-medium text-gray-700">
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
			<label for="description" class="block text-sm font-medium text-gray-700">
				Description
				<span class="font-normal text-gray-500">(optional)</span>
			</label>
			<div class="mt-1">
				<textarea
					id="description"
					name="description"
					bind:value={description}
					rows="2"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="Add any notes about this transaction..."
				></textarea>
			</div>
		</div>

		<!-- Payment Method -->
		<div>
			<label class="block text-sm font-medium text-gray-700">Payment Method</label>
			<div class="mt-1">
				<PaymentMethodSelect bind:value={paymentMethod} bind:checkNumber />
			</div>
		</div>

		<!-- Tags -->
		<div>
			<label class="block text-sm font-medium text-gray-700">
				Tags
				<span class="font-normal text-gray-500">(optional)</span>
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
