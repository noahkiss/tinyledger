<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import WorkspaceLogo from '$lib/components/WorkspaceLogo.svelte';
	import { FEDERAL_BRACKETS_2026 } from '$lib/data/federal-brackets-2026';
	import { STATE_TAX_RATES, getStateRate } from '$lib/data/state-tax-rates';
	import { getFormsForState } from '$lib/data/tax-forms';
	import { themePreference, type ThemePreference } from '$lib/stores/theme';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Month names for fiscal year selector
	const months = [
		{ value: 1, name: 'January', label: 'January (Calendar Year)' },
		{ value: 2, name: 'February', label: 'February' },
		{ value: 3, name: 'March', label: 'March' },
		{ value: 4, name: 'April', label: 'April' },
		{ value: 5, name: 'May', label: 'May' },
		{ value: 6, name: 'June', label: 'June' },
		{ value: 7, name: 'July', label: 'July' },
		{ value: 8, name: 'August', label: 'August' },
		{ value: 9, name: 'September', label: 'September' },
		{ value: 10, name: 'October', label: 'October' },
		{ value: 11, name: 'November', label: 'November' },
		{ value: 12, name: 'December', label: 'December' }
	];

	// Preview for logo upload
	let logoPreviewUrl = $state<string | null>(null);

	function handleLogoChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			// Create preview URL
			logoPreviewUrl = URL.createObjectURL(file);
		} else {
			logoPreviewUrl = null;
		}
	}

	// Cleanup preview URL on unmount
	$effect(() => {
		return () => {
			if (logoPreviewUrl) {
				URL.revokeObjectURL(logoPreviewUrl);
			}
		};
	});

	// Tax configuration state
	let selectedState = $state(data.settings.state || 'PA');
	let useCustomStateRate = $state(data.settings.stateRateOverride !== null);
	let showFederalBracketHelp = $state(false);
	let showTaxForms = $state(false);

	// Rate input values (display format: "3.07")
	let stateRateOverrideInput = $state(
		data.settings.stateRateOverride !== null
			? formatRateForDisplay(data.settings.stateRateOverride)
			: ''
	);
	let localEitRateInput = $state(
		data.settings.localEitRate !== null ? formatRateForDisplay(data.settings.localEitRate) : ''
	);

	// Get current state rate for display/placeholder
	const currentStateRate = $derived(() => {
		const stateData = getStateRate(selectedState);
		return stateData ? stateData.rate : 0;
	});

	const currentStateRateLabel = $derived(() => {
		const stateData = getStateRate(selectedState);
		return stateData ? stateData.rateLabel : '0%';
	});

	// Get forms for selected state
	const taxForms = $derived(() => getFormsForState(selectedState));
	const federalForms = $derived(() => taxForms().filter((f) => !f.applicableStates));
	const stateForms = $derived(() => taxForms().filter((f) => f.applicableStates?.length));

	// Warnings for unusual rate values
	const stateRateWarning = $derived(() => {
		if (!useCustomStateRate || !stateRateOverrideInput) return null;
		const rate = parseFloat(stateRateOverrideInput);
		if (isNaN(rate)) return null;
		if (rate > 15) {
			return 'This rate seems high. The highest state rate is California at 13.3%.';
		}
		return null;
	});

	const localEitWarning = $derived(() => {
		if (!localEitRateInput) return null;
		const rate = parseFloat(localEitRateInput);
		if (isNaN(rate)) return null;
		if (rate > 5) {
			return 'Most local EIT rates are under 3%. Please verify this rate.';
		}
		return null;
	});

	// Helper functions for rate conversion
	function formatRateForDisplay(rate: number): string {
		// Convert stored rate (e.g., 30700 for 3.07%) to display format ("3.07")
		return (rate / 10000).toFixed(2);
	}

	function parseRateFromInput(input: string): number | null {
		// Convert display format ("3.07") to stored format (30700)
		if (!input || input.trim() === '') return null;
		const rate = parseFloat(input);
		if (isNaN(rate)) return null;
		return Math.round(rate * 10000);
	}
</script>

<svelte:head>
	<title>Settings - {data.settings.name} - TinyLedger</title>
