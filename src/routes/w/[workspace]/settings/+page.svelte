<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import WorkspaceLogo from '$lib/components/WorkspaceLogo.svelte';
	import { FEDERAL_BRACKETS_2026 } from '$lib/data/federal-brackets-2026';
	import { STATE_TAX_RATES, getStateRate } from '$lib/data/state-tax-rates';
	import { getFormsForState } from '$lib/data/tax-forms';

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
	<h2 class="mb-6 text-xl font-semibold text-gray-800">Workspace Settings</h2>

	<form
		method="POST"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance
		class="space-y-6 rounded-lg border border-gray-200 bg-white p-6"
	>
		{#if form?.error}
			<div class="rounded-lg bg-red-50 p-3 text-sm text-red-800">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="rounded-lg bg-green-50 p-3 text-sm text-green-800">Settings saved successfully!</div>
		{/if}

		{#if form?.warnings && form.warnings.length > 0}
			<div class="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
				<p class="text-sm font-medium text-yellow-800">Settings saved with warnings:</p>
				<ul class="mt-1 text-sm text-yellow-700 list-disc list-inside">
					{#each form.warnings as warning}
						<li>{warning}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Logo section -->
		<div>
			<label for="logo" class="block text-sm font-medium text-gray-700">Logo</label>
			<div class="mt-2 flex items-center gap-4">
				{#if logoPreviewUrl}
					<img
						src={logoPreviewUrl}
						alt="Logo preview"
						class="h-16 w-16 rounded-lg object-cover"
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
					<input
						type="file"
						id="logo"
						name="logo"
						accept="image/*"
						onchange={handleLogoChange}
						class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
					/>
					<p class="mt-1 text-xs text-gray-500">PNG, JPG, or GIF. Will be resized to 128x128.</p>
				</div>
			</div>
		</div>

		<!-- Basic info -->
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700">Workspace Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={data.settings.name}
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="type" class="block text-sm font-medium text-gray-700">Workspace Type</label>
				<select
					id="type"
					name="type"
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

		<!-- Business details -->
		<div>
			<label for="businessName" class="block text-sm font-medium text-gray-700">Business Name</label>
			<input
				type="text"
				id="businessName"
				name="businessName"
				value={data.settings.businessName ?? ''}
				placeholder="Legal business name"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="address" class="block text-sm font-medium text-gray-700">Business Address</label>
			<textarea
				id="address"
				name="address"
				rows="2"
				placeholder="Street address, city, state, ZIP"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>{data.settings.address ?? ''}</textarea
			>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
				<input
					type="tel"
					id="phone"
					name="phone"
					value={data.settings.phone ?? ''}
					placeholder="(555) 555-5555"
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="foundedYear" class="block text-sm font-medium text-gray-700">Founded Year</label>
				<input
					type="number"
					id="foundedYear"
					name="foundedYear"
					value={data.settings.foundedYear ?? ''}
					min="1800"
					max={new Date().getFullYear()}
					placeholder="2020"
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div>
			<label for="responsibleParty" class="block text-sm font-medium text-gray-700"
				>Responsible Party</label
			>
			<input
				type="text"
				id="responsibleParty"
				name="responsibleParty"
				value={data.settings.responsibleParty ?? ''}
				placeholder="Owner/manager name"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>

		<!-- Fiscal Year -->
		<div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
			<label for="fiscalYearStartMonth" class="block text-sm font-medium text-gray-700"
				>Fiscal Year Start Month</label
			>
			<p class="mb-2 mt-1 text-xs text-gray-500">
				Fiscal year runs from the selected month through the following year. Most businesses use
				calendar year (January).
			</p>
			<select
				id="fiscalYearStartMonth"
				name="fiscalYearStartMonth"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
			>
				{#each months as month}
					<option value={month.value} selected={data.settings.fiscalYearStartMonth === month.value}>
						{month.label}
					</option>
				{/each}
			</select>
		</div>

		<!-- Tax Configuration (only for sole_prop) -->
		{#if data.settings.type === 'sole_prop'}
			<div class="rounded-lg border border-gray-200 bg-white p-6">
				<h3 class="text-lg font-medium text-gray-900">Tax Configuration</h3>
				<p class="mt-1 text-sm text-gray-500">
					Configure your tax rates for estimated tax calculations. These settings help calculate quarterly estimated payments.
				</p>

				<div class="mt-6 space-y-6">
					<!-- State Selection -->
					<div>
						<label for="state" class="block text-sm font-medium text-gray-700">State</label>
						<select
							id="state"
							name="state"
							bind:value={selectedState}
							class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
						>
							{#each STATE_TAX_RATES as state}
								<option value={state.code}>
									{state.name} ({state.rateLabel})
								</option>
							{/each}
						</select>
						<p class="mt-1 text-xs text-gray-500">
							Select your state for default tax rate. Only flat-rate states are listed.
						</p>
					</div>

					<!-- Federal Bracket -->
					<div>
						<div class="flex items-center justify-between">
							<label for="federalBracketRate" class="block text-sm font-medium text-gray-700">
								Federal Tax Bracket
							</label>
							<button
								type="button"
								class="text-xs text-blue-600 hover:text-blue-800"
								onclick={() => (showFederalBracketHelp = !showFederalBracketHelp)}
							>
								{showFederalBracketHelp ? 'Hide help' : 'How to choose?'}
							</button>
						</div>
						<select
							id="federalBracketRate"
							name="federalBracketRate"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
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

						{#if showFederalBracketHelp}
							<div class="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
								<p class="font-medium text-gray-700">How to pick your bracket:</p>
								<p class="mt-1 text-gray-600">
									Select the bracket that matches your expected <strong>taxable income</strong> after all deductions and credits.
									This is typically your total income minus the standard deduction ($15,000 for single filers in 2026).
								</p>
								<table class="mt-3 w-full text-xs">
									<thead>
										<tr class="border-b border-gray-200">
											<th class="pb-2 text-left font-medium text-gray-700">Rate</th>
											<th class="pb-2 text-left font-medium text-gray-700">Taxable Income Range</th>
										</tr>
									</thead>
									<tbody class="text-gray-600">
										{#each FEDERAL_BRACKETS_2026 as bracket}
											<tr class="border-b border-gray-100">
												<td class="py-1.5">{bracket.rateLabel}</td>
												<td class="py-1.5">
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
					<div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="useCustomStateRate"
								bind:checked={useCustomStateRate}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<label for="useCustomStateRate" class="text-sm font-medium text-gray-700">
								Use custom state rate
							</label>
							<span class="text-xs text-gray-500">
								(Default: {currentStateRateLabel()})
							</span>
						</div>

						{#if useCustomStateRate}
							<div class="mt-3">
								<label for="stateRateOverride" class="block text-sm font-medium text-gray-700">
									State Rate Override (%)
								</label>
								<input
									type="text"
									id="stateRateOverride"
									name="stateRateOverride"
									bind:value={stateRateOverrideInput}
									placeholder={(currentStateRate() * 100).toFixed(2)}
									class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-32"
								/>
								{#if stateRateWarning()}
									<div class="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-sm text-yellow-800">
										{stateRateWarning()}
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Local EIT Rate -->
					<div>
						<label for="localEitRate" class="block text-sm font-medium text-gray-700">
							Local Earned Income Tax Rate (%)
						</label>
						<input
							type="text"
							id="localEitRate"
							name="localEitRate"
							bind:value={localEitRateInput}
							placeholder="e.g., 1.0"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-32"
						/>
						<p class="mt-1 text-xs text-gray-500">
							Municipal earned income tax rate, if applicable.
							{#if selectedState === 'PA'}
								<a
									href="https://apps.dced.pa.gov/munstats-public/ReportInformation2.aspx?report=EitWithCollector_Dyn_Excel&type=R"
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-600 hover:text-blue-800 underline"
								>
									Find your PA local rate
								</a>
							{/if}
						</p>
						{#if localEitWarning()}
							<div class="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-sm text-yellow-800">
								{localEitWarning()}
							</div>
						{/if}
					</div>

					<!-- Tax Notes -->
					<div>
						<label for="taxNotes" class="block text-sm font-medium text-gray-700">Tax Notes</label>
						<textarea
							id="taxNotes"
							name="taxNotes"
							rows="2"
							placeholder="Notes for your reference (e.g., CPA contact info, reminders)"
							class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>{data.settings.taxNotes ?? ''}</textarea
						>
					</div>

					<!-- Tax Forms & Resources (expandable) -->
					<div class="rounded-lg border border-gray-200">
						<button
							type="button"
							class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
							onclick={() => (showTaxForms = !showTaxForms)}
						>
							<span class="font-medium text-gray-900">Tax Forms & Resources</span>
							<iconify-icon
								icon="solar:alt-arrow-down-linear"
								class="text-gray-400 transition-transform {showTaxForms ? 'rotate-180' : ''}"
								width="20"
								height="20"
							></iconify-icon>
						</button>

						{#if showTaxForms}
							<div class="border-t border-gray-200 bg-gray-50 p-4">
								<!-- Federal Forms -->
								<div>
									<h4 class="text-sm font-medium text-gray-700">Federal Forms</h4>
									<div class="mt-2 space-y-3">
										{#each federalForms() as form}
											<div class="text-sm">
												<div class="flex items-start justify-between">
													<div>
														<a
															href={form.irsLink}
															target="_blank"
															rel="noopener noreferrer"
															class="font-medium text-blue-600 hover:text-blue-800 underline"
														>
															{form.name}
														</a>
														<span class="text-gray-600"> - {form.description}</span>
													</div>
												</div>
												<div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
													<span>Due: {form.dueDate}</span>
													{#if form.filingThreshold}
														<span class="text-gray-400">|</span>
														<span>{form.filingThreshold}</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>

								<!-- State Forms (if any) -->
								{#if stateForms().length > 0}
									<div class="mt-4 border-t border-gray-200 pt-4">
										<h4 class="text-sm font-medium text-gray-700">State Forms ({selectedState})</h4>
										<div class="mt-2 space-y-3">
											{#each stateForms() as form}
												<div class="text-sm">
													<div class="flex items-start justify-between">
														<div>
															<a
																href={form.stateLink}
																target="_blank"
																rel="noopener noreferrer"
																class="font-medium text-blue-600 hover:text-blue-800 underline"
															>
																{form.name}
															</a>
															<span class="text-gray-600"> - {form.description}</span>
														</div>
													</div>
													<div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
														<span>Due: {form.dueDate}</span>
														{#if form.filingThreshold}
															<span class="text-gray-400">|</span>
															<span>{form.filingThreshold}</span>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<p class="mt-4 text-xs text-gray-500 italic">
									These are common forms. Your situation may require additional forms. Consult a tax professional for advice.
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="flex justify-end gap-3 pt-4">
			<a
				href="/w/{data.workspaceId}/transactions"
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Cancel
			</a>
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
			>
				Save Settings
			</button>
		</div>
	</form>

	<!-- Tags Management Link -->
	<div class="mt-6 rounded-lg border border-gray-200 bg-white p-6">
		<h3 class="text-lg font-medium text-gray-900">Tags & Categories</h3>
		<p class="mt-1 text-sm text-gray-500">
			Manage expense categories, rename or merge tags, and control tag creation.
		</p>
		<a
			href="/w/{data.workspaceId}/settings/tags"
			class="mt-4 inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
		>
			Manage Tags
			<iconify-icon icon="solar:alt-arrow-right-linear" class="ml-2" width="16" height="16"></iconify-icon>
		</a>
	</div>

	<!-- Recurring Transactions Link -->
	<div class="mt-6 rounded-lg border border-gray-200 bg-white p-6">
		<h3 class="text-lg font-medium text-gray-900">Recurring Transactions</h3>
		<p class="mt-1 text-sm text-gray-500">
			Set up recurring templates for predictable income and expenses like rent, subscriptions, or regular client payments.
		</p>
		<a
			href="/w/{data.workspaceId}/recurring"
			class="mt-4 inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
		>
			Manage Recurring
			<iconify-icon icon="solar:alt-arrow-right-linear" class="ml-2" width="16" height="16"></iconify-icon>
		</a>
	</div>

	<!-- Data Import & Export Section -->
	<section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Data Import & Export</h2>
		<p class="text-sm text-gray-600 mb-4">
			Import historical data or export for backup and migration.
		</p>

		<div class="space-y-3">
			<!-- Import -->
			<div class="flex items-center justify-between py-2">
				<div>
					<h3 class="text-sm font-medium text-gray-900">Import Transactions</h3>
					<p class="text-xs text-gray-500">Import transactions from CSV file</p>
				</div>
				<a
					href="/w/{data.workspaceId}/import"
					class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
				>
					<iconify-icon icon="solar:upload-bold" width="16" height="16"></iconify-icon>
					Import CSV
				</a>
			</div>

			<div class="border-t border-gray-200 pt-3"></div>

			<!-- CSV Export -->
			<div class="flex items-center justify-between py-2">
				<div>
					<h3 class="text-sm font-medium text-gray-900">Transactions CSV</h3>
					<p class="text-xs text-gray-500">All transactions in spreadsheet format</p>
				</div>
				<a
					href="/w/{data.workspaceId}/export/csv"
					class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					download
				>
					<iconify-icon icon="solar:download-bold" width="16" height="16"></iconify-icon>
					Download CSV
				</a>
			</div>

			<!-- Full Export -->
			<div class="flex items-center justify-between py-2 border-t border-gray-100">
				<div>
					<h3 class="text-sm font-medium text-gray-900">Full Backup (ZIP)</h3>
					<p class="text-xs text-gray-500">All data including receipts and attachments</p>
				</div>
				<a
					href="/w/{data.workspaceId}/export/full"
					class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					download
				>
					<iconify-icon icon="solar:download-bold" width="16" height="16"></iconify-icon>
					Download ZIP
				</a>
			</div>
		</div>
	</section>

	<!-- App Installation -->
	<section class="mt-6 rounded-xl border border-gray-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">App Installation</h2>
		<p class="text-sm text-gray-600 mb-4">
			Install Ledger to your device's home screen for quick access and a native app experience.
		</p>

		<div class="rounded-lg bg-gray-50 border border-gray-100 p-4">
			<h3 class="text-sm font-medium text-gray-900">iOS (iPhone/iPad)</h3>
			<ol class="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
				<li>Open this page in Safari</li>
				<li>Tap the Share button (square with arrow)</li>
				<li>Scroll down and tap "Add to Home Screen"</li>
				<li>Tap "Add" to confirm</li>
			</ol>
			<p class="mt-3 text-xs text-gray-500">
				The app will open in standalone mode without the Safari address bar.
			</p>
		</div>

		<div class="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-4">
			<h3 class="text-sm font-medium text-gray-900">Android / Desktop Chrome</h3>
			<ol class="mt-2 text-sm text-gray-600 list-decimal list-inside space-y-1">
				<li>Open the browser menu (three dots)</li>
				<li>Tap "Install app" or "Add to Home Screen"</li>
				<li>Follow the prompts to install</li>
			</ol>
		</div>
	</section>
</div>
