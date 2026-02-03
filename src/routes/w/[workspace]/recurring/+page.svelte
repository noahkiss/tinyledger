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

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-semibold text-gray-900">Recurring Transactions</h2>
		<button
			type="button"
			class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
		<div class="rounded-lg bg-red-50 p-4 text-red-700">
			<p class="font-medium">Error</p>
			<p class="mt-1 text-sm">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="rounded-lg bg-green-50 p-4 text-green-700">
			<p class="font-medium">Success</p>
			<p class="mt-1 text-sm">Recurring template saved.</p>
		</div>
	{/if}

	<!-- Create/Edit Form -->
	{#if showCreateForm}
		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">
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
					<label class="block text-sm font-medium text-gray-700">Type</label>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors {transactionType ===
							'income'
								? 'bg-green-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							onclick={() => (transactionType = 'income')}
						>
							Income
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors {transactionType ===
							'expense'
								? 'bg-red-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							onclick={() => (transactionType = 'expense')}
						>
							Expense
						</button>
					</div>
					<input type="hidden" name="type" value={transactionType} />
				</div>

				<!-- Amount -->
				<div>
					<label for="amount" class="block text-sm font-medium text-gray-700">Amount</label>
					<div class="mt-1">
						<CurrencyInput bind:value={amountCents} name="amount" id="amount" required class="w-full" />
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
							placeholder={transactionType === 'income' ? 'e.g., Client Name' : 'e.g., Rent'}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
							placeholder="Add any notes..."
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
						/>
					</div>
				</div>

				<!-- Pattern Selection -->
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
					<label for="frequency" class="block text-sm font-medium text-gray-700">Recurrence Pattern</label>
					<div class="mt-2">
						<select
							id="frequency"
							name="frequency"
							bind:value={frequency}
							class="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

					{#if frequency === 'custom'}
						<div class="mt-3 flex items-center gap-2">
							<span class="text-sm text-gray-600">Every</span>
							<input
								type="number"
								name="interval"
								bind:value={interval}
								min="1"
								max="365"
								class="w-16 rounded-lg border border-gray-300 px-2 py-1 text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
							<select
								name="customUnit"
								bind:value={customUnit}
								class="rounded-lg border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							>
								<option value="day">day(s)</option>
								<option value="week">week(s)</option>
								<option value="month">month(s)</option>
							</select>
						</div>
					{/if}
				</div>

				<!-- Date Range -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="startDate" class="block text-sm font-medium text-gray-700">Start Date</label>
						<input
							type="date"
							id="startDate"
							name="startDate"
							bind:value={startDate}
							required
							class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="hasEndDate"
								name="hasEndDate"
								bind:checked={hasEndDate}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<label for="hasEndDate" class="text-sm font-medium text-gray-700">Set end date</label>
						</div>
						{#if hasEndDate}
							<input
								type="date"
								id="endDate"
								name="endDate"
								bind:value={endDate}
								min={startDate}
								class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						{/if}
					</div>
				</div>

				<!-- Submit -->
				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						onclick={() => {
							showCreateForm = false;
							resetForm();
						}}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
			<h3 class="text-lg font-medium text-gray-900">Active Recurring ({activeTemplates.length})</h3>
			{#each activeTemplates as template (template.id)}
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<div class="flex items-start justify-between">
						<div class="flex items-start gap-3">
							<!-- Type indicator -->
							<div
								class="mt-1 flex h-8 w-8 items-center justify-center rounded-full {template.type ===
								'income'
									? 'bg-green-100'
									: 'bg-red-100'}"
							>
								{#if template.type === 'income'}
									<svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" />
									</svg>
								{:else}
									<svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
									</svg>
								{/if}
							</div>

							<div>
								<div class="flex items-center gap-2">
									<span class="font-medium text-gray-900">{template.payee}</span>
									<span class="text-lg font-semibold {template.type === 'income' ? 'text-green-600' : 'text-red-600'}">
										{template.type === 'income' ? '+' : '-'}{formatCurrency(template.amountCents)}
									</span>
								</div>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
									<span>{template.patternDescription}</span>
									<span class="text-gray-300">|</span>
									<span>Started {formatDate(template.startDate)}</span>
									{#if template.endDate}
										<span class="text-gray-300">|</span>
										<span>Ends {formatDate(template.endDate)}</span>
									{/if}
								</div>
								{#if template.nextOccurrence}
									<div class="mt-1 text-sm text-blue-600">
										Next: {formatDate(template.nextOccurrence)}
									</div>
								{/if}
								{#if template.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each template.tags as tag}
											<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
												{tag.tagName}
												{#if tag.percentage < 100}
													<span class="text-gray-400">({tag.percentage}%)</span>
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
								class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
								onclick={() => editTemplate(template)}
								title="Edit"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</button>
							<form method="POST" action="?/deactivate" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-lg p-2 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"
									title="Deactivate"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</button>
							</form>
							<form method="POST" action="?/delete" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
									title="Delete"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if !showCreateForm}
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			<p class="mt-4 text-gray-600">No recurring transactions set up</p>
			<p class="mt-1 text-sm text-gray-500">
				Create a recurring template for expenses like rent, subscriptions, or regular client payments.
			</p>
			<button
				type="button"
				class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
			<h3 class="text-lg font-medium text-gray-500">Inactive ({inactiveTemplates.length})</h3>
			{#each inactiveTemplates as template (template.id)}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60">
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-gray-600">{template.payee}</span>
								<span class="text-gray-500">
									{template.type === 'income' ? '+' : '-'}{formatCurrency(template.amountCents)}
								</span>
								<span class="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">Inactive</span>
							</div>
							<div class="mt-1 text-sm text-gray-400">
								{template.patternDescription}
							</div>
						</div>
						<div class="flex items-center gap-1">
							<form method="POST" action="?/activate" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-lg p-2 text-gray-400 hover:bg-green-50 hover:text-green-600"
									title="Reactivate"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</button>
							</form>
							<form method="POST" action="?/delete" use:enhance class="inline">
								<input type="hidden" name="templateId" value={template.id} />
								<button
									type="submit"
									class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
									title="Delete"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
