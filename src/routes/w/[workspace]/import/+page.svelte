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

<div style="max-width: 56rem; margin: 0 auto;">
	<h2 class="title is-4 mb-5">Import Transactions</h2>

	<!-- Progress Steps -->
	<nav class="is-flex is-align-items-center is-justify-content-center mb-5" style="gap: 1rem;" aria-label="Import progress">
		{#each [
			{ id: 'upload', label: '1. Upload', icon: 'solar:upload-bold' },
			{ id: 'mapping', label: '2. Map Columns', icon: 'solar:clipboard-list-bold' },
			{ id: 'preview', label: '3. Preview', icon: 'solar:eye-bold' },
			{ id: 'results', label: '4. Results', icon: 'solar:check-circle-bold' }
		] as s}
			{@const isActive = step === s.id}
			{@const isPast = ['upload', 'mapping', 'preview', 'results'].indexOf(step) > ['upload', 'mapping', 'preview', 'results'].indexOf(s.id)}
			<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
				<div
					class="step-circle {isActive ? 'is-active' : isPast ? 'is-complete' : ''}"
				>
					<iconify-icon icon={s.icon} width="16" height="16"></iconify-icon>
				</div>
				<span class="is-size-7 has-text-weight-medium {isActive ? 'has-text-primary' : isPast ? 'has-text-success' : 'has-text-grey'}">
					{s.label}
				</span>
			</div>
			{#if s.id !== 'results'}
				<div class="step-connector"></div>
			{/if}
		{/each}
	</nav>

	{#if form?.error}
		<div class="notification is-danger is-light mb-4">
			{form.error}
		</div>
	{/if}

	<!-- Step 1: Upload -->
	{#if step === 'upload'}
		<div class="box">
			<h3 class="title is-5 mb-4">Upload CSV File</h3>
			<p class="has-text-grey is-size-7 mb-5">
				Upload a CSV file containing your transaction data. The file should have headers in the first row.
			</p>

			<form method="POST" action="?/preview" enctype="multipart/form-data" use:enhance>
				<div class="field mb-5">
					<label for="file" class="label">Select CSV File</label>
					<div class="file has-name is-primary is-light">
						<label class="file-label">
							<input
								class="file-input"
								type="file"
								id="file"
								name="file"
								accept=".csv,text/csv"
								required
							/>
							<span class="file-cta">
								<span class="file-icon">
									<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
								</span>
								<span class="file-label">Choose a file...</span>
							</span>
						</label>
					</div>
					<p class="help">Maximum file size: 5MB</p>
				</div>

				<div class="is-flex is-justify-content-flex-end">
					<button
						type="submit"
						class="button is-primary"
					>
						<span class="icon">
							<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
						</span>
						<span>Upload & Preview</span>
					</button>
				</div>
			</form>

			<!-- Format Help -->
			<div class="box mt-5" style="background: var(--color-surface);">
				<h4 class="is-size-7 has-text-weight-medium mb-2">Expected CSV Format</h4>
				<p class="is-size-7 has-text-grey mb-3">
					Your CSV should have headers for Date, Type (income/expense), Payee, and Amount.
					Optional columns: Description, Tags (comma-separated), Payment Method, Check Number.
				</p>
				<pre class="p-3 is-size-7" style="background: var(--color-card-bg); border-radius: 0.375rem; overflow-x: auto;">Date,Type,Payee,Amount,Description,Tags
2026-01-15,expense,Office Depot,125.50,Printer paper and ink,Office Supplies
2026-01-16,income,Client ABC,1500.00,Website development,Consulting</pre>
			</div>
		</div>
	{/if}

	<!-- Step 2: Column Mapping -->
	{#if step === 'mapping' && previewData}
		<div class="box">
			<h3 class="title is-5 mb-4">Map Columns</h3>
			<p class="has-text-grey is-size-7 mb-5">
				Map your CSV columns to transaction fields. We've auto-detected some mappings based on column names.
			</p>

			<form method="POST" action="?/validate" use:enhance>
				<input type="hidden" name="csvText" value={csvText} />
				<input type="hidden" name="mapping" value={JSON.stringify(mapping)} />

				<div class="columns is-multiline">
					<!-- Date -->
					<div class="column is-half">
						<div class="field">
							<label for="map-date" class="label">
								Date <span class="has-text-danger">*</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-date" bind:value={mapping.date} required>
										<option value="">Select column...</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Type -->
					<div class="column is-half">
						<div class="field">
							<label for="map-type" class="label">
								Type (income/expense) <span class="has-text-danger">*</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-type" bind:value={mapping.type} required>
										<option value="">Select column...</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Payee -->
					<div class="column is-half">
						<div class="field">
							<label for="map-payee" class="label">
								Payee <span class="has-text-danger">*</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-payee" bind:value={mapping.payee} required>
										<option value="">Select column...</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Amount -->
					<div class="column is-half">
						<div class="field">
							<label for="map-amount" class="label">
								Amount <span class="has-text-danger">*</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-amount" bind:value={mapping.amount} required>
										<option value="">Select column...</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Description (optional) -->
					<div class="column is-half">
						<div class="field">
							<label for="map-description" class="label">
								Description <span class="has-text-grey">(optional)</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-description" bind:value={mapping.description}>
										<option value="">None</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Tags (optional) -->
					<div class="column is-half">
						<div class="field">
							<label for="map-tags" class="label">
								Tags <span class="has-text-grey">(optional)</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-tags" bind:value={mapping.tags}>
										<option value="">None</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Payment Method (optional) -->
					<div class="column is-half">
						<div class="field">
							<label for="map-payment" class="label">
								Payment Method <span class="has-text-grey">(optional)</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-payment" bind:value={mapping.paymentMethod}>
										<option value="">None (default: card)</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- Check Number (optional) -->
					<div class="column is-half">
						<div class="field">
							<label for="map-check" class="label">
								Check Number <span class="has-text-grey">(optional)</span>
							</label>
							<div class="control">
								<div class="select is-fullwidth">
									<select id="map-check" bind:value={mapping.checkNumber}>
										<option value="">None</option>
										{#each previewData.headers as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Preview of mapped data -->
				<div class="mt-5">
					<h4 class="is-size-7 has-text-weight-medium mb-2">Sample Data Preview</h4>
					<div class="table-container">
						<table class="table is-narrow is-fullwidth is-striped is-size-7">
							<thead>
								<tr>
									<th>Row</th>
									{#each previewData.headers as header}
										<th>{header}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each previewData.preview.slice(0, 5) as row}
									<tr>
										<td class="has-text-grey">{row.rowNumber}</td>
										{#each previewData.headers as header}
											<td>{row.data[header] || '-'}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="is-size-7 has-text-grey mt-2">
						Showing {Math.min(5, previewData.preview.length)} of {previewData.totalRows} rows
					</p>
				</div>

				<div class="is-flex is-justify-content-space-between mt-5">
					<button
						type="button"
						onclick={reset}
						class="button"
					>
						Start Over
					</button>
					<button
						type="submit"
						disabled={!requiredMappingsSet}
						class="button is-primary"
					>
						<span>Validate & Preview</span>
						<span class="icon">
							<iconify-icon icon="solar:alt-arrow-right-linear" width="16" height="16"></iconify-icon>
						</span>
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Step 3: Preview & Validation -->
	{#if step === 'preview' && validationResult}
		<div class="box">
			<h3 class="title is-5 mb-4">Validation Results</h3>

			<!-- Summary Stats -->
			<div class="columns is-mobile mb-5">
				<div class="column">
					<div class="box has-text-centered" style="background: var(--color-surface);">
						<div class="title is-4 mb-1">{validationResult.valid.length + validationResult.invalid.length}</div>
						<div class="is-size-7 has-text-grey">Total Rows</div>
					</div>
				</div>
				<div class="column">
					<div class="box has-text-centered valid-stat">
						<div class="title is-4 mb-1 has-text-success">{validationResult.valid.length}</div>
						<div class="is-size-7 has-text-success">Valid</div>
					</div>
				</div>
				<div class="column">
					<div class="box has-text-centered {validationResult.invalid.length > 0 ? 'invalid-stat' : ''}" style="background: var(--color-surface);">
						<div class="title is-4 mb-1 {validationResult.invalid.length > 0 ? 'has-text-danger' : 'has-text-grey'}">{validationResult.invalid.length}</div>
						<div class="is-size-7 {validationResult.invalid.length > 0 ? 'has-text-danger' : 'has-text-grey'}">Invalid (will skip)</div>
					</div>
				</div>
			</div>

			<!-- Unknown Tags Handling -->
			{#if validationResult.unknownTags.length > 0}
				<div class="notification is-warning is-light mb-5">
					<h4 class="is-size-7 has-text-weight-medium mb-3">
						Unknown Tags Found ({validationResult.unknownTags.length})
					</h4>
					<p class="is-size-7 mb-4">
						These tags don't exist in your workspace. Choose to create them or map to existing tags.
					</p>

					{#each validationResult.unknownTags as tag}
						<div class="box is-flex is-align-items-center p-3 mb-2" style="gap: 1rem;">
							<span class="has-text-weight-medium" style="min-width: 6rem;">{tag}</span>
							<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
								<label class="radio is-flex is-align-items-center" style="gap: 0.25rem;">
									<input
										type="radio"
										name="tag-{tag}"
										value="create"
										bind:group={tagActions[tag]}
									/>
									<span class="is-size-7">Create new</span>
								</label>
								<label class="radio is-flex is-align-items-center ml-3" style="gap: 0.25rem;">
									<input
										type="radio"
										name="tag-{tag}"
										value="map"
										bind:group={tagActions[tag]}
									/>
									<span class="is-size-7">Map to:</span>
								</label>
								{#if tagActions[tag] === 'map'}
									<div class="select is-small ml-2">
										<select bind:value={tagMappings[tag]}>
											<option value="">Select...</option>
											{#each data.tags as existingTag}
												<option value={existingTag}>{existingTag}</option>
											{/each}
										</select>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Invalid Rows -->
			{#if validationResult.invalid.length > 0}
				<div class="mb-5">
					<h4 class="is-size-7 has-text-weight-medium mb-2">Invalid Rows (will be skipped)</h4>
					<div class="table-container" style="max-height: 12rem; overflow-y: auto;">
						<table class="table is-narrow is-fullwidth is-size-7">
							<thead>
								<tr>
									<th class="has-text-danger">Row</th>
									<th class="has-text-danger">Errors</th>
								</tr>
							</thead>
							<tbody>
								{#each validationResult.invalid as row}
									<tr>
										<td class="has-text-danger">{row.rowNumber}</td>
										<td class="has-text-danger">{row.errors.join('; ')}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Valid Rows Preview -->
			{#if validationResult.valid.length > 0}
				<div class="mb-5">
					<h4 class="is-size-7 has-text-weight-medium mb-2">Valid Transactions Preview</h4>
					<div class="table-container">
						<table class="table is-narrow is-fullwidth is-striped is-size-7">
							<thead>
								<tr>
									<th>Date</th>
									<th>Type</th>
									<th>Payee</th>
									<th class="has-text-right">Amount</th>
									<th>Tags</th>
								</tr>
							</thead>
							<tbody>
								{#each validationResult.valid.slice(0, 10) as tx}
									<tr>
										<td>{tx.date}</td>
										<td>
											<span class="tag is-small {tx.type === 'income' ? 'is-success is-light' : 'is-danger is-light'}">
												{tx.type}
											</span>
										</td>
										<td>{tx.payee}</td>
										<td class="has-text-right tabular-nums">
											${(tx.amountCents / 100).toFixed(2)}
										</td>
										<td class="has-text-grey">{tx.tags.join(', ') || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if validationResult.valid.length > 10}
						<p class="is-size-7 has-text-grey mt-2">
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

				<div class="is-flex is-justify-content-space-between">
					<button
						type="button"
						onclick={() => (step = 'mapping')}
						class="button"
					>
						Back to Mapping
					</button>
					<button
						type="submit"
						disabled={validationResult.valid.length === 0 || !allTagsResolved()}
						class="button is-primary"
					>
						<span class="icon">
							<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
						</span>
						<span>Import {validationResult.valid.length} Transactions</span>
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Step 4: Results -->
	{#if step === 'results' && importResult}
		<div class="box">
			<div class="has-text-centered mb-5">
				<div class="result-icon mb-4">
					<iconify-icon icon="solar:check-circle-bold" class="has-text-success" width="32" height="32"></iconify-icon>
				</div>
				<h3 class="title is-4">Import Complete</h3>
				<p class="has-text-grey mt-2">
					Successfully imported {importResult.imported} transaction{importResult.imported !== 1 ? 's' : ''}.
				</p>
			</div>

			<!-- Summary -->
			<div class="columns is-mobile mb-5">
				<div class="column">
					<div class="box has-text-centered valid-stat">
						<div class="title is-3 mb-1 has-text-success">{importResult.imported}</div>
						<div class="is-size-7 has-text-success">Imported</div>
					</div>
				</div>
				<div class="column">
					<div class="box has-text-centered {importResult.skipped > 0 ? 'skipped-stat' : ''}" style="background: var(--color-surface);">
						<div class="title is-3 mb-1 {importResult.skipped > 0 ? 'has-text-warning' : 'has-text-grey'}">{importResult.skipped}</div>
						<div class="is-size-7 {importResult.skipped > 0 ? 'has-text-warning' : 'has-text-grey'}">Skipped</div>
					</div>
				</div>
			</div>

			<!-- Skipped Rows Details -->
			{#if importResult.skippedRows.length > 0}
				<details class="mb-5">
					<summary class="notification is-warning is-light is-size-7 has-text-weight-medium is-clickable">
						View skipped rows ({importResult.skippedRows.length})
					</summary>
					<div class="table-container mt-2" style="max-height: 12rem; overflow-y: auto;">
						<table class="table is-narrow is-fullwidth is-size-7">
							<thead>
								<tr>
									<th>Row</th>
									<th>Errors</th>
								</tr>
							</thead>
							<tbody>
								{#each importResult.skippedRows as row}
									<tr>
										<td class="has-text-grey">{row.rowNumber}</td>
										<td class="has-text-danger">{row.errors.join('; ')}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</details>
			{/if}

			<!-- Actions -->
			<div class="buttons is-centered">
				<button
					type="button"
					onclick={reset}
					class="button"
				>
					Import Another
				</button>
				<a
					href="../transactions"
					class="button is-primary"
				>
					<span>View Transactions</span>
					<span class="icon">
						<iconify-icon icon="solar:alt-arrow-right-linear" width="16" height="16"></iconify-icon>
					</span>
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.step-circle {
		display: flex;
		width: 2rem;
		height: 2rem;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background-color: var(--color-surface-alt);
		color: var(--color-muted);
	}
	.step-circle.is-active {
		background-color: var(--bulma-primary, var(--color-primary));
		color: white;
	}
	.step-circle.is-complete {
		background-color: var(--bulma-success, var(--color-success));
		color: white;
	}
	.step-connector {
		width: 2rem;
		height: 1px;
		background-color: var(--color-border);
	}
	.result-icon {
		display: inline-flex;
		width: 4rem;
		height: 4rem;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background-color: var(--color-success-muted, #f0fdf4);
	}
	.valid-stat {
		background-color: var(--color-success-muted, #f0fdf4) !important;
	}
	.invalid-stat {
		background-color: var(--color-error-muted, #fef2f2) !important;
	}
	.skipped-stat {
		background-color: var(--color-warning-muted, #fffbeb) !important;
	}
</style>
