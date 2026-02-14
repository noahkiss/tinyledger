<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import CurrencyInput from '$lib/components/CurrencyInput.svelte';
	import TagSelector from '$lib/components/TagSelector.svelte';
	import PaymentMethodSelect from '$lib/components/PaymentMethodSelect.svelte';
	import Select from '$lib/components/Select.svelte';
	import Input from '$lib/components/Input.svelte';
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

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-semibold text-fg">Recurring Transactions</h2>
		<button
			type="button"
			class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
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
		<div class="rounded-md bg-error/10 p-4 text-error" role="alert">
			<p class="font-medium">Error</p>
			<p class="mt-1 text-sm">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-md bg-success/10 p-4 text-success" role="status" aria-live="polite">
			<p class="font-medium">Success</p>
			<p class="mt-1 text-sm">Recurring template saved.</p>
		</div>
	{/if}

	<!-- Create/Edit Form -->
	{#if showCreateForm}
		<div class="rounded-lg border border-border bg-card p-6">
			<h3 class="mb-4 text-lg font-medium text-fg">
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
				class="space-y-6"
			>
				{#if editingTemplate}
					<input type="hidden" name="templateId" value={editingTemplate.id} />
				{/if}

				<!-- Type Selection -->
				<div>
					<label class="block text-sm font-medium text-fg">Type</label>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors {transactionType ===
							'income'
								? 'bg-success text-white'
								: 'bg-surface text-fg hover:bg-surface-alt'}"
							onclick={() => (transactionType = 'income')}
						>
							Income
						</button>
						<button
							type="button"
							class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors {transactionType ===
							'expense'
								? 'bg-error text-white'
								: 'bg-surface text-fg hover:bg-surface-alt'}"
							onclick={() => (transactionType = 'expense')}
						>
							Expense
						</button>
					</div>
					<input type="hidden" name="type" value={transactionType} />
				</div>

				<!-- Amount -->
				<div>
					<label for="amount" class="block text-sm font-medium text-fg">Amount</label>
					<div class="mt-1">
						<CurrencyInput bind:value={amountCents} name="amount" id="amount" required class="w-full" />
					</div>
				</div>

				<!-- Payee -->
				<div>
					<label for="payee" class="block text-sm font-medium text-fg">
						{transactionType === 'income' ? 'Received from' : 'Paid to'}
					</label>
					<div class="mt-1">
						<Input
							type="text"
							id="payee"
							name="payee"
							bind:value={payee}
							required
							placeholder={transactionType === 'income' ? 'e.g., Client Name' : 'e.g., Rent'}
							class="w-full" inputSize="lg"
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
							class="w-full rounded-md border border-input-border bg-input px-4 py-3 text-fg focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
							placeholder="Add any notes..."
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
						/>
					</div>
				</div>

				<!-- Pattern Selection -->
				<div class="rounded-lg border border-border bg-surface p-4">
					<label for="frequency" class="block text-sm font-medium text-fg">Recurrence Pattern</label>
					<div class="mt-2">
						<Select
							id="frequency"
							name="frequency"
							bind:value={frequency}
							options={[
								{ value: 'daily', label: 'Daily' },
								{ value: 'weekly', label: 'Weekly' },
								{ value: 'biweekly', label: 'Every 2 weeks' },
								{ value: 'monthly', label: 'Monthly' },
								{ value: 'quarterly', label: 'Quarterly (every 3 months)' },
								{ value: 'yearly', label: 'Yearly' },
								{ value: 'custom', label: 'Custom interval...' }
							]}
							size="sm"
						/>
					</div>

					{#if frequency === 'custom'}
						<div class="mt-3 flex items-center gap-2">
							<span class="text-sm text-muted">Every</span>
							<Input
								type="number"
								name="interval"
								bind:value={interval}
								min="1"
								max="365"
								class="w-16 text-center" inputSize="sm"
							/>
							<Select
								name="customUnit"
								bind:value={customUnit}
								options={[
									{ value: 'day', label: 'day(s)' },
									{ value: 'week', label: 'week(s)' },
									{ value: 'month', label: 'month(s)' }
								]}
								size="sm"
							/>
						</div>
					{/if}
				</div>

				<!-- Date Range -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="startDate" class="block text-sm font-medium text-fg">Start Date</label>
						<Input
							type="date"
							id="startDate"
							name="startDate"
							bind:value={startDate}
							required
							class="mt-1 w-full" inputSize="lg"
						/>
					</div>

					<div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="hasEndDate"
								name="hasEndDate"
								bind:checked={hasEndDate}
								class="h-4 w-4 rounded border-input-border text-primary focus:ring-2 focus:ring-primary/50"
							/>
							<label for="hasEndDate" class="text-sm font-medium text-fg">Set end date</label>
						</div>
						{#if hasEndDate}
							<Input
								type="date"
								id="endDate"
								name="endDate"
								bind:value={endDate}
								min={startDate}
								class="mt-2 w-full" inputSize="lg"
							/>
						{/if}
					</div>
				</div>

				<!-- Submit -->
				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="rounded-md border border-input-border bg-card px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
						onclick={() => {
							showCreateForm = false;
							resetForm();
						}}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover"
					>
						{editingTemplate ? 'Update Template' : 'Create Recurring'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Active Templates -->
	{#if activeTemplates.length > 0}
		<div class="space-y-3">
			<h3 class="text-lg font-medium text-fg">Active Recurring ({activeTemplates.length})</h3>
			{#each activeTemplates as template (template.id)}
				<div class="rounded-lg border border-border bg-card p-4">
					<div class="flex items-start justify-between">
						<div class="flex items-start gap-3">
							<!-- Type indicator -->
							<div
								class="mt-1 flex h-8 w-8 items-center justify-center rounded-full {template.type ===
								'income'
									? 'bg-success/10'
									: 'bg-error/10'}"
							>
								{#if template.type === 'income'}
									<iconify-icon icon="solar:add-circle-bold" class="text-success" width="16" height="16"></iconify-icon>
								{:else}
									<iconify-icon icon="solar:minus-circle-bold" class="text-error" width="16" height="16"></iconify-icon>
								{/if}
							</div>

							<div>
								<div class="flex items-center gap-2">
									<span class="font-medium text-fg">{template.payee}</span>
									<span class="text-lg font-semibold {template.type === 'income' ? 'text-success' : 'text-error'}">
										{template.type === 'income' ? '+' : '-'}{formatCurrency(template.amountCents)}
									</span>
								</div>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
									<span>{template.patternDescription}</span>
									<span class="text-muted">|</span>
									<span>Started {formatDate(template.startDate)}</span>
									{#if template.endDate}
										<span class="text-muted">|</span>
										<span>Ends {formatDate(template.endDate)}</span>
									{/if}
								</div>
								{#if template.nextOccurrence}
									<div class="mt-1 text-sm text-primary">
										Next: {formatDate(template.nextOccurrence)}
									</div>
								{/if}
								{#if template.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each template.tags as tag}
											<span class="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
												{tag.tagName}
												{#if tag.percentage < 100}
													<span class="text-muted">({tag.percentage}%)</span>
												{/if}
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="rounded-md p-2 text-muted hover:bg-surface hover:text-fg"
								onclick={() => editTemplate(template)}
								title="Edit"
							>
								<iconify-icon icon="solar:pen-bold" width="16" height="16"></iconify-icon>
							</button>
							<form method="POST" action="?/deactivate" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-md p-2 text-muted hover:bg-warning/10 hover:text-warning"
									title="Deactivate"
								>
									<iconify-icon icon="solar:pause-bold" width="16" height="16"></iconify-icon>
								</button>
							</form>
							<form method="POST" action="?/delete" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-md p-2 text-muted hover:bg-error/10 hover:text-error"
									title="Delete"
								>
									<iconify-icon icon="solar:trash-bin-bold" width="16" height="16"></iconify-icon>
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if !showCreateForm}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<iconify-icon icon="solar:restart-bold" class="mx-auto text-muted" width="48" height="48"></iconify-icon>
			<p class="mt-4 text-muted">No recurring transactions set up</p>
			<p class="mt-1 text-sm text-muted">
				Create a recurring template for expenses like rent, subscriptions, or regular client payments.
			</p>
			<button
				type="button"
				class="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
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
		<div class="mt-8 space-y-3">
			<h3 class="text-lg font-medium text-muted">Inactive ({inactiveTemplates.length})</h3>
			{#each inactiveTemplates as template (template.id)}
				<div class="rounded-lg border border-border bg-surface p-4 opacity-60">
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-muted">{template.payee}</span>
								<span class="text-muted">
									{template.type === 'income' ? '+' : '-'}{formatCurrency(template.amountCents)}
								</span>
								<span class="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-muted">Inactive</span>
							</div>
							<div class="mt-1 text-sm text-muted">
								{template.patternDescription}
							</div>
						</div>
						<div class="flex items-center gap-1">
							<form method="POST" action="?/activate" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-md p-2 text-muted hover:bg-success/10 hover:text-success"
									title="Reactivate"
								>
									<iconify-icon icon="solar:play-bold" width="16" height="16"></iconify-icon>
								</button>
							</form>
							<form method="POST" action="?/delete" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-md p-2 text-muted hover:bg-error/10 hover:text-error"
									title="Delete"
								>
									<iconify-icon icon="solar:trash-bin-bold" width="16" height="16"></iconify-icon>
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
