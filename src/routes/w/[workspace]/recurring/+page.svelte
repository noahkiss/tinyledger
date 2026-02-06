<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import type { Tag } from '$lib/server/db/schema';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let showCreateForm = $state(false);
	let transactionType = $state<'income' | 'expense'>('expense');
	let amountCents = $state(0);
	let payee = $state('');
	let description = $state('');
	let paymentMethod = $state<'cash' | 'card' | 'check'>('card');
	let checkNumber = $state('');
	let tagAllocations = $state<{ tagId: number; percentage: number }[]>([]);
	let frequency = $state<string>('monthly');
	let interval = $state(1);
	let customUnit = $state<'day' | 'week' | 'month'>('week');
	let startDate = $state(getTodayDate());
	let hasEndDate = $state(false);
	let endDate = $state('');

	// Keep track of available tags (can be updated when new tags are created)
	let availableTags = $state<Tag[]>(data.tags);

	// Edit state
	let editingTemplate = $state<(typeof data.templates)[0] | null>(null);

	// Helper to get today's date in YYYY-MM-DD format
	function getTodayDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Reset form
	function resetForm() {
		transactionType = 'expense';
		amountCents = 0;
		payee = '';
		description = '';
		paymentMethod = 'card';
		checkNumber = '';
		tagAllocations = [];
		frequency = 'monthly';
		interval = 1;
		customUnit = 'week';
		startDate = getTodayDate();
		hasEndDate = false;
		endDate = '';
		editingTemplate = null;
	}

	// Populate form for editing
	function editTemplate(template: (typeof data.templates)[0]) {
		editingTemplate = template;
		transactionType = template.type;
		amountCents = template.amountCents;
		payee = template.payee;
		description = template.description || '';
		paymentMethod = template.paymentMethod;
		checkNumber = '';
		tagAllocations = template.tags.map((t) => ({ tagId: t.tagId, percentage: t.percentage }));
		startDate = template.startDate;
		hasEndDate = !!template.endDate;
		endDate = template.endDate || '';

		// Parse pattern description to set frequency
		const pd = template.patternDescription.toLowerCase();
		if (pd === 'every day') frequency = 'daily';
		else if (pd === 'every week') frequency = 'weekly';
		else if (pd === 'every 2 weeks') frequency = 'biweekly';
		else if (pd === 'every month') frequency = 'monthly';
		else if (pd === 'every 3 months') frequency = 'quarterly';
		else if (pd === 'every year') frequency = 'yearly';
		else {
			frequency = 'custom';
			// Try to extract interval and unit
			const match = pd.match(/every (\d+) (day|week|month)/);
			if (match) {
				interval = parseInt(match[1]);
				customUnit = match[2] as 'day' | 'week' | 'month';
			}
		}

		showCreateForm = true;
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
		const d = new Date(dateStr + 'T12:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// Active vs inactive templates
	let activeTemplates = $derived(data.templates.filter((t) => t.active));
	let inactiveTemplates = $derived(data.templates.filter((t) => !t.active));
</script>

<svelte:head>
	<title>Recurring Transactions - TinyLedger</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="is-flex is-align-items-center is-justify-content-space-between mb-5">
		<h2 class="title is-4 mb-0">Recurring Transactions</h2>
		<button
			type="button"
			class="button is-primary"
			onclick={() => {
				resetForm();
				showCreateForm = !showCreateForm;
			}}
		>
			{showCreateForm ? 'Cancel' : '+ New Recurring'}
		</button>
	</div>

	<!-- Error/Success messages -->
	{#if form?.error}
		<div class="notification is-danger is-light mb-4">
			<p class="has-text-weight-medium">Error</p>
			<p class="is-size-7 mt-1">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="notification is-success is-light mb-4">
			<p class="has-text-weight-medium">Success</p>
			<p class="is-size-7 mt-1">Recurring template saved.</p>
		</div>
	{/if}

	<!-- Create/Edit Form -->
	{#if showCreateForm}
		<div class="box mb-5">
			<h3 class="title is-5 mb-4">
				{editingTemplate ? 'Edit Recurring Template' : 'Create Recurring Template'}
			</h3>

			<form
				method="POST"
				action={editingTemplate ? '?/update' : '?/create'}
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							showCreateForm = false;
							resetForm();
						}
					};
				}}
			>
				{#if editingTemplate}
					<input type="hidden" name="templateId" value={editingTemplate.id} />
				{/if}

				<!-- Type Selection -->
				<div class="field">
					<label class="label">Type</label>
					<div class="buttons">
						<button
							type="button"
							class="button {transactionType === 'income' ? 'is-success' : ''}"
							onclick={() => (transactionType = 'income')}
						>
							Income
						</button>
						<button
							type="button"
							class="button {transactionType === 'expense' ? 'is-danger' : ''}"
							onclick={() => (transactionType = 'expense')}
						>
							Expense
						</button>
					</div>
					<input type="hidden" name="type" value={transactionType} />
				</div>

				<!-- Amount -->
				<div class="field">
					<label for="amount" class="label">Amount</label>
					<div class="control">
						<CurrencyInput bind:value={amountCents} name="amount" id="amount" required class="w-full" />
					</div>
				</div>

				<!-- Payee -->
				<div class="field">
					<label for="payee" class="label">
						{transactionType === 'income' ? 'Received from' : 'Paid to'}
					</label>
					<div class="control">
						<input
							type="text"
							id="payee"
							name="payee"
							bind:value={payee}
							required
							placeholder={transactionType === 'income' ? 'e.g., Client Name' : 'e.g., Rent'}
							class="input"
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
							placeholder="Add any notes..."
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
						/>
					</div>
				</div>

				<!-- Pattern Selection -->
				<div class="box" style="background: var(--color-surface);">
					<div class="field">
						<label for="frequency" class="label">Recurrence Pattern</label>
						<div class="control">
							<div class="select">
								<select
									id="frequency"
									name="frequency"
									bind:value={frequency}
								>
									<option value="daily">Daily</option>
									<option value="weekly">Weekly</option>
									<option value="biweekly">Every 2 weeks</option>
									<option value="monthly">Monthly</option>
									<option value="quarterly">Quarterly (every 3 months)</option>
									<option value="yearly">Yearly</option>
									<option value="custom">Custom interval...</option>
								</select>
							</div>
						</div>
					</div>

					{#if frequency === 'custom'}
						<div class="is-flex is-align-items-center mt-3" style="gap: 0.5rem;">
							<span class="is-size-7 has-text-grey">Every</span>
							<div class="control" style="width: 4rem;">
								<input
									type="number"
									name="interval"
									bind:value={interval}
									min="1"
									max="365"
									class="input is-small has-text-centered"
								/>
							</div>
							<div class="select is-small">
								<select
									name="customUnit"
									bind:value={customUnit}
								>
									<option value="day">day(s)</option>
									<option value="week">week(s)</option>
									<option value="month">month(s)</option>
								</select>
							</div>
						</div>
					{/if}
				</div>

				<!-- Date Range -->
				<div class="columns mt-4">
					<div class="column">
						<div class="field">
							<label for="startDate" class="label">Start Date</label>
							<div class="control">
								<input
									type="date"
									id="startDate"
									name="startDate"
									bind:value={startDate}
									required
									class="input"
								/>
							</div>
						</div>
					</div>

					<div class="column">
						<div class="field">
							<label class="checkbox">
								<input
									type="checkbox"
									id="hasEndDate"
									name="hasEndDate"
									bind:checked={hasEndDate}
								/>
								Set end date
							</label>
							{#if hasEndDate}
								<div class="control mt-2">
									<input
										type="date"
										id="endDate"
										name="endDate"
										bind:value={endDate}
										min={startDate}
										class="input"
									/>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Submit -->
				<div class="field is-grouped mt-4">
					<div class="control">
						<button
							type="button"
							class="button"
							onclick={() => {
								showCreateForm = false;
								resetForm();
							}}
						>
							Cancel
						</button>
					</div>
					<div class="control">
						<button
							type="submit"
							class="button is-primary"
						>
							{editingTemplate ? 'Update Template' : 'Create Recurring'}
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}

	<!-- Active Templates -->
	{#if activeTemplates.length > 0}
		<div class="mb-5">
			<h3 class="title is-5 mb-4">Active Recurring ({activeTemplates.length})</h3>
			{#each activeTemplates as template (template.id)}
				<div class="box mb-3">
					<div class="is-flex is-justify-content-space-between" style="align-items: flex-start;">
						<div class="is-flex" style="align-items: flex-start; gap: 0.75rem;">
							<!-- Type indicator -->
							<div
								class="type-icon {template.type === 'income' ? 'is-income' : 'is-expense'}"
							>
								{#if template.type === 'income'}
									<iconify-icon icon="solar:add-circle-bold" width="16" height="16"></iconify-icon>
								{:else}
									<iconify-icon icon="solar:minus-circle-bold" width="16" height="16"></iconify-icon>
								{/if}
							</div>

							<div>
								<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
									<span class="has-text-weight-medium">{template.payee}</span>
									<span class="title is-6 mb-0 {template.type === 'income' ? 'has-text-success' : 'has-text-danger'}">
										{template.type === 'income' ? '+' : '-'}{formatCurrency(template.amountCents)}
									</span>
								</div>
								<div class="is-size-7 has-text-grey mt-1 is-flex is-flex-wrap-wrap is-align-items-center" style="gap: 0.5rem;">
									<span>{template.patternDescription}</span>
									<span class="has-text-grey">|</span>
									<span>Started {formatDate(template.startDate)}</span>
									{#if template.endDate}
										<span class="has-text-grey">|</span>
										<span>Ends {formatDate(template.endDate)}</span>
									{/if}
								</div>
								{#if template.nextOccurrence}
									<div class="is-size-7 has-text-primary mt-1">
										Next: {formatDate(template.nextOccurrence)}
									</div>
								{/if}
								{#if template.tags.length > 0}
									<div class="tags mt-2">
										{#each template.tags as tag}
											<span class="tag is-small is-light">
												{tag.tagName}
												{#if tag.percentage < 100}
													<span class="has-text-grey ml-1">({tag.percentage}%)</span>
												{/if}
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						<div class="is-flex is-align-items-center" style="gap: 0.25rem;">
							<button
								type="button"
								class="button is-ghost is-small"
								onclick={() => editTemplate(template)}
								title="Edit"
							>
								<span class="icon">
									<iconify-icon icon="solar:pen-bold" width="16" height="16"></iconify-icon>
								</span>
							</button>
							<form method="POST" action="?/deactivate" use:enhance class="is-inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="button is-ghost is-small"
									title="Deactivate"
								>
									<span class="icon has-text-warning">
										<iconify-icon icon="solar:pause-bold" width="16" height="16"></iconify-icon>
									</span>
								</button>
							</form>
							<form method="POST" action="?/delete" use:enhance class="is-inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="button is-ghost is-small"
									title="Delete"
								>
									<span class="icon has-text-danger">
										<iconify-icon icon="solar:trash-bin-bold" width="16" height="16"></iconify-icon>
									</span>
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if !showCreateForm}
		<div class="box has-text-centered p-6">
			<iconify-icon icon="solar:restart-bold" class="has-text-grey" width="48" height="48"></iconify-icon>
			<p class="has-text-grey mt-4">No recurring transactions set up</p>
			<p class="is-size-7 has-text-grey mt-1">
				Create a recurring template for expenses like rent, subscriptions, or regular client payments.
			</p>
			<button
				type="button"
				class="button is-primary mt-4"
				onclick={() => {
					resetForm();
					showCreateForm = true;
				}}
			>
				Create Recurring Template
			</button>
		</div>
	{/if}

	<!-- Inactive Templates -->
	{#if inactiveTemplates.length > 0}
		<div class="mt-5">
			<h3 class="title is-5 has-text-grey mb-4">Inactive ({inactiveTemplates.length})</h3>
			{#each inactiveTemplates as template (template.id)}
				<div class="box mb-3" style="opacity: 0.6; background: var(--color-surface);">
					<div class="is-flex is-justify-content-space-between" style="align-items: flex-start;">
						<div>
							<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
								<span class="has-text-weight-medium has-text-grey">{template.payee}</span>
								<span class="has-text-grey">
									{template.type === 'income' ? '+' : '-'}{formatCurrency(template.amountCents)}
								</span>
								<span class="tag is-small is-light">Inactive</span>
							</div>
							<div class="is-size-7 has-text-grey mt-1">
								{template.patternDescription}
							</div>
						</div>
						<div class="is-flex is-align-items-center" style="gap: 0.25rem;">
							<form method="POST" action="?/activate" use:enhance class="is-inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="button is-ghost is-small"
									title="Reactivate"
								>
									<span class="icon has-text-success">
										<iconify-icon icon="solar:play-bold" width="16" height="16"></iconify-icon>
									</span>
								</button>
							</form>
							<form method="POST" action="?/delete" use:enhance class="is-inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="button is-ghost is-small"
									title="Delete"
								>
									<span class="icon has-text-danger">
										<iconify-icon icon="solar:trash-bin-bold" width="16" height="16"></iconify-icon>
									</span>
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.type-icon {
		margin-top: 0.125rem;
		display: flex;
		width: 2rem;
		height: 2rem;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.type-icon.is-income {
		background-color: var(--color-success-muted, #f0fdf4);
		color: var(--color-success);
	}
	.type-icon.is-expense {
		background-color: var(--color-error-muted, #fef2f2);
		color: var(--color-error);
	}
</style>
