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

<div>
	<!-- Header -->
	<div class="is-flex is-align-items-center is-justify-content-space-between mb-4">
		<h3 class="is-size-5 has-text-weight-semibold">Quick Entry</h3>
		<button
			type="button"
			onclick={onClose}
			class="button is-ghost close-btn"
			aria-label="Close"
		>
			<span class="icon">
				<iconify-icon icon="solar:close-circle-linear" width="20" height="20"></iconify-icon>
			</span>
		</button>
	</div>

	<!-- Success indicator -->
	{#if showSuccess}
		<div class="notification is-success is-light mb-4">
			<div class="is-flex is-align-items-center">
				<span class="icon mr-2">
					<iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
				</span>
				<span class="is-size-7 has-text-weight-medium">Transaction added!</span>
			</div>
		</div>
	{/if}

	<!-- Error display -->
	{#if errorMessage}
		<div class="notification is-danger is-light is-size-7 mb-4">
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
	>
		<!-- Type toggle -->
		<div class="field">
			<button
				type="button"
				onclick={() => (type = type === 'income' ? 'expense' : 'income')}
				class="button is-fullwidth is-medium type-toggle"
				class:is-income={type === 'income'}
				class:is-expense={type === 'expense'}
			>
				<span class="is-size-4">{type === 'income' ? '+' : '-'}</span>
				<span class="ml-2">{type === 'income' ? 'Income' : 'Expense'}</span>
			</button>
			<input type="hidden" name="type" value={type} />
		</div>

		<!-- Amount -->
		<div class="field">
			<label for="quick-amount" class="label is-small">Amount</label>
			<div class="control">
				<CurrencyInput
					bind:value={amountCents}
					name="amount"
					id="quick-amount"
					required
					class="is-fullwidth"
				/>
			</div>
		</div>

		<!-- Payee with simple autocomplete -->
		<div class="field">
			<label for="quick-payee" class="label is-small">
				{type === 'income' ? 'Received from' : 'Paid to'}
			</label>
			<div class="control payee-container">
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
					class="input"
				/>

				{#if showPayeeDropdown && filteredPayees.length > 0}
					<div class="payee-dropdown">
						{#each filteredPayees as p (p.payee)}
							<button
								type="button"
								class="payee-option"
								onmousedown={() => handlePayeeSelect(p)}
							>
								<div class="has-text-weight-medium">{p.payee}</div>
								<div class="is-size-7 muted-text">
									{p.count}x | ${(p.lastAmount / 100).toFixed(2)}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Date -->
		<div class="field">
			<label for="quick-date" class="label is-small">Date</label>
			<div class="control">
				<DateInput bind:value={dateValue} name="date" id="quick-date" required class="is-fullwidth" />
			</div>
		</div>

		<!-- Tag (simplified - single tag only) -->
		{#if availableTags.length > 0}
			<div class="field">
				<label for="quick-tag" class="label is-small">
					Tag <span class="has-text-weight-normal muted-text">(optional)</span>
				</label>
				<div class="control">
					<div class="select is-fullwidth">
						<select
							id="quick-tag"
							bind:value={selectedTagId}
						>
							<option value={null}>No tag</option>
							{#each availableTags as tag (tag.id)}
								<option value={tag.id}>{tag.name}</option>
							{/each}
						</select>
					</div>
				</div>
				{#if selectedTagId !== null}
					<input type="hidden" name="tag_0" value={selectedTagId} />
					<input type="hidden" name="percentage_0" value="100" />
				{/if}
			</div>
		{/if}

		<!-- Description -->
		<div class="field">
			<label for="quick-description" class="label is-small">
				Note <span class="has-text-weight-normal muted-text">(optional)</span>
			</label>
			<div class="control">
				<input
					type="text"
					id="quick-description"
					name="description"
					bind:value={description}
					placeholder="Brief note..."
					class="input"
				/>
			</div>
		</div>

		<!-- Hidden defaults -->
		<input type="hidden" name="paymentMethod" value="card" />

		<!-- Submit -->
		<div class="field mt-5">
			<button
				type="submit"
				disabled={isSubmitting}
				class="button is-medium is-fullwidth has-text-weight-semibold submit-btn"
				class:is-income={type === 'income'}
				class:is-expense={type === 'expense'}
			>
				{#if isSubmitting}
					Adding...
				{:else}
					Add {type === 'income' ? 'Income' : 'Expense'}
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	.close-btn {
		color: var(--color-muted);
		border: none;
	}

	.close-btn:hover {
		background-color: var(--color-surface);
	}

	.type-toggle {
		font-weight: 600;
		color: white;
		border: none;
		border-radius: 0.75rem;
	}

	.type-toggle.is-income {
		background-color: var(--color-success);
	}

	.type-toggle.is-income:hover {
		background-color: var(--color-success-hover);
	}

	.type-toggle.is-expense {
		background-color: var(--color-error);
	}

	.type-toggle.is-expense:hover {
		background-color: var(--color-error-hover);
	}

	.submit-btn {
		color: white;
		border: none;
		border-radius: 0.75rem;
	}

	.submit-btn.is-income {
		background-color: var(--color-success);
	}

	.submit-btn.is-income:hover {
		background-color: var(--color-success-hover);
	}

	.submit-btn.is-expense {
		background-color: var(--color-error);
	}

	.submit-btn.is-expense:hover {
		background-color: var(--color-error-hover);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.muted-text {
		color: var(--color-muted);
	}

	.payee-container {
		position: relative;
	}

	.payee-dropdown {
		position: absolute;
		z-index: 10;
		margin-top: 0.25rem;
		width: 100%;
		max-height: 12rem;
		overflow-y: auto;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background-color: var(--color-card-bg);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	.payee-option {
		display: block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
	}

	.payee-option:hover {
		background-color: var(--color-surface);
	}
</style>
