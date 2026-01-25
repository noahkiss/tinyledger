<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';

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

	// Helper to get today's date in YYYY-MM-DD format
	function getTodayDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
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
		</div>

		<!-- Date -->
		<div>
			<label for="date" class="block text-sm font-medium text-gray-700">Date</label>
			<div class="mt-1">
				<DateInput bind:value={dateValue} name="date" id="date" required class="w-full" />
			</div>
		</div>

		<!-- Payee -->
		<div>
			<label for="payee" class="block text-sm font-medium text-gray-700">
				{transactionType === 'income' ? 'Received from' : 'Paid to'}
			</label>
			<div class="mt-1">
				<input
					type="text"
					id="payee"
					name="payee"
					bind:value={payee}
					required
					class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
				{#if data.tags.length === 0}
					<p class="text-sm text-gray-500">
						No tags available. Tags can be created in settings.
					</p>
				{:else}
					<TagSelector availableTags={data.tags} bind:allocations={tagAllocations} />
				{/if}
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
