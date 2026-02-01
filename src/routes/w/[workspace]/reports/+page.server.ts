import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { transactions, workspaceSettings } from '$lib/server/db/schema';
import { isNull, and, gte, lte, sql } from 'drizzle-orm';
import {
	getCurrentFiscalYear,
	getFiscalYearRange,
	getAvailableFiscalYears
} from '$lib/utils/fiscal-year';
import { getMonthsInFiscalYear, TAX_SET_ASIDE_RATE } from '$lib/utils/reports';

export const load: PageServerLoad = async ({ locals, url }) => {
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
	const taxSetAside = netIncome > 0 ? Math.round(netIncome * TAX_SET_ASIDE_RATE) : 0;

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

	return {
		totals: {
			income: totalIncome,
			expense: totalExpenses,
			net: netIncome,
			taxSetAside
		},
		previousPeriod,
		periodData,
		netIncomeTrend,
		granularity,
		fiscalYear,
		availableFiscalYears,
		fiscalYearStartMonth
	};
};
