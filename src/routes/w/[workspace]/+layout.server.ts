import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { workspaceSettings } from '$lib/server/db/schema';
import { listWorkspaces } from '$lib/server/workspace/registry';
import { getCurrentFiscalYear, getAvailableFiscalYears } from '$lib/utils/fiscal-year';

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	// Access db from hooks.server.ts injection
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings (singleton row)
	const settings = db.select().from(workspaceSettings).get();

	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	// Get all workspaces for the switcher
	const allWorkspaces = listWorkspaces();

	// Fiscal year data for header picker
	const fiscalYearStartMonth = settings.fiscalYearStartMonth;
	const foundedYear = settings.foundedYear;
	const currentFiscalYear = getCurrentFiscalYear(fiscalYearStartMonth);
	const fyParam = url.searchParams.get('fy');
	const fiscalYear = fyParam ? parseInt(fyParam, 10) : currentFiscalYear;
	const availableFiscalYears = getAvailableFiscalYears(foundedYear, fiscalYearStartMonth);

	return {
		workspaceId: params.workspace,
		settings,
		allWorkspaces,
		fiscalYear,
		availableFiscalYears,
		fiscalYearStartMonth
	};
};
