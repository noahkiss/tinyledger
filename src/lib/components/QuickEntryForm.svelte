<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CurrencyInput from './CurrencyInput.svelte';
	import DateInput from './DateInput.svelte';
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
		payeeHistory = [],
		onClose
	}: {
		workspaceId: string;
		availableTags: Tag[];
		payeeHistory: PayeeHistory[];
		onClose: () => void;
	} = $props();

	// Form state
	let type = $state<'income' | 'expense'>('income');
	let amountCents = $state(0);
	let dateValue = $state(getTodayDate());
	let payee = $state('');
	let description = $state('');
	let selectedTagId = $state<number | null>(null);

	// UI state
	let isSubmitting = $state(false);
	let showSuccess = $state(false);
	let errorMessage = $state('');

	// Payee autocomplete state
	let showPayeeDropdown = $state(false);
	let filteredPayees = $derived(
		payee.trim()
			? payeeHistory.filter((p) => p.payee.toLowerCase().includes(payee.toLowerCase())).slice(0, 5)
			: payeeHistory.slice(0, 5)
	);

	function getTodayDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function resetForm() {
		type = 'income';
		amountCents = 0;
		dateValue = getTodayDate();
		payee = '';
		description = '';
		selectedTagId = null;
		errorMessage = '';
	}

	function handlePayeeSelect(p: PayeeHistory) {
		payee = p.payee;
		showPayeeDropdown = false;

		// Auto-fill type from last transaction
		type = p.lastType;

		// Auto-fill tag if they had one
		if (p.lastTags.length > 0) {
			selectedTagId = p.lastTags[0].id;
		}
	}

	function handlePayeeFocus() {
		showPayeeDropdown = true;
	}

	function handlePayeeBlur() {
		// Delay to allow click events on dropdown items
		setTimeout(() => {
			showPayeeDropdown = false;
		}, 200);
	}

	function handleSubmitResult(result: { type: string; data?: { error?: string } }) {
		isSubmitting = false;

		if (result.type === 'success') {
			// Show success indicator briefly
			showSuccess = true;
			setTimeout(() => {
				showSuccess = false;
			}, 1500);

			// Reset form for next entry
			resetForm();

			// Refresh data
			invalidateAll();
		} else if (result.type === 'failure' && result.data?.error) {
			errorMessage = result.data.error;
		} else {
			errorMessage = 'Failed to create transaction';
		}
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Quick Entry</h3>
		<button
			type="button"
			onclick={onClose}
			class="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
			aria-label="Close"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Success indicator -->
	{#if showSuccess}
		<div
			class="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-green-700 transition-opacity"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 13l4 4L19 7"
				/>
			</svg>
			<span class="text-sm font-medium">Transaction added!</span>
		</div>
	{/if}

	<!-- Error display -->
	{#if errorMessage}
		<div class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
			{errorMessage}
		</div>
	{/if}

	<form
		method="POST"
		action="/w/{workspaceId}/transactions?/create"
		use:enhance={() => {
			isSubmitting = true;
			errorMessage = '';
			return async ({ result }) => {
				handleSubmitResult(result);
			};
		}}
		class="space-y-4"
	>
		<!-- Type toggle -->
		<div>
			<button
				type="button"
				onclick={() => (type = type === 'income' ? 'expense' : 'income')}
				class="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-lg font-semibold text-white transition-colors"
				class:bg-green-600={type === 'income'}
				class:hover:bg-green-700={type === 'income'}
				class:bg-red-600={type === 'expense'}
				class:hover:bg-red-700={type === 'expense'}
			>
				<span class="text-2xl">{type === 'income' ? '+' : '-'}</span>
				<span>{type === 'income' ? 'Income' : 'Expense'}</span>
			</button>
			<input type="hidden" name="type" value={type} />
		</div>

		<!-- Amount -->
		<div>
			<label for="quick-amount" class="block text-sm font-medium text-gray-700">Amount</label>
			<div class="mt-1">
				<CurrencyInput
					bind:value={amountCents}
					name="amount"
					id="quick-amount"
					required
					class="w-full"
				/>
			</div>
		</div>

		<!-- Payee with simple autocomplete -->
		<div class="relative">
			<label for="quick-payee" class="block text-sm font-medium text-gray-700">
				{type === 'income' ? 'Received from' : 'Paid to'}
			</label>
			<div class="relative mt-1">
				<input
					type="text"
					id="quick-payee"
					name="payee"
					bind:value={payee}
					required
					onfocus={handlePayeeFocus}
					onblur={handlePayeeBlur}
					autocomplete="off"
					placeholder={type === 'income' ? 'e.g., Client Name' : 'e.g., Office Depot'}
					class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>

				{#if showPayeeDropdown && filteredPayees.length > 0}
					<ul
						class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
					>
						{#each filteredPayees as p (p.payee)}
							<li>
								<button
									type="button"
									class="w-full px-3 py-2 text-left hover:bg-gray-100"
									onmousedown={() => handlePayeeSelect(p)}
								>
									<div class="font-medium text-gray-900">{p.payee}</div>
									<div class="text-xs text-gray-500">
										{p.count}x | ${(p.lastAmount / 100).toFixed(2)}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>

		<!-- Date -->
		<div>
			<label for="quick-date" class="block text-sm font-medium text-gray-700">Date</label>
			<div class="mt-1">
				<DateInput bind:value={dateValue} name="date" id="quick-date" required class="w-full" />
			</div>
		</div>

		<!-- Tag (simplified - single tag only) -->
		{#if availableTags.length > 0}
			<div>
				<label for="quick-tag" class="block text-sm font-medium text-gray-700">
					Tag <span class="font-normal text-gray-500">(optional)</span>
				</label>
				<select
					id="quick-tag"
					bind:value={selectedTagId}
					class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value={null}>No tag</option>
					{#each availableTags as tag (tag.id)}
						<option value={tag.id}>{tag.name}</option>
					{/each}
				</select>
				{#if selectedTagId !== null}
					<input type="hidden" name="tag_0" value={selectedTagId} />
					<input type="hidden" name="percentage_0" value="100" />
				{/if}
			</div>
		{/if}

		<!-- Description -->
		<div>
			<label for="quick-description" class="block text-sm font-medium text-gray-700">
				Note <span class="font-normal text-gray-500">(optional)</span>
			</label>
			<input
				type="text"
				id="quick-description"
				name="description"
				bind:value={description}
				placeholder="Brief note..."
				class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<!-- Hidden defaults -->
		<input type="hidden" name="paymentMethod" value="card" />

		<!-- Submit -->
		<button
			type="submit"
			disabled={isSubmitting}
			class="w-full rounded-xl px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
			class:bg-green-600={type === 'income'}
			class:hover:bg-green-700={type === 'income'}
			class:bg-red-600={type === 'expense'}
			class:hover:bg-red-700={type === 'expense'}
		>
			{#if isSubmitting}
				Adding...
			{:else}
				Add {type === 'income' ? 'Income' : 'Expense'}
			{/if}
		</button>
	</form>
</div>
