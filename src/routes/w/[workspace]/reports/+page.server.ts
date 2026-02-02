import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { transactions, transactionTags, tags, workspaceSettings } from '$lib/server/db/schema';
import { isNull, and, gte, lte, eq, sql } from 'drizzle-orm';
import {
	getCurrentFiscalYear,
	getFiscalYearRange,
	getAvailableFiscalYears
} from '$lib/utils/fiscal-year';
import { getMonthsInFiscalYear, TAX_SET_ASIDE_RATE } from '$lib/utils/reports';
import {
	calculateSelfEmploymentTax,
	calculateFederalIncomeTax,
	calculateStateIncomeTax,
	calculateLocalEIT
} from '$lib/utils/tax-calculations';
import { getStateRate } from '$lib/data/state-tax-rates';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings for fiscal year config
	const settings = db.select().from(workspaceSettings).get();
	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	const fiscalYearStartMonth = settings.fiscalYearStartMonth;
	const foundedYear = settings.foundedYear;

	// Parse URL params
	const fyParam = url.searchParams.get('fy');
	const granularity = (url.searchParams.get('granularity') as 'monthly' | 'quarterly') || 'monthly';

	// Determine fiscal year (default to current)
	const currentFiscalYear = getCurrentFiscalYear(fiscalYearStartMonth);
	const fiscalYear = fyParam ? parseInt(fyParam, 10) : currentFiscalYear;

	// Get fiscal year date range
	const { start: fyStart, end: fyEnd } = getFiscalYearRange(fiscalYear, fiscalYearStartMonth);

	// Get available fiscal years for picker
	const availableFiscalYears = getAvailableFiscalYears(foundedYear, fiscalYearStartMonth);

	// Base conditions - within fiscal year and not deleted
	const baseConditions = [
		isNull(transactions.deletedAt),
		gte(transactions.date, fyStart),
		lte(transactions.date, fyEnd)
	];

	// Calculate YTD totals (excludes voided transactions)
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
	const netIncome = totalIncome - totalExpenses;

	// Calculate tax set-aside based on configured rates (if available)
	let taxSetAside: number;
	let taxConfigured: boolean;
	let taxRateUsed: number;

	if (settings.type === 'sole_prop' && settings.taxConfigured && netIncome > 0) {
		// Use configured tax rates for accurate calculation
		const federalRate = (settings.federalBracketRate ?? 22) / 100;
		let stateRate: number;
		if (settings.stateRateOverride !== null) {
			stateRate = settings.stateRateOverride / 10000;
		} else {
			const stateData = getStateRate(settings.state ?? 'PA');
			stateRate = stateData?.rate ?? 0.0307;
		}
		const localEitRate = settings.localEitRate ? settings.localEitRate / 10000 : 0;

		// Calculate actual tax estimate
		const selfEmploymentTax = calculateSelfEmploymentTax(netIncome);
		const federalTax = calculateFederalIncomeTax(
			netIncome,
			federalRate,
			selfEmploymentTax.deductibleCents
		);
		const stateTax = calculateStateIncomeTax(netIncome, stateRate);
		const localTax = calculateLocalEIT(netIncome, localEitRate);

		taxSetAside = selfEmploymentTax.totalCents + federalTax + stateTax + localTax;
		taxConfigured = true;
		taxRateUsed = taxSetAside / netIncome; // Effective rate
	} else {
		// Fall back to default 25% estimate
		taxSetAside = netIncome > 0 ? Math.round(netIncome * TAX_SET_ASIDE_RATE) : 0;
		taxConfigured = false;
		taxRateUsed = TAX_SET_ASIDE_RATE;
	}

	// Calculate previous fiscal year totals for comparison
	const previousFiscalYear = fiscalYear - 1;
	const { start: prevFyStart, end: prevFyEnd } = getFiscalYearRange(
		previousFiscalYear,
		fiscalYearStartMonth
	);

	const prevTotalsResult = db
		.select({
			totalIncome: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`,
			totalExpenses: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`
		})
		.from(transactions)
		.where(
			and(
				isNull(transactions.deletedAt),
				gte(transactions.date, prevFyStart),
				lte(transactions.date, prevFyEnd)
			)
		)
		.get();

	const previousPeriod = {
		income: prevTotalsResult?.totalIncome ?? 0,
		expense: prevTotalsResult?.totalExpenses ?? 0,
		net: (prevTotalsResult?.totalIncome ?? 0) - (prevTotalsResult?.totalExpenses ?? 0)
	};

	// Aggregate data by period (monthly or quarterly)
	let periodData: { period: string; income: number; expense: number; net: number }[];

	if (granularity === 'quarterly') {
		// Quarterly aggregation
		const quarterlyData = db
			.select({
				period: sql<string>`strftime('%Y', date) || '-Q' || ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)`,
				income: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`,
				expense: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`
			})
			.from(transactions)
			.where(and(...baseConditions))
			.groupBy(
				sql`strftime('%Y', date) || '-Q' || ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)`
			)
			.orderBy(
				sql`strftime('%Y', date) || '-Q' || ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)`
			)
			.all();

		periodData = quarterlyData.map((row) => ({
			period: row.period,
			income: row.income,
			expense: row.expense,
			net: row.income - row.expense
		}));
	} else {
		// Monthly aggregation
		const monthlyData = db
			.select({
				period: sql<string>`strftime('%Y-%m', date)`,
				income: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`,
				expense: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' AND voided_at IS NULL THEN amount_cents ELSE 0 END), 0)`
			})
			.from(transactions)
			.where(and(...baseConditions))
			.groupBy(sql`strftime('%Y-%m', date)`)
			.orderBy(sql`strftime('%Y-%m', date)`)
			.all();

		periodData = monthlyData.map((row) => ({
			period: row.period,
			income: row.income,
			expense: row.expense,
			net: row.income - row.expense
		}));
	}

	// Get net income trend for sparkline (all months in FY)
	// Create a map from period data for quick lookup
	const periodMap = new Map(periodData.map((p) => [p.period, p.net]));
	const monthsInFY = getMonthsInFiscalYear(fiscalYear, fiscalYearStartMonth);

	// Build sparkline data: one value per month, 0 if no transactions
	const netIncomeTrend = monthsInFY.map((month) => periodMap.get(month) ?? 0);

	// Determine if current period is partial (viewing today's fiscal year)
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const isCurrentFiscalYear = fiscalYear === currentFiscalYear;
	const todayWithinFY = today >= fyStart && today <= fyEnd;
	const currentPeriodPartial = isCurrentFiscalYear && todayWithinFY;

	// Format asOfDate for display
	const asOfDate = currentPeriodPartial ? today : null;

	// Spending breakdown by tag (expense transactions only)
	// Uses percentage allocation to properly handle split transactions
	const spendingByTagRaw = db
		.select({
			tagId: tags.id,
			tagName: tags.name,
			totalCents: sql<number>`CAST(SUM(${transactions.amountCents} * ${transactionTags.percentage} / 100.0) AS INTEGER)`
		})
		.from(transactionTags)
		.innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
		.innerJoin(tags, eq(transactionTags.tagId, tags.id))
		.where(
			and(
				eq(transactions.type, 'expense'),
				isNull(transactions.voidedAt),
				isNull(transactions.deletedAt),
				gte(transactions.date, fyStart),
				lte(transactions.date, fyEnd)
			)
		)
		.groupBy(tags.id)
		.orderBy(sql`3 DESC`) // Order by totalCents descending
		.all();

	// Limit to top 10 tags, group remainder as "Other"
	let spendingByTag: { tagId: number; tagName: string; totalCents: number }[];
	if (spendingByTagRaw.length <= 10) {
		spendingByTag = spendingByTagRaw;
	} else {
		const top10 = spendingByTagRaw.slice(0, 10);
		const otherTotal = spendingByTagRaw.slice(10).reduce((sum, t) => sum + (t.totalCents ?? 0), 0);
		spendingByTag = [...top10, { tagId: -1, tagName: 'Other', totalCents: otherTotal }];
	}

	return {
		totals: {
			income: totalIncome,
			expense: totalExpenses,
			net: netIncome,
			taxSetAside,
			taxConfigured,
			taxRateUsed
		},
		previousPeriod,
		periodData,
		netIncomeTrend,
		spendingByTag,
		granularity,
		currentPeriodPartial,
		asOfDate,
		fiscalYear,
		availableFiscalYears,
		fiscalYearStartMonth,
		workspaceId: params.workspace
	};
};
