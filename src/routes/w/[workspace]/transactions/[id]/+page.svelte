<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { formatCurrency } from '$lib/utils/currency';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import DateInput from '$lib/components/DateInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';

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
	}

	function enterEditMode() {
		resetForm();
		editMode = true;
	}

	function cancelEdit() {
		editMode = false;
		resetForm();
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
	<a href="/w/{workspace}/transactions" class="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800">
		<svg class="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Back to Transactions
	</a>

	<!-- Voided banner -->
	{#if isVoided}
		<div class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<div>
					<p class="font-medium text-amber-800">This transaction is voided</p>
					<p class="text-sm text-amber-600">Voided on {formatTimestamp(data.transaction.voidedAt!)}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error display -->
	{#if form?.error}
		<div class="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
			{form.error}
		</div>
	{/if}

	<!-- Success display -->
	{#if form?.success}
		<div class="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
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

	<div class="rounded-lg bg-white shadow-sm border border-gray-200" class:opacity-75={isVoided && !editMode}>
		{#if editMode}
			<!-- Edit Mode -->
			<form method="POST" action="?/edit" use:enhance={() => {
				return async ({ update }) => {
					await update();
					editMode = false;
				};
			}}>
				<div class="border-b border-gray-200 p-6">
					<h1 class="text-xl font-semibold text-gray-900">Edit Transaction</h1>
				</div>

				<div class="space-y-6 p-6">
					<!-- Type -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
						<div class="flex gap-4">
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" name="type" value="income" bind:group={editType} class="text-green-600 focus:ring-green-500" />
								<span class="text-green-600 font-medium">Income</span>
							</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="radio" name="type" value="expense" bind:group={editType} class="text-red-600 focus:ring-red-500" />
								<span class="text-red-600 font-medium">Expense</span>
							</label>
						</div>
					</div>

					<!-- Amount -->
					<div>
						<label for="amount" class="block text-sm font-medium text-gray-700 mb-2">Amount</label>
						<CurrencyInput bind:value={editAmount} name="amount" id="amount" required class="w-full" />
					</div>

					<!-- Date -->
					<div>
						<label for="date" class="block text-sm font-medium text-gray-700 mb-2">Date</label>
						<DateInput bind:value={editDate} name="date" id="date" required class="w-full" />
					</div>

					<!-- Payee -->
					<div>
						<label for="payee" class="block text-sm font-medium text-gray-700 mb-2">Payee</label>
						<input
							type="text"
							id="payee"
							name="payee"
							bind:value={editPayee}
							required
							class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
						<textarea
							id="description"
							name="description"
							bind:value={editDescription}
							rows="2"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						></textarea>
					</div>

					<!-- Payment Method -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
						<PaymentMethodSelect bind:value={editPaymentMethod} bind:checkNumber={editCheckNumber} />
					</div>

					<!-- Tags -->
					{#if data.availableTags.length > 0}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
							<TagSelector availableTags={data.availableTags} bind:allocations={editAllocations} />
						</div>
					{/if}
				</div>

				<!-- Edit Actions -->
				<div class="flex justify-end gap-3 border-t border-gray-200 p-6">
					<button
						type="button"
						onclick={cancelEdit}
						class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!tagsValid}
						class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Save Changes
					</button>
				</div>
			</form>
		{:else}
			<!-- View Mode -->
			<div class="border-b border-gray-200 p-6">
				<div class="flex items-start justify-between">
					<div>
						<span
							class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
							{data.transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}"
						>
							{data.transaction.type === 'income' ? 'Income' : 'Expense'}
						</span>
						<h1 class="mt-2 text-2xl font-bold text-gray-900">
							{formatCurrency(data.transaction.amountCents)}
						</h1>
					</div>
					<a
						href="/w/{workspace}/transactions/{data.transaction.publicId}/history"
						class="text-sm text-blue-600 hover:text-blue-800"
					>
						View History
					</a>
				</div>
			</div>

			<div class="space-y-4 p-6">
				<!-- Payee -->
				<div>
					<dt class="text-sm font-medium text-gray-500">Payee</dt>
					<dd class="mt-1 text-gray-900">{data.transaction.payee}</dd>
				</div>

				<!-- Date -->
				<div>
					<dt class="text-sm font-medium text-gray-500">Date</dt>
					<dd class="mt-1 text-gray-900">{formatDate(data.transaction.date)}</dd>
				</div>

				<!-- Description -->
				{#if data.transaction.description}
					<div>
						<dt class="text-sm font-medium text-gray-500">Description</dt>
						<dd class="mt-1 text-gray-900">{data.transaction.description}</dd>
					</div>
				{/if}

				<!-- Payment Method -->
				<div>
					<dt class="text-sm font-medium text-gray-500">Payment Method</dt>
					<dd class="mt-1 text-gray-900 capitalize">
						{data.transaction.paymentMethod}
						{#if data.transaction.checkNumber}
							<span class="text-gray-500">#{data.transaction.checkNumber}</span>
						{/if}
					</dd>
				</div>

				<!-- Tags -->
				{#if data.tagAllocations.length > 0}
					<div>
						<dt class="text-sm font-medium text-gray-500">Tags</dt>
						<dd class="mt-2 flex flex-wrap gap-2">
							{#each data.tagAllocations as allocation}
								<span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
									{allocation.tagName}
									<span class="ml-1 text-gray-500">({allocation.percentage}%)</span>
								</span>
							{/each}
						</dd>
					</div>
				{/if}

				<!-- Timestamps -->
				<div class="border-t border-gray-100 pt-4 text-sm text-gray-500">
					<p>Created: {formatTimestamp(data.transaction.createdAt)}</p>
					{#if data.transaction.updatedAt !== data.transaction.createdAt}
						<p>Updated: {formatTimestamp(data.transaction.updatedAt)}</p>
					{/if}
				</div>
			</div>

			<!-- View Actions -->
			<div class="flex flex-wrap gap-3 border-t border-gray-200 p-6">
				{#if !isVoided}
					<button
						onclick={enterEditMode}
						class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
							class="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
						>
							Void Transaction
						</button>
					</form>
				{:else}
					<form method="POST" action="?/unvoid" use:enhance>
						<button
							type="submit"
							class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
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
							class="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
						>
							Permanently Delete
						</button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>