</svelte:head>

<div>
	<h2 class="title is-4 mb-5">Workspace Settings</h2>

	<!-- Appearance Section -->
	<section data-section="appearance" class="box mb-5">
		<h3 class="title is-5 mb-1">Appearance</h3>
		<p class="is-size-7 has-text-grey">Choose how Ledger looks to you.</p>

		<div class="mt-4">
			<label class="label">Theme</label>
			<div class="theme-buttons">
				{#each [
					{ value: 'system', label: 'System', icon: 'solar:monitor-linear' },
					{ value: 'light', label: 'Light', icon: 'solar:sun-linear' },
					{ value: 'dark', label: 'Dark', icon: 'solar:moon-linear' }
				] as option}
					<button
						type="button"
						onclick={() => themePreference.set(option.value as ThemePreference)}
						class="button theme-btn {$themePreference === option.value ? 'is-active' : ''}"
					>
						<span class="icon is-small">
							<iconify-icon icon={option.icon} width="18" height="18"></iconify-icon>
						</span>
						<span>{option.label}</span>
					</button>
				{/each}
			</div>
			<p class="is-size-7 has-text-grey mt-2">
				{#if $themePreference === 'system'}
					Automatically matches your device's appearance setting.
				{:else if $themePreference === 'light'}
					Always use light mode.
				{:else}
					Always use dark mode.
				{/if}
			</p>
		</div>
	</section>

	<form
		method="POST"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					// Invalidate data to refresh settings (including new logo filename)
					await invalidateAll();
					// Clear logo preview since we now have the server version
					logoPreviewUrl = null;
				}
				await update();
			};
		}}
		class="box settings-form"
	>
		{#if form?.error}
			<div class="notification is-danger is-light">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="notification is-success is-light">Settings saved successfully!</div>
		{/if}

		{#if form?.warnings && form.warnings.length > 0}
			<div class="notification is-warning is-light">
				<p class="has-text-weight-medium">Settings saved with warnings:</p>
				<ul class="mt-1 warnings-list">
					{#each form.warnings as warning}
						<li>{warning}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Logo section -->
		<div class="field">
			<label for="logo" class="label">Logo</label>
			<div class="logo-upload">
				{#if logoPreviewUrl}
					<img
						src={logoPreviewUrl}
						alt="Logo preview"
						class="logo-preview"
					/>
				{:else}
					<WorkspaceLogo
						workspaceId={data.workspaceId}
						logoFilename={data.settings.logoFilename}
						name={data.settings.name}
						size="lg"
					/>
				{/if}
				<div>
					<div class="file has-name">
						<label class="file-label">
							<input
								type="file"
								id="logo"
								name="logo"
								accept="image/*"
								onchange={handleLogoChange}
								class="file-input"
							/>
							<span class="file-cta">
								<span class="file-label">Choose a file...</span>
							</span>
						</label>
					</div>
					<p class="help">PNG, JPG, or GIF. Will be resized to 128x128.</p>
				</div>
			</div>
		</div>

		<!-- Basic info -->
		<div class="columns">
			<div class="column">
				<div class="field">
					<label for="name" class="label">Workspace Name</label>
					<div class="control">
						<input
							type="text"
							id="name"
							name="name"
							value={data.settings.name}
							required
							class="input"
						/>
					</div>
				</div>
			</div>

			<div class="column">
				<div class="field">
					<label for="type" class="label">Workspace Type</label>
					<div class="control">
						<div class="select is-fullwidth">
							<select
								id="type"
								name="type"
								required
							>
								<option value="sole_prop" selected={data.settings.type === 'sole_prop'}
									>Sole Proprietor</option
								>
								<option value="volunteer_org" selected={data.settings.type === 'volunteer_org'}
									>Volunteer Organization</option
								>
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Business details -->
		<div class="field">
			<label for="businessName" class="label">Business Name</label>
			<div class="control">
				<input
					type="text"
					id="businessName"
					name="businessName"
					value={data.settings.businessName ?? ''}
					placeholder="Legal business name"
					class="input"
				/>
			</div>
		</div>

		<div class="field">
			<label for="address" class="label">Business Address</label>
			<div class="control">
				<textarea
					id="address"
					name="address"
					rows="2"
					placeholder="Street address, city, state, ZIP"
					class="textarea"
					>{data.settings.address ?? ''}</textarea
				>
			</div>
		</div>

		<div class="columns">
			<div class="column">
				<div class="field">
					<label for="phone" class="label">Phone Number</label>
					<div class="control">
						<input
							type="tel"
							id="phone"
							name="phone"
							value={data.settings.phone ?? ''}
							placeholder="(555) 555-5555"
							class="input"
						/>
					</div>
				</div>
			</div>

			<div class="column">
				<div class="field">
					<label for="foundedYear" class="label">Founded Year</label>
					<div class="control">
						<input
							type="number"
							id="foundedYear"
							name="foundedYear"
							value={data.settings.foundedYear ?? ''}
							min="1800"
							max={new Date().getFullYear()}
							placeholder="2020"
							class="input"
						/>
					</div>
				</div>
			</div>
		</div>

		<div class="field">
			<label for="responsibleParty" class="label">Responsible Party</label>
			<div class="control">
				<input
					type="text"
					id="responsibleParty"
					name="responsibleParty"
					value={data.settings.responsibleParty ?? ''}
					placeholder="Owner/manager name"
					class="input"
				/>
			</div>
		</div>

		<!-- Fiscal Year -->
		<div class="box fiscal-year-box">
			<label for="fiscalYearStartMonth" class="label">Fiscal Year Start Month</label>
			<p class="help mb-2">
				Fiscal year runs from the selected month through the following year. Most businesses use
				calendar year (January).
			</p>
			<div class="control">
				<div class="select">
					<select
						id="fiscalYearStartMonth"
						name="fiscalYearStartMonth"
					>
						{#each months as month}
							<option value={month.value} selected={data.settings.fiscalYearStartMonth === month.value}>
								{month.label}
							</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Tax Configuration (only for sole_prop) -->
		{#if data.settings.type === 'sole_prop'}
			<div class="box">
				<h3 class="title is-5 mb-1">Tax Configuration</h3>
				<p class="is-size-7 has-text-grey">
					Configure your tax rates for estimated tax calculations. These settings help calculate quarterly estimated payments.
				</p>

				<div class="tax-fields mt-5">
					<!-- State Selection -->
					<div class="field">
						<label for="state" class="label">State</label>
						<div class="control">
							<div class="select">
								<select
									id="state"
									name="state"
									bind:value={selectedState}
								>
									{#each STATE_TAX_RATES as state}
										<option value={state.code}>
											{state.name} ({state.rateLabel})
										</option>
									{/each}
								</select>
							</div>
						</div>
						<p class="help">
							Select your state for default tax rate. Only flat-rate states are listed.
						</p>
					</div>

					<!-- Federal Bracket -->
					<div class="field">
						<div class="is-flex is-align-items-center is-justify-content-space-between">
							<label for="federalBracketRate" class="label mb-0">
								Federal Tax Bracket
							</label>
							<button
								type="button"
								class="button is-ghost is-small help-toggle"
								onclick={() => (showFederalBracketHelp = !showFederalBracketHelp)}
							>
								{showFederalBracketHelp ? 'Hide help' : 'How to choose?'}
							</button>
						</div>
						<div class="control">
							<div class="select">
								<select
									id="federalBracketRate"
									name="federalBracketRate"
								>
									<option value="">Select your bracket...</option>
									{#each FEDERAL_BRACKETS_2026 as bracket}
										<option
											value={Math.round(bracket.rate * 100)}
											selected={data.settings.federalBracketRate === Math.round(bracket.rate * 100)}
										>
											{bracket.label}
										</option>
									{/each}
								</select>
							</div>
						</div>

						{#if showFederalBracketHelp}
							<div class="box bracket-help mt-3">
								<p class="has-text-weight-medium">How to pick your bracket:</p>
								<p class="mt-1 has-text-grey">
									Select the bracket that matches your expected <strong>taxable income</strong> after all deductions and credits.
									This is typically your total income minus the standard deduction ($15,000 for single filers in 2026).
								</p>
								<table class="table is-fullwidth is-size-7 mt-3">
									<thead>
										<tr>
											<th>Rate</th>
											<th>Taxable Income Range</th>
										</tr>
									</thead>
									<tbody>
										{#each FEDERAL_BRACKETS_2026 as bracket}
											<tr>
												<td>{bracket.rateLabel}</td>
												<td>
													${bracket.minIncome.toLocaleString()}
													{#if bracket.maxIncome}
														- ${bracket.maxIncome.toLocaleString()}
													{:else}
														+
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>

					<!-- State Rate Override -->
					<div class="field">
						<div class="is-flex is-align-items-center" style="gap: 0.5rem;">
							<label class="checkbox">
								<input
									type="checkbox"
									id="useCustomStateRate"
									bind:checked={useCustomStateRate}
								/>
								Use custom state rate
							</label>
							<span class="is-size-7 has-text-grey">
								(Default: {currentStateRateLabel()})
							</span>
						</div>

						{#if useCustomStateRate}
							<div class="mt-3">
								<label for="stateRateOverride" class="label">
									State Rate Override (%)
								</label>
								<div class="control">
									<input
										type="text"
										id="stateRateOverride"
										name="stateRateOverride"
										bind:value={stateRateOverrideInput}
										placeholder={(currentStateRate() * 100).toFixed(2)}
										class="input rate-input"
									/>
								</div>
								{#if stateRateWarning()}
									<div class="notification is-warning is-light is-size-7 mt-2 py-2 px-3">
										{stateRateWarning()}
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Local EIT Rate -->
					<div class="field">
						<label for="localEitRate" class="label">
							Local Earned Income Tax Rate (%)
						</label>
						<div class="control">
							<input
								type="text"
								id="localEitRate"
								name="localEitRate"
								bind:value={localEitRateInput}
								placeholder="e.g., 1.0"
								class="input rate-input"
							/>
						</div>
						<p class="help">
							Municipal earned income tax rate, if applicable.
							{#if selectedState === 'PA'}
								<a
									href="https://apps.dced.pa.gov/munstats-public/ReportInformation2.aspx?report=EitWithCollector_Dyn_Excel&type=R"
									target="_blank"
									rel="noopener noreferrer"
								>
									Find your PA local rate
								</a>
							{/if}
						</p>
						{#if localEitWarning()}
							<div class="notification is-warning is-light is-size-7 mt-2 py-2 px-3">
								{localEitWarning()}
							</div>
						{/if}
					</div>

					<!-- Tax Notes -->
					<div class="field">
						<label for="taxNotes" class="label">Tax Notes</label>
						<div class="control">
							<textarea
								id="taxNotes"
								name="taxNotes"
								rows="2"
								placeholder="Notes for your reference (e.g., CPA contact info, reminders)"
								class="textarea"
								>{data.settings.taxNotes ?? ''}</textarea
							>
						</div>
					</div>

					<!-- Tax Forms & Resources (expandable) -->
					<div class="box tax-forms-box p-0">
						<button
							type="button"
							class="tax-forms-toggle"
							onclick={() => (showTaxForms = !showTaxForms)}
						>
							<span class="has-text-weight-medium">Tax Forms & Resources</span>
							<iconify-icon
								icon="solar:alt-arrow-down-linear"
								class="has-text-grey toggle-icon {showTaxForms ? 'is-rotated' : ''}"
								width="20"
								height="20"
							></iconify-icon>
						</button>

						{#if showTaxForms}
							<div class="tax-forms-content">
								<!-- Federal Forms -->
								<div>
									<h4 class="label">Federal Forms</h4>
									<div class="form-list">
										{#each federalForms() as form}
											<div class="is-size-7">
												<div>
													<a
														href={form.irsLink}
														target="_blank"
														rel="noopener noreferrer"
													>
														{form.name}
													</a>
													<span class="has-text-grey"> - {form.description}</span>
												</div>
												<div class="mt-1 is-flex is-align-items-center has-text-grey" style="gap: 0.75rem;">
													<span>Due: {form.dueDate}</span>
													{#if form.filingThreshold}
														<span class="has-text-grey">|</span>
														<span>{form.filingThreshold}</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>

								<!-- State Forms (if any) -->
								{#if stateForms().length > 0}
									<div class="state-forms-section">
										<h4 class="label">State Forms ({selectedState})</h4>
										<div class="form-list">
											{#each stateForms() as form}
												<div class="is-size-7">
													<div>
														<a
															href={form.stateLink}
															target="_blank"
															rel="noopener noreferrer"
														>
															{form.name}
														</a>
														<span class="has-text-grey"> - {form.description}</span>
													</div>
													<div class="mt-1 is-flex is-align-items-center has-text-grey" style="gap: 0.75rem;">
														<span>Due: {form.dueDate}</span>
														{#if form.filingThreshold}
															<span class="has-text-grey">|</span>
															<span>{form.filingThreshold}</span>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<p class="mt-4 is-size-7 has-text-grey is-italic">
									These are common forms. Your situation may require additional forms. Consult a tax professional for advice.
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="is-flex is-justify-content-flex-end pt-4 form-actions">
			<a
				href="/w/{data.workspaceId}/transactions"
				class="button is-light"
			>
				Cancel
			</a>
			<button
				type="submit"
				class="button is-primary"
			>
				Save Settings
			</button>
		</div>
	</form>

	<!-- Tags Management Link -->
	<div class="box mt-5">
		<h3 class="title is-5 mb-1">Tags & Categories</h3>
		<p class="is-size-7 has-text-grey">
			Manage expense categories, rename or merge tags, and control tag creation.
		</p>
		<a
			href="/w/{data.workspaceId}/settings/tags"
			class="button mt-4"
		>
			<span>Manage Tags</span>
			<span class="icon is-small">
				<iconify-icon icon="solar:alt-arrow-right-linear" width="16" height="16"></iconify-icon>
			</span>
		</a>
	</div>

	<!-- Recurring Transactions Link -->
	<div class="box mt-5">
		<h3 class="title is-5 mb-1">Recurring Transactions</h3>
		<p class="is-size-7 has-text-grey">
			Set up recurring templates for predictable income and expenses like rent, subscriptions, or regular client payments.
		</p>
		<a
			href="/w/{data.workspaceId}/recurring"
			class="button mt-4"
		>
			<span>Manage Recurring</span>
			<span class="icon is-small">
				<iconify-icon icon="solar:alt-arrow-right-linear" width="16" height="16"></iconify-icon>
			</span>
		</a>
	</div>

	<!-- Data Import & Export Section -->
	<section class="box mt-5">
		<h2 class="title is-5 mb-4">Data Import & Export</h2>
		<p class="is-size-7 has-text-grey mb-4">
			Import historical data or export for backup and migration.
		</p>

		<div class="import-export-list">
			<!-- Import -->
			<div class="is-flex is-align-items-center is-justify-content-space-between py-2">
				<div>
					<h3 class="has-text-weight-medium is-size-7">Import Transactions</h3>
					<p class="is-size-7 has-text-grey">Import transactions from CSV file</p>
				</div>
				<a
					href="/w/{data.workspaceId}/import"
					class="button is-primary is-small"
				>
					<span class="icon is-small">
						<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
					</span>
					<span>Import CSV</span>
				</a>
			</div>

			<hr class="import-export-divider" />

			<!-- CSV Export -->
			<div class="is-flex is-align-items-center is-justify-content-space-between py-2">
				<div>
					<h3 class="has-text-weight-medium is-size-7">Transactions CSV</h3>
					<p class="is-size-7 has-text-grey">All transactions in spreadsheet format</p>
				</div>
				<a
					href="/w/{data.workspaceId}/export/csv"
					class="button is-light is-small"
					download
				>
					<span class="icon is-small">
						<iconify-icon icon="solar:download-bold" width="16" height="16"></iconify-icon>
					</span>
					<span>Download CSV</span>
				</a>
			</div>

			<hr class="import-export-divider" />

			<!-- Full Export -->
			<div class="is-flex is-align-items-center is-justify-content-space-between py-2">
				<div>
					<h3 class="has-text-weight-medium is-size-7">Full Backup (ZIP)</h3>
					<p class="is-size-7 has-text-grey">All data including receipts and attachments</p>
				</div>
				<a
					href="/w/{data.workspaceId}/export/full"
					class="button is-light is-small"
					download
				>
					<span class="icon is-small">
						<iconify-icon icon="solar:download-bold" width="16" height="16"></iconify-icon>
					</span>
					<span>Download ZIP</span>
				</a>
			</div>
		</div>
	</section>

	<!-- App Installation -->
	<section class="box mt-5">
		<h2 class="title is-5 mb-4">App Installation</h2>
		<p class="is-size-7 has-text-grey mb-4">
			Install Ledger to your device's home screen for quick access and a native app experience.
		</p>

		<div class="box install-instructions">
			<h3 class="has-text-weight-medium is-size-7">iOS (iPhone/iPad)</h3>
			<ol class="mt-2 is-size-7 has-text-grey install-steps">
				<li>Open this page in Safari</li>
				<li>Tap the Share button (square with arrow)</li>
				<li>Scroll down and tap "Add to Home Screen"</li>
				<li>Tap "Add" to confirm</li>
			</ol>
			<p class="mt-3 is-size-7 has-text-grey">
				The app will open in standalone mode without the Safari address bar.
			</p>
		</div>

		<div class="box install-instructions mt-4">
			<h3 class="has-text-weight-medium is-size-7">Android / Desktop Chrome</h3>
			<ol class="mt-2 is-size-7 has-text-grey install-steps">
				<li>Open the browser menu (three dots)</li>
				<li>Tap "Install app" or "Add to Home Screen"</li>
				<li>Follow the prompts to install</li>
			</ol>
		</div>
	</section>
</div>

<style>
	/* Theme buttons */
	.theme-buttons {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.theme-btn {
		border-color: var(--color-border);
		background-color: var(--color-surface);
		color: var(--color-foreground);
	}
	.theme-btn:hover {
		background-color: var(--color-surface-alt);
	}
	.theme-btn.is-active {
		border-color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
		color: var(--color-primary);
	}

	/* Settings form spacing */
	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Warnings list */
	.warnings-list {
		list-style: disc;
		list-style-position: inside;
		font-size: 0.875rem;
	}

	/* Logo upload */
	.logo-upload {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}
	.logo-preview {
		width: 4rem;
		height: 4rem;
		border-radius: 0.5rem;
		object-fit: cover;
	}

	/* Fiscal year box */
	.fiscal-year-box {
		background-color: var(--color-surface);
	}

	/* Tax fields spacing */
	.tax-fields {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Rate input width */
	.rate-input {
		max-width: 8rem;
	}

	/* Help toggle button */
	.help-toggle {
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.75rem;
	}

	/* Bracket help box */
	.bracket-help {
		background-color: var(--color-surface);
		font-size: 0.875rem;
	}

	/* Tax forms expandable */
	.tax-forms-box {
		overflow: hidden;
	}
	.tax-forms-toggle {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-foreground);
	}
	.tax-forms-toggle:hover {
		background-color: var(--color-surface);
	}
	.toggle-icon {
		transition: transform 0.2s;
	}
	.toggle-icon.is-rotated {
		transform: rotate(180deg);
	}
	.tax-forms-content {
		border-top: 1px solid var(--color-border);
		background-color: var(--color-surface);
		padding: 1rem;
	}

	/* Form list spacing */
	.form-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	/* State forms section */
	.state-forms-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	/* Form action buttons */
	.form-actions {
		gap: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	/* Import/export list */
	.import-export-list {
		display: flex;
		flex-direction: column;
	}
	.import-export-divider {
		margin: 0.5rem 0;
		background-color: var(--color-border);
		height: 1px;
		border: none;
	}

	/* Install instructions */
	.install-instructions {
		background-color: var(--color-surface);
	}
	.install-steps {
		list-style: decimal;
		list-style-position: inside;
	}
	.install-steps li + li {
		margin-top: 0.25rem;
	}
</style>
