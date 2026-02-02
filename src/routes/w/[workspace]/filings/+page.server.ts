import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { workspaceSettings, filings } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	getCurrentFiscalYear,
	getAvailableFiscalYears
} from '$lib/utils/fiscal-year';
import { getFilingsForWorkspace } from '$lib/data/filing-forms';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings
	const settings = db.select().from(workspaceSettings).get();
	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	const fiscalYearStartMonth = settings.fiscalYearStartMonth;
	const foundedYear = settings.foundedYear;
	const workspaceType = settings.type;
	const workspaceState = settings.state ?? 'PA';

	// Parse URL params for fiscal year
	const fyParam = url.searchParams.get('fy');
	const currentFiscalYear = getCurrentFiscalYear(fiscalYearStartMonth);
	const fiscalYear = fyParam ? parseInt(fyParam, 10) : currentFiscalYear;

	// Get available fiscal years for picker
	const availableFiscalYears = getAvailableFiscalYears(foundedYear, fiscalYearStartMonth);

	// Get filing definitions for this workspace type and state
	const filingDefinitions = getFilingsForWorkspace(workspaceType, workspaceState);

	// Query existing filing records for this fiscal year
	const existingFilings = db
		.select()
		.from(filings)
		.where(eq(filings.fiscalYear, fiscalYear))
		.all();

	// Build map of existing records by formId
	const filingRecordsMap = new Map(existingFilings.map((f) => [f.formId, f]));

	// Get today's date for status calculation
	const today = new Date().toISOString().slice(0, 10);

	// Calculate 30 days from now for "upcoming" threshold
	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
	const upcomingThreshold = thirtyDaysFromNow.toISOString().slice(0, 10);

	// Merge definitions with database records and compute status
	const filingsData = filingDefinitions.map((def) => {
		const deadline = def.getDeadline(fiscalYear);
		const record = filingRecordsMap.get(def.id);

		const isComplete = record?.filedAt !== undefined && record?.filedAt !== null;
		const isPastDue = !isComplete && deadline.date < today;
		const isUpcoming = !isComplete && !isPastDue && deadline.date <= upcomingThreshold;

		return {
			id: def.id,
			name: def.name,
			fullName: def.fullName,
			description: def.description,
			deadline: deadline.date,
			deadlineLabel: deadline.label,
			category: def.category,
			instructionsUrl: def.instructionsUrl,
			filingThreshold: def.filingThreshold,
			frequency: def.frequency,
			quarter: def.quarter,
			// Status from database
			isComplete,
			filedAt: record?.filedAt ?? null,
			confirmationNumber: record?.confirmationNumber ?? null,
			notes: record?.notes ?? null,
			// Computed status
			isPastDue,
			isUpcoming
		};
	});

	// Sort: past-due first, then upcoming, then future incomplete, then complete
	filingsData.sort((a, b) => {
		// Priority: past-due (1) > upcoming (2) > future incomplete (3) > complete (4)
		const getPriority = (f: typeof a) => {
			if (f.isPastDue) return 1;
			if (f.isUpcoming) return 2;
			if (!f.isComplete) return 3;
			return 4;
		};

		const priorityA = getPriority(a);
		const priorityB = getPriority(b);

		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}

		// Within same priority, sort by deadline date
		return a.deadline.localeCompare(b.deadline);
	});

	return {
		filings: filingsData,
		fiscalYear,
		availableFiscalYears,
		workspaceId: params.workspace,
		workspaceType
	};
};

export const actions: Actions = {
	markComplete: async ({ request, locals }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { message: 'Database not initialized' });
		}

		const formData = await request.formData();
		const formId = formData.get('formId') as string;
		const fiscalYear = parseInt(formData.get('fiscalYear') as string, 10);
		const filedAt = (formData.get('filedAt') as string) || new Date().toISOString().slice(0, 10);
		const confirmationNumber = (formData.get('confirmationNumber') as string) || null;
		const notes = (formData.get('notes') as string) || null;

		if (!formId) {
			return fail(400, { message: 'Form ID is required' });
		}

		if (isNaN(fiscalYear)) {
			return fail(400, { message: 'Invalid fiscal year' });
		}

		// Convert date to ISO timestamp
		const filedAtTimestamp = new Date(filedAt).toISOString();
		const now = new Date().toISOString();

		// Check if record exists
		const existing = db
			.select()
			.from(filings)
			.where(and(eq(filings.fiscalYear, fiscalYear), eq(filings.formId, formId)))
			.get();

		if (existing) {
			// Update existing record
			db.update(filings)
				.set({
					filedAt: filedAtTimestamp,
					confirmationNumber,
					notes,
					updatedAt: now
				})
				.where(and(eq(filings.fiscalYear, fiscalYear), eq(filings.formId, formId)))
				.run();
		} else {
			// Insert new record
			db.insert(filings)
				.values({
					fiscalYear,
					formId,
					filedAt: filedAtTimestamp,
					confirmationNumber,
					notes
				})
				.run();
		}

		return { success: true };
	},

	unmarkComplete: async ({ request, locals }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { message: 'Database not initialized' });
		}

		const formData = await request.formData();
		const formId = formData.get('formId') as string;
		const fiscalYear = parseInt(formData.get('fiscalYear') as string, 10);

		if (!formId) {
			return fail(400, { message: 'Form ID is required' });
		}

		if (isNaN(fiscalYear)) {
			return fail(400, { message: 'Invalid fiscal year' });
		}

		// Delete the record
		db.delete(filings)
			.where(and(eq(filings.fiscalYear, fiscalYear), eq(filings.formId, formId)))
			.run();

		return { success: true };
	}
};
