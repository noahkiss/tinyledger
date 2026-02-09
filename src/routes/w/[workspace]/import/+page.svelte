<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { CSVPreviewResult, ColumnMapping, ValidationResult } from '$lib/server/import/csv-parser';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Wizard step
	let step = $state<'upload' | 'mapping' | 'preview' | 'results'>('upload');

	// Shared state between steps
	let csvText = $state('');
	let previewData = $state<CSVPreviewResult | null>(null);
	let mapping = $state<ColumnMapping>({});
	let validationResult = $state<ValidationResult | null>(null);

	// Tag handling
	let tagActions = $state<Record<string, 'create' | 'map'>>({});
	let tagMappings = $state<Record<string, string>>({});

	// Results
	let importResult = $state<{ imported: number; skipped: number; skippedRows: Array<{ rowNumber: number; errors: string[] }> } | null>(null);

	// Auto-suggest column mappings based on header names
	function autoSuggestMapping(headers: string[]) {
		const newMapping: ColumnMapping = {};
		const lower = headers.map((h) => h.toLowerCase());

		// Date
		const dateIdx = lower.findIndex((h) => h.includes('date') || h === 'when');
		if (dateIdx >= 0) newMapping.date = headers[dateIdx];

		// Type
		const typeIdx = lower.findIndex((h) => h.includes('type') || h === 'category' || h === 'direction');
		if (typeIdx >= 0) newMapping.type = headers[typeIdx];

		// Payee
		const payeeIdx = lower.findIndex((h) => h.includes('payee') || h.includes('vendor') || h.includes('customer') || h === 'name' || h === 'from' || h === 'to');
		if (payeeIdx >= 0) newMapping.payee = headers[payeeIdx];

		// Amount
		const amountIdx = lower.findIndex((h) => h.includes('amount') || h.includes('total') || h.includes('value') || h === 'sum');
		if (amountIdx >= 0) newMapping.amount = headers[amountIdx];

		// Description
		const descIdx = lower.findIndex((h) => h.includes('desc') || h.includes('memo') || h.includes('note'));
		if (descIdx >= 0) newMapping.description = headers[descIdx];

		// Tags
		const tagsIdx = lower.findIndex((h) => h.includes('tag') || h.includes('categor') || h.includes('label'));
		if (tagsIdx >= 0) newMapping.tags = headers[tagsIdx];

		// Payment Method
		const pmIdx = lower.findIndex((h) => h.includes('payment') || h.includes('method') || h === 'how');
		if (pmIdx >= 0) newMapping.paymentMethod = headers[pmIdx];

		// Check Number
		const checkIdx = lower.findIndex((h) => h.includes('check') || h === 'check #' || h === 'check no');
		if (checkIdx >= 0) newMapping.checkNumber = headers[checkIdx];

		mapping = newMapping;
	}

	// Handle preview action response
	$effect(() => {
		if (form?.success && form.preview) {
			previewData = form.preview as CSVPreviewResult;
			csvText = form.csvText as string;
			autoSuggestMapping(previewData.headers);
			step = 'mapping';
		}
	});

	// Handle validation response
	$effect(() => {
		if (form?.success && form.validation) {
			validationResult = form.validation as ValidationResult;

			// Initialize tag actions for unknown tags
			const newActions: Record<string, 'create' | 'map'> = {};
			for (const tag of validationResult.unknownTags) {
				newActions[tag] = 'create';
			}
			tagActions = newActions;
			tagMappings = {};

			step = 'preview';
		}
	});

	// Handle import response
	$effect(() => {
		if (form?.success && form.imported !== undefined) {
			importResult = {
				imported: form.imported as number,
				skipped: form.skipped as number,
				skippedRows: form.skippedRows as Array<{ rowNumber: number; errors: string[] }>
			};
			step = 'results';
		}
	});

	// Reset wizard
	function reset() {
		step = 'upload';
		csvText = '';
		previewData = null;
		mapping = {};
		validationResult = null;
		tagActions = {};
		tagMappings = {};
		importResult = null;
	}

	// Get tags to create based on user choices
	function getTagsToCreate(): string[] {
		return validationResult?.unknownTags.filter((t) => tagActions[t] === 'create') || [];
	}

	// Get tag mappings based on user choices
	function getTagMappingsForImport(): Record<string, string> {
		const result: Record<string, string> = {};
		for (const tag of validationResult?.unknownTags || []) {
			if (tagActions[tag] === 'map' && tagMappings[tag]) {
				result[tag] = tagMappings[tag];
			}
		}
		return result;
	}

	// Check if required mappings are set
	const requiredMappingsSet = $derived(
		mapping.date && mapping.type && mapping.payee && mapping.amount
	);

	// Check if all unknown tags have actions resolved
	const allTagsResolved = $derived(() => {
		if (!validationResult?.unknownTags.length) return true;
		for (const tag of validationResult.unknownTags) {
			if (tagActions[tag] === 'map' && !tagMappings[tag]) return false;
		}
		return true;
	});
