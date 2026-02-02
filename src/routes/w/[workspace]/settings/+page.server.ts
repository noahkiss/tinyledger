import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { workspaceSettings } from '$lib/server/db/schema';
import { processLogoUpload } from '$lib/server/storage/logo';
import { updateWorkspaceName } from '$lib/server/workspace/registry';
import { STATE_TAX_RATES } from '$lib/data/state-tax-rates';

// Valid federal bracket rates for 2026
const VALID_FEDERAL_BRACKET_RATES = [10, 12, 22, 24, 32, 35, 37];

export const load: PageServerLoad = async ({ parent }) => {
	// Get settings from parent layout
	const { settings, workspaceId } = await parent();
	return { settings, workspaceId };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();

		// Extract form fields
		const name = formData.get('name')?.toString().trim();
		const type = formData.get('type')?.toString() as 'sole_prop' | 'volunteer_org';
		const businessName = formData.get('businessName')?.toString().trim() || null;
		const address = formData.get('address')?.toString().trim() || null;
		const phone = formData.get('phone')?.toString().trim() || null;
		const responsibleParty = formData.get('responsibleParty')?.toString().trim() || null;
		const foundedYearStr = formData.get('foundedYear')?.toString().trim();
		const foundedYear = foundedYearStr ? parseInt(foundedYearStr, 10) : null;
		const fiscalYearStartMonthStr = formData.get('fiscalYearStartMonth')?.toString().trim();
		const fiscalYearStartMonth = fiscalYearStartMonthStr ? parseInt(fiscalYearStartMonthStr, 10) : 1;
		const logoFile = formData.get('logo') as File | null;

		// Extract tax configuration fields
		const stateCode = formData.get('state')?.toString().trim() || null;
		const federalBracketRateStr = formData.get('federalBracketRate')?.toString().trim();
		const stateRateOverrideStr = formData.get('stateRateOverride')?.toString().trim();
		const localEitRateStr = formData.get('localEitRate')?.toString().trim();
		const taxNotes = formData.get('taxNotes')?.toString().trim() || null;

		// Parse tax rates
		const federalBracketRate = federalBracketRateStr ? parseInt(federalBracketRateStr, 10) : null;
		const stateRateOverride = parseRateFromInput(stateRateOverrideStr);
		const localEitRate = parseRateFromInput(localEitRateStr);

		// Validation
		if (!name || name.length < 1) {
			return fail(400, { error: 'Workspace name is required' });
		}

		if (!type || !['sole_prop', 'volunteer_org'].includes(type)) {
			return fail(400, { error: 'Invalid workspace type' });
		}

		if (foundedYear !== null && (foundedYear < 1800 || foundedYear > new Date().getFullYear())) {
			return fail(400, { error: 'Invalid founded year' });
		}

		if (fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
			return fail(400, { error: 'Invalid fiscal year start month' });
		}

		// Validate tax fields (only for sole_prop)
		const warnings: string[] = [];

		if (type === 'sole_prop') {
			// Validate state code if provided
			if (stateCode && stateCode.length !== 2) {
				return fail(400, { error: 'State must be a 2-letter code' });
			}

			if (stateCode && !STATE_TAX_RATES.find((s) => s.code === stateCode)) {
				// Accept unknown states but warn
				warnings.push(`State "${stateCode}" is not in our list of flat-rate states. Using manual rate.`);
			}

			// Validate federal bracket rate
			if (federalBracketRate !== null && !VALID_FEDERAL_BRACKET_RATES.includes(federalBracketRate)) {
				return fail(400, { error: 'Invalid federal tax bracket' });
			}

			// Warn on unusual state rate (> 15%)
			if (stateRateOverride !== null && stateRateOverride > 150000) {
				warnings.push('State rate seems unusually high (over 15%). Please verify.');
			}

			// Warn on unusual local EIT rate (> 5%)
			if (localEitRate !== null && localEitRate > 50000) {
				warnings.push('Local EIT rate seems unusually high (over 5%). Please verify.');
			}
		}

		// Process logo upload if provided
		let logoFilename: string | null = null;
		if (logoFile && logoFile.size > 0) {
			// Validate file type
			if (!logoFile.type.startsWith('image/')) {
				return fail(400, { error: 'Logo must be an image file' });
			}

			// Validate file size (max 5MB)
			if (logoFile.size > 5 * 1024 * 1024) {
				return fail(400, { error: 'Logo file too large (max 5MB)' });
			}

			try {
				logoFilename = await processLogoUpload(params.workspace, logoFile);
			} catch (e) {
				console.error('Logo processing error:', e);
				return fail(500, { error: 'Failed to process logo image' });
			}
		}

		// Determine if tax is configured (state AND federal bracket both set)
		const taxConfigured = type === 'sole_prop' && stateCode !== null && federalBracketRate !== null ? 1 : 0;

		// Build update object
		const updateData: Record<string, unknown> = {
			name,
			type,
			businessName,
			address,
			phone,
			responsibleParty,
			foundedYear,
			fiscalYearStartMonth,
			updatedAt: new Date().toISOString()
		};

		// Only include tax fields for sole_prop
		if (type === 'sole_prop') {
			updateData.state = stateCode;
			updateData.federalBracketRate = federalBracketRate;
			updateData.stateRateOverride = stateRateOverride;
			updateData.localEitRate = localEitRate;
			updateData.taxNotes = taxNotes;
			updateData.taxConfigured = taxConfigured;
		}

		// Only update logo if a new one was uploaded
		if (logoFilename) {
			updateData.logoFilename = logoFilename;
		}

		// Update workspace settings in database
		db.update(workspaceSettings).set(updateData).run();

		// Update workspace name in registry (for workspace list)
		updateWorkspaceName(params.workspace, name);

		return { success: true, warnings };
	}
};

/**
 * Parse rate from display format (e.g., "3.07") to storage format (30700).
 * Returns null if input is empty or invalid.
 */
function parseRateFromInput(input: string | undefined | null): number | null {
	if (!input || input.trim() === '') return null;
	const rate = parseFloat(input);
	if (isNaN(rate) || rate < 0) return null;
	return Math.round(rate * 10000);
}
