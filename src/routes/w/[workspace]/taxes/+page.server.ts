import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { transactions, workspaceSettings, quarterlyPayments } from '$lib/server/db/schema';
import { isNull, and, gte, lte, eq, sql } from 'drizzle-orm';
import {
	getCurrentFiscalYear,
	getFiscalYearRange,
	getAvailableFiscalYears
} from '$lib/utils/fiscal-year';
import {
	calculateSelfEmploymentTax,
	calculateFederalIncomeTax,
	calculateStateIncomeTax,
	calculateLocalEIT,
	calculateQuarterlyPayments,
	type QuarterlyPayment as QuarterlyPaymentCalc
} from '$lib/utils/tax-calculations';
import { getStateRate } from '$lib/data/state-tax-rates';
import { getFormsForState } from '$lib/data/tax-forms';

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

	// Check if tax configuration is complete
	if (!settings.taxConfigured) {
		return {
			needsConfiguration: true as const,
			workspaceId: params.workspace
		};
	}

	const fiscalYearStartMonth = settings.fiscalYearStartMonth;
	const foundedYear = settings.foundedYear;

	// Parse URL params
	const fyParam = url.searchParams.get('fy');

	// Determine fiscal year (default to current)
	const currentFiscalYear = getCurrentFiscalYear(fiscalYearStartMonth);
	const fiscalYear = fyParam ? parseInt(fyParam, 10) : currentFiscalYear;

	// Get fiscal year date range
	const { start: fyStart, end: fyEnd } = getFiscalYearRange(fiscalYear, fiscalYearStartMonth);

	// Get available fiscal years for picker
	const availableFiscalYears = getAvailableFiscalYears(foundedYear, fiscalYearStartMonth);

	// Calculate YTD totals (excludes voided transactions)
	const baseConditions = [
		isNull(transactions.deletedAt),
		gte(transactions.date, fyStart),
		lte(transactions.date, fyEnd)
	];

	const totalsResult = db
		.select({
			totalIncome: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`,
			totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`
		})
		.from(transactions)
		.where(and(...baseConditions))
		.get();

	const totalIncome = totalsResult?.totalIncome ?? 0;
	const totalExpenses = totalsResult?.totalExpenses ?? 0;
	const netIncomeCents = totalIncome - totalExpenses;

	// Calculate tax rates from stored settings
	// federalBracketRate: stored as percentage (e.g., 22 for 22%) -> divide by 100
	const federalRate = (settings.federalBracketRate ?? 22) / 100;

	// stateRateOverride: stored as rate * 10000 (e.g., 307 for 3.07%) -> divide by 10000
	// If null, use default state rate
	let stateRate: number;
	let stateName: string;
	if (settings.stateRateOverride !== null) {
		stateRate = settings.stateRateOverride / 10000;
		stateName = settings.state ?? 'Unknown';
	} else {
		const stateData = getStateRate(settings.state ?? 'PA');
		stateRate = stateData?.rate ?? 0.0307;
		stateName = stateData?.name ?? 'Unknown';
	}

	// localEitRate: stored as rate * 10000 (e.g., 100 for 1%) -> divide by 10000
	const localEitRate = settings.localEitRate ? settings.localEitRate / 10000 : 0;

	// Calculate taxes
	const selfEmploymentTax = calculateSelfEmploymentTax(netIncomeCents);
	const federalTaxCents = calculateFederalIncomeTax(
		netIncomeCents,
		federalRate,
		selfEmploymentTax.deductibleCents
	);
	const stateTaxCents = calculateStateIncomeTax(netIncomeCents, stateRate);
	const localEitCents = calculateLocalEIT(netIncomeCents, localEitRate);

	const grandTotalCents =
		selfEmploymentTax.totalCents + federalTaxCents + stateTaxCents + localEitCents;

	// Query paid quarterly payments from database
	const paidPaymentsRaw = db
		.select()
		.from(quarterlyPayments)
		.where(eq(quarterlyPayments.fiscalYear, fiscalYear))
		.all();

	// Convert to format expected by calculateQuarterlyPayments
	const paidPayments = paidPaymentsRaw.map((p) => ({
		quarter: p.quarter,
		amountCents: (p.federalPaidCents ?? 0) + (p.statePaidCents ?? 0)
	}));

	// Get today's date for quarterly payment status
	const today = new Date().toISOString().slice(0, 10);

	// Calculate quarterly payment schedule
	const quarterlyPaymentSchedule = calculateQuarterlyPayments(
		fiscalYear,
		netIncomeCents,
		grandTotalCents,
		paidPayments,
		today
	);

	// Merge database records with calculated schedule for display
	const quarterlyPaymentsData = quarterlyPaymentSchedule.map((qp) => {
		const dbRecord = paidPaymentsRaw.find((p) => p.quarter === qp.quarter);
		return {
			...qp,
			federalPaidCents: dbRecord?.federalPaidCents ?? null,
			statePaidCents: dbRecord?.statePaidCents ?? null,
			paidAt: dbRecord?.paidAt ?? null,
			notes: dbRecord?.notes ?? null
		};
	});

	// Get tax forms for the configured state
	const formChecklist = getFormsForState(settings.state ?? 'PA');

	return {
		needsConfiguration: false as const,
		fiscalYear,
		availableFiscalYears,
		netIncomeCents,
		taxes: {
			selfEmployment: {
				totalCents: selfEmploymentTax.totalCents,
				taxableCents: selfEmploymentTax.taxableCents,
				socialSecurityCents: selfEmploymentTax.socialSecurityCents,
				medicareCents: selfEmploymentTax.medicareCents,
				additionalMedicareCents: selfEmploymentTax.additionalMedicareCents,
				deductibleCents: selfEmploymentTax.deductibleCents
			},
			federal: {
				totalCents: federalTaxCents,
				rate: federalRate,
				adjustedIncomeCents: netIncomeCents - selfEmploymentTax.deductibleCents
			},
			state: {
				totalCents: stateTaxCents,
				rate: stateRate,
				stateName
			},
			local: {
				totalCents: localEitCents,
				rate: localEitRate
			},
			grandTotal: grandTotalCents
		},
		quarterlyPayments: quarterlyPaymentsData,
		formChecklist,
		workspaceId: params.workspace
	};
};