</script>

<svelte:head>
	<title>Import Transactions - TinyLedger</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<h2 class="mb-6 text-xl font-semibold text-fg">Import Transactions</h2>

	<!-- Progress Steps -->
	<div class="mb-8">
		<nav class="flex items-center justify-center gap-4">
			{#each [
				{ id: 'upload', label: '1. Upload', icon: 'solar:upload-bold' },
				{ id: 'mapping', label: '2. Map Columns', icon: 'solar:clipboard-list-bold' },
				{ id: 'preview', label: '3. Preview', icon: 'solar:eye-bold' },
				{ id: 'results', label: '4. Results', icon: 'solar:check-circle-bold' }
			] as s}
				{@const isActive = step === s.id}
				{@const isPast = ['upload', 'mapping', 'preview', 'results'].indexOf(step) > ['upload', 'mapping', 'preview', 'results'].indexOf(s.id)}
				<div class="flex items-center gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full {isActive
							? 'bg-primary text-white'
							: isPast
								? 'bg-success text-white'
								: 'bg-surface-alt text-muted'}"
					>
						<iconify-icon icon={s.icon} width="16" height="16"></iconify-icon>
					</div>
					<span class="text-sm font-medium {isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted'}">
						{s.label}
					</span>
				</div>
				{#if s.id !== 'results'}
					<div class="h-px w-8 bg-border"></div>
				{/if}
			{/each}
		</nav>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">
			{form.error}
		</div>
	{/if}

	<!-- Step 1: Upload -->
	{#if step === 'upload'}
		<div class="rounded-lg border border-border bg-card p-6">
			<h3 class="mb-4 text-lg font-medium text-fg">Upload CSV File</h3>
			<p class="mb-6 text-sm text-muted">
				Upload a CSV file containing your transaction data. The file should have headers in the first row.
			</p>

			<form method="POST" action="?/preview" enctype="multipart/form-data" use:enhance>
				<div class="mb-6">
					<label for="file" class="block text-sm font-medium text-fg mb-2">
						Select CSV File
					</label>
					<input
						type="file"
						id="file"
						name="file"
						accept=".csv,text/csv"
						required
						class="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
					/>
					<p class="mt-2 text-xs text-muted">Maximum file size: 5MB</p>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
					>
						<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
						Upload & Preview
					</button>
				</div>
			</form>

			<!-- Format Help -->
			<div class="mt-8 rounded-lg border border-card-border bg-surface p-4">
				<h4 class="text-sm font-medium text-fg mb-2">Expected CSV Format</h4>
				<p class="text-xs text-muted mb-3">
					Your CSV should have headers for Date, Type (income/expense), Payee, and Amount.
					Optional columns: Description, Tags (comma-separated), Payment Method, Check Number.
				</p>
				<div class="text-xs font-mono bg-card p-3 rounded border border-border overflow-x-auto">
					<pre>Date,Type,Payee,Amount,Description,Tags
2026-01-15,expense,Office Depot,125.50,Printer paper and ink,Office Supplies
2026-01-16,income,Client ABC,1500.00,Website development,Consulting</pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- Step 2: Column Mapping -->
	{#if step === 'mapping' && previewData}
		<div class="rounded-lg border border-border bg-card p-6">
			<h3 class="mb-4 text-lg font-medium text-fg">Map Columns</h3>
			<p class="mb-6 text-sm text-muted">
				Map your CSV columns to transaction fields. We've auto-detected some mappings based on column names.
			</p>

			<form method="POST" action="?/validate" use:enhance>
				<input type="hidden" name="csvText" value={csvText} />
				<input type="hidden" name="mapping" value={JSON.stringify(mapping)} />

				<div class="grid gap-4 sm:grid-cols-2">
					<!-- Date -->
					<div>
						<label for="map-date" class="block text-sm font-medium text-fg">
							Date <span class="text-error">*</span>
						</label>
						<select
							id="map-date"
							bind:value={mapping.date}
							required
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">Select column...</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Type -->
					<div>
						<label for="map-type" class="block text-sm font-medium text-fg">
							Type (income/expense) <span class="text-error">*</span>
						</label>
						<select
							id="map-type"
							bind:value={mapping.type}
							required
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">Select column...</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Payee -->
					<div>
						<label for="map-payee" class="block text-sm font-medium text-fg">
							Payee <span class="text-error">*</span>
						</label>
						<select
							id="map-payee"
							bind:value={mapping.payee}
							required
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">Select column...</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Amount -->
					<div>
						<label for="map-amount" class="block text-sm font-medium text-fg">
							Amount <span class="text-error">*</span>
						</label>
						<select
							id="map-amount"
							bind:value={mapping.amount}
							required
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">Select column...</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Description (optional) -->
					<div>
						<label for="map-description" class="block text-sm font-medium text-fg">
							Description <span class="text-muted">(optional)</span>
						</label>
						<select
							id="map-description"
							bind:value={mapping.description}
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">None</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Tags (optional) -->
					<div>
						<label for="map-tags" class="block text-sm font-medium text-fg">
							Tags <span class="text-muted">(optional)</span>
						</label>
						<select
							id="map-tags"
							bind:value={mapping.tags}
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">None</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Payment Method (optional) -->
					<div>
						<label for="map-payment" class="block text-sm font-medium text-fg">
							Payment Method <span class="text-muted">(optional)</span>
						</label>
						<select
							id="map-payment"
							bind:value={mapping.paymentMethod}
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">None (default: card)</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>

					<!-- Check Number (optional) -->
					<div>
						<label for="map-check" class="block text-sm font-medium text-fg">
							Check Number <span class="text-muted">(optional)</span>
						</label>
						<select
							id="map-check"
							bind:value={mapping.checkNumber}
							class="mt-1 block w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-fg focus:border-input-focus focus:ring-primary"
						>
							<option value="">None</option>
							{#each previewData.headers as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Preview of mapped data -->
				<div class="mt-6">
					<h4 class="text-sm font-medium text-fg mb-2">Sample Data Preview</h4>
					<div class="overflow-x-auto rounded-lg border border-border">
						<table class="min-w-full divide-y divide-border text-sm">
							<thead class="bg-surface">
								<tr>
									<th class="px-3 py-2 text-left text-xs font-medium text-muted">Row</th>
									{#each previewData.headers as header}
										<th class="px-3 py-2 text-left text-xs font-medium text-muted">{header}</th>
									{/each}
								</tr>
							</thead>
							<tbody class="divide-y divide-border bg-card">
								{#each previewData.preview.slice(0, 5) as row}
									<tr>
										<td class="px-3 py-2 text-muted">{row.rowNumber}</td>
										{#each previewData.headers as header}
											<td class="px-3 py-2 text-fg">{row.data[header] || '-'}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="mt-2 text-xs text-muted">
						Showing {Math.min(5, previewData.preview.length)} of {previewData.totalRows} rows
					</p>
				</div>

				<div class="mt-6 flex justify-between">
					<button
						type="button"
						onclick={reset}
						class="rounded-lg border border-input-border bg-card px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
					>
						Start Over
					</button>
					<button
						type="submit"
						disabled={!requiredMappingsSet}
						class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Validate & Preview
						<iconify-icon icon="solar:alt-arrow-right-linear" width="16" height="16"></iconify-icon>
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Step 3: Preview & Validation -->
	{#if step === 'preview' && validationResult}
		<div class="rounded-lg border border-border bg-card p-6">
			<h3 class="mb-4 text-lg font-medium text-fg">Validation Results</h3>

			<!-- Summary Stats -->
			<div class="mb-6 grid grid-cols-3 gap-4">
				<div class="rounded-lg bg-surface p-4">
					<div class="text-2xl font-bold text-fg">{validationResult.valid.length + validationResult.invalid.length}</div>
					<div class="text-sm text-muted">Total Rows</div>
				</div>
				<div class="rounded-lg bg-success/10 p-4">
					<div class="text-2xl font-bold text-success">{validationResult.valid.length}</div>
					<div class="text-sm text-success">Valid</div>
				</div>
				<div class="rounded-lg {validationResult.invalid.length > 0 ? 'bg-error/10' : 'bg-surface'} p-4">
					<div class="text-2xl font-bold {validationResult.invalid.length > 0 ? 'text-error' : 'text-muted'}">{validationResult.invalid.length}</div>
					<div class="text-sm {validationResult.invalid.length > 0 ? 'text-error' : 'text-muted'}">Invalid (will skip)</div>
				</div>
			</div>

			<!-- Unknown Tags Handling -->
			{#if validationResult.unknownTags.length > 0}
				<div class="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-4">
					<h4 class="text-sm font-medium text-warning mb-3">
						Unknown Tags Found ({validationResult.unknownTags.length})
					</h4>
					<p class="text-sm text-warning mb-4">
						These tags don't exist in your workspace. Choose to create them or map to existing tags.
					</p>

					<div class="space-y-3">
						{#each validationResult.unknownTags as tag}
							<div class="flex items-center gap-4 rounded-lg bg-card p-3 border border-warning/30">
								<span class="font-medium text-fg min-w-24">{tag}</span>
								<div class="flex items-center gap-2">
									<label class="inline-flex items-center">
										<input
											type="radio"
											name="tag-{tag}"
											value="create"
											bind:group={tagActions[tag]}
											class="h-4 w-4 text-primary border-input-border"
										/>
										<span class="ml-2 text-sm text-fg">Create new</span>
									</label>
									<label class="inline-flex items-center ml-4">
										<input
											type="radio"
											name="tag-{tag}"
											value="map"
											bind:group={tagActions[tag]}
											class="h-4 w-4 text-primary border-input-border"
										/>
										<span class="ml-2 text-sm text-fg">Map to:</span>
									</label>
									{#if tagActions[tag] === 'map'}
										<select
											bind:value={tagMappings[tag]}
											class="ml-2 rounded-lg border border-input-border bg-input px-2 py-1 text-sm text-fg"
										>
											<option value="">Select...</option>
											{#each data.tags as existingTag}
												<option value={existingTag}>{existingTag}</option>
											{/each}
										</select>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Invalid Rows -->
			{#if validationResult.invalid.length > 0}
				<div class="mb-6">
					<h4 class="text-sm font-medium text-fg mb-2">Invalid Rows (will be skipped)</h4>
					<div class="max-h-48 overflow-y-auto rounded-lg border border-error/30">
						<table class="min-w-full divide-y divide-error/20 text-sm">
							<thead class="bg-error/10 sticky top-0">
								<tr>
									<th class="px-3 py-2 text-left text-xs font-medium text-error">Row</th>
									<th class="px-3 py-2 text-left text-xs font-medium text-error">Errors</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-error/20 bg-card">
								{#each validationResult.invalid as row}
									<tr>
										<td class="px-3 py-2 text-error">{row.rowNumber}</td>
										<td class="px-3 py-2 text-error">{row.errors.join('; ')}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Valid Rows Preview -->
			{#if validationResult.valid.length > 0}
				<div class="mb-6">
					<h4 class="text-sm font-medium text-fg mb-2">Valid Transactions Preview</h4>
					<div class="overflow-x-auto rounded-lg border border-border">
						<table class="min-w-full divide-y divide-border text-sm">
							<thead class="bg-surface">
								<tr>
									<th class="px-3 py-2 text-left text-xs font-medium text-muted">Date</th>
									<th class="px-3 py-2 text-left text-xs font-medium text-muted">Type</th>
									<th class="px-3 py-2 text-left text-xs font-medium text-muted">Payee</th>
									<th class="px-3 py-2 text-right text-xs font-medium text-muted">Amount</th>
									<th class="px-3 py-2 text-left text-xs font-medium text-muted">Tags</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border bg-card">
								{#each validationResult.valid.slice(0, 10) as tx}
									<tr>
										<td class="px-3 py-2 text-fg">{tx.date}</td>
										<td class="px-3 py-2">
											<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}">
												{tx.type}
											</span>
										</td>
										<td class="px-3 py-2 text-fg">{tx.payee}</td>
										<td class="px-3 py-2 text-right text-fg">
											${(tx.amountCents / 100).toFixed(2)}
										</td>
										<td class="px-3 py-2 text-muted">{tx.tags.join(', ') || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if validationResult.valid.length > 10}
						<p class="mt-2 text-xs text-muted">
							Showing 10 of {validationResult.valid.length} valid transactions
						</p>
					{/if}
				</div>
			{/if}

			<!-- Import Form -->
			<form method="POST" action="?/import" use:enhance>
				<input type="hidden" name="csvText" value={csvText} />
				<input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
				<input type="hidden" name="createTags" value={JSON.stringify(getTagsToCreate())} />
				<input type="hidden" name="tagMappings" value={JSON.stringify(getTagMappingsForImport())} />

				<div class="flex justify-between">
					<button
						type="button"
						onclick={() => (step = 'mapping')}
						class="rounded-lg border border-input-border bg-card px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
					>
						Back to Mapping
					</button>
					<button
						type="submit"
						disabled={validationResult.valid.length === 0 || !allTagsResolved()}
						class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
						Import {validationResult.valid.length} Transactions
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Step 4: Results -->
	{#if step === 'results' && importResult}
		<div class="rounded-lg border border-border bg-card p-6">
			<div class="text-center mb-6">
				<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
					<iconify-icon icon="solar:check-circle-bold" class="text-success" width="32" height="32"></iconify-icon>
				</div>
				<h3 class="text-xl font-semibold text-fg">Import Complete</h3>
				<p class="mt-2 text-muted">
					Successfully imported {importResult.imported} transaction{importResult.imported !== 1 ? 's' : ''}.
				</p>
			</div>

			<!-- Summary -->
			<div class="mb-6 grid grid-cols-2 gap-4">
				<div class="rounded-lg bg-success/10 p-4 text-center">
					<div class="text-3xl font-bold text-success">{importResult.imported}</div>
					<div class="text-sm text-success">Imported</div>
				</div>
				<div class="rounded-lg {importResult.skipped > 0 ? 'bg-warning/10' : 'bg-surface'} p-4 text-center">
					<div class="text-3xl font-bold {importResult.skipped > 0 ? 'text-warning' : 'text-muted'}">{importResult.skipped}</div>
					<div class="text-sm {importResult.skipped > 0 ? 'text-warning' : 'text-muted'}">Skipped</div>
				</div>
			</div>

			<!-- Skipped Rows Details -->
			{#if importResult.skippedRows.length > 0}
				<details class="mb-6 rounded-lg border border-warning/30">
					<summary class="cursor-pointer bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
						View skipped rows ({importResult.skippedRows.length})
					</summary>
					<div class="max-h-48 overflow-y-auto p-4">
						<table class="min-w-full text-sm">
							<thead>
								<tr>
									<th class="px-2 py-1 text-left font-medium text-fg">Row</th>
									<th class="px-2 py-1 text-left font-medium text-fg">Errors</th>
								</tr>
							</thead>
							<tbody>
								{#each importResult.skippedRows as row}
									<tr>
										<td class="px-2 py-1 text-muted">{row.rowNumber}</td>
										<td class="px-2 py-1 text-error">{row.errors.join('; ')}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</details>
			{/if}

			<!-- Actions -->
			<div class="flex justify-center gap-4">
				<button
					type="button"
					onclick={reset}
					class="rounded-lg border border-input-border bg-card px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
				>
					Import Another
				</button>
				<a
					href="../transactions"
					class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
				>
					View Transactions
					<iconify-icon icon="solar:alt-arrow-right-linear" width="16" height="16"></iconify-icon>
				</a>
			</div>
		</div>
	{/if}
</div>