export const actions: Actions = {
	markPaid: async ({ request, locals }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { message: 'Database not initialized' });
		}

		const formData = await request.formData();
		const quarter = parseInt(formData.get('quarter') as string, 10);
		const fiscalYear = parseInt(formData.get('fiscalYear') as string, 10);
		const federalPaidCents = parseInt(formData.get('federalPaidCents') as string, 10) || null;
		const statePaidCents = parseInt(formData.get('statePaidCents') as string, 10) || null;
		const notes = (formData.get('notes') as string) || null;

		if (isNaN(quarter) || quarter < 1 || quarter > 4) {
			return fail(400, { message: 'Invalid quarter' });
		}

		if (isNaN(fiscalYear)) {
			return fail(400, { message: 'Invalid fiscal year' });
		}

		const paidAt = new Date().toISOString();
		const updatedAt = paidAt;

		// Check if record exists
		const existing = db
			.select()
			.from(quarterlyPayments)
			.where(
				and(eq(quarterlyPayments.fiscalYear, fiscalYear), eq(quarterlyPayments.quarter, quarter))
			)
			.get();

		if (existing) {
			// Update existing record
			db.update(quarterlyPayments)
				.set({
					federalPaidCents,
					statePaidCents,
					paidAt,
					notes,
					updatedAt
				})
				.where(
					and(eq(quarterlyPayments.fiscalYear, fiscalYear), eq(quarterlyPayments.quarter, quarter))
				)
				.run();
		} else {
			// Insert new record
			db.insert(quarterlyPayments)
				.values({
					fiscalYear,
					quarter,
					federalPaidCents,
					statePaidCents,
					paidAt,
					notes
				})
				.run();
		}

		return { success: true };
	},

	unmarkPaid: async ({ request, locals }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { message: 'Database not initialized' });
		}

		const formData = await request.formData();
		const quarter = parseInt(formData.get('quarter') as string, 10);
		const fiscalYear = parseInt(formData.get('fiscalYear') as string, 10);

		if (isNaN(quarter) || quarter < 1 || quarter > 4) {
			return fail(400, { message: 'Invalid quarter' });
		}

		if (isNaN(fiscalYear)) {
			return fail(400, { message: 'Invalid fiscal year' });
		}

		// Delete the record
		db.delete(quarterlyPayments)
			.where(
				and(eq(quarterlyPayments.fiscalYear, fiscalYear), eq(quarterlyPayments.quarter, quarter))
			)
			.run();

		return { success: true };
	},

	skipQuarter: async ({ request, locals }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { message: 'Database not initialized' });
		}

		const formData = await request.formData();
		const quarter = parseInt(formData.get('quarter') as string, 10);
		const fiscalYear = parseInt(formData.get('fiscalYear') as string, 10);

		if (isNaN(quarter) || quarter < 1 || quarter > 4) {
			return fail(400, { message: 'Invalid quarter' });
		}

		if (isNaN(fiscalYear)) {
			return fail(400, { message: 'Invalid fiscal year' });
		}

		const skippedAt = new Date().toISOString();
		const updatedAt = skippedAt;

		// Check if record exists
		const existing = db
			.select()
			.from(quarterlyPayments)
			.where(
				and(eq(quarterlyPayments.fiscalYear, fiscalYear), eq(quarterlyPayments.quarter, quarter))
			)
			.get();

		if (existing) {
			// Update existing record to mark as skipped
			db.update(quarterlyPayments)
				.set({
					skippedAt,
					updatedAt
				})
				.where(
					and(eq(quarterlyPayments.fiscalYear, fiscalYear), eq(quarterlyPayments.quarter, quarter))
				)
				.run();
		} else {
			// Insert new record with skippedAt
			db.insert(quarterlyPayments)
				.values({
					fiscalYear,
					quarter,
					skippedAt
				})
				.run();
		}

		return { success: true };
	}
};
