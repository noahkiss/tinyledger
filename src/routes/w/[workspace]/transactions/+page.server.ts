import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { transactions, transactionTags, tags, workspaceSettings } from '$lib/server/db/schema';
import { eq, isNull, desc, and, gte, lte, like, or, sql } from 'drizzle-orm';
import {
	getCurrentFiscalYear,
	getFiscalYearRange,
	getAvailableFiscalYears
} from '$lib/utils/fiscal-year';

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

	// Parse URL search params for filters
	const fyParam = url.searchParams.get('fy');
	const payeeFilter = url.searchParams.get('payee');
	const tagFilters = url.searchParams.getAll('tag').map(Number).filter(Boolean);
	const fromFilter = url.searchParams.get('from');
	const toFilter = url.searchParams.get('to');
	const typeFilter = url.searchParams.get('type') as 'income' | 'expense' | null;
	const methodFilter = url.searchParams.get('method') as 'cash' | 'card' | 'check' | null;

	// Determine fiscal year (default to current)
	const currentFiscalYear = getCurrentFiscalYear(fiscalYearStartMonth);
	const fiscalYear = fyParam ? parseInt(fyParam, 10) : currentFiscalYear;

	// Get fiscal year date range
	const { start: fyStart, end: fyEnd } = getFiscalYearRange(fiscalYear, fiscalYearStartMonth);

	// Get available fiscal years for picker
	const availableFiscalYears = getAvailableFiscalYears(foundedYear, fiscalYearStartMonth);

	// Build base conditions - always filter by fiscal year date range and exclude deleted
	const baseConditions = [
		isNull(transactions.deletedAt),
		gte(transactions.date, fyStart),
		lte(transactions.date, fyEnd)
	];

	// Build filter conditions (beyond base)
	const filterConditions = [...baseConditions];

	// Type filter
	if (typeFilter === 'income' || typeFilter === 'expense') {
		filterConditions.push(eq(transactions.type, typeFilter));
	}

	// Payee filter (substring match)
	if (payeeFilter && payeeFilter.trim()) {
		filterConditions.push(like(transactions.payee, `%${payeeFilter.trim()}%`));
	}

	// Date range filters (within fiscal year)
	if (fromFilter) {
		filterConditions.push(gte(transactions.date, fromFilter));
	}
	if (toFilter) {
		filterConditions.push(lte(transactions.date, toFilter));
	}

	// Payment method filter
	if (methodFilter && ['cash', 'card', 'check'].includes(methodFilter)) {
		filterConditions.push(eq(transactions.paymentMethod, methodFilter));
	}

	// Query transactions with all filters
	let transactionQuery = db
		.select()
		.from(transactions)
		.where(and(...filterConditions))
		.orderBy(desc(transactions.date), desc(transactions.createdAt));

	let transactionList = transactionQuery.all();

	// If tag filters are present, filter transactions that have at least one matching tag
	if (tagFilters.length > 0) {
		const transactionIds = transactionList.map((t) => t.id);
		if (transactionIds.length > 0) {
			// Get transaction IDs that have at least one of the filtered tags
			const matchingTagAllocations = db
				.select({ transactionId: transactionTags.transactionId })
				.from(transactionTags)
				.where(
					and(
						sql`${transactionTags.transactionId} IN (${sql.join(transactionIds, sql`, `)})`,
						sql`${transactionTags.tagId} IN (${sql.join(tagFilters, sql`, `)})`
					)
				)
				.all();

			const matchingTransactionIds = new Set(matchingTagAllocations.map((a) => a.transactionId));
			transactionList = transactionList.filter((t) => matchingTransactionIds.has(t.id));
		}
	}

	// Get tag allocations for filtered transactions
	const transactionsWithTags = transactionList.map((txn) => {
		const tagAllocations = db
			.select({
				tagId: transactionTags.tagId,
				tagName: tags.name,
				percentage: transactionTags.percentage
			})
			.from(transactionTags)
			.innerJoin(tags, eq(transactionTags.tagId, tags.id))
			.where(eq(transactionTags.transactionId, txn.id))
			.all();

		return {
			...txn,
			tags: tagAllocations
		};
	});

	// Calculate totals for the fiscal year (excludes voided, not affected by other filters)
	const allFYTransactions = db
		.select({
			type: transactions.type,
			amountCents: transactions.amountCents,
			voidedAt: transactions.voidedAt
		})
		.from(transactions)
		.where(and(...baseConditions))
		.all();

	let totalIncome = 0;
	let totalExpenses = 0;

	for (const txn of allFYTransactions) {
		// Skip voided transactions in totals
		if (txn.voidedAt) continue;

		if (txn.type === 'income') {
			totalIncome += txn.amountCents;
		} else {
			totalExpenses += txn.amountCents;
		}
	}

	const netIncome = totalIncome - totalExpenses;

	// Count totals for display
	const totalCount = allFYTransactions.length;
	const filteredCount = transactionsWithTags.length;

	// Query all tags for filters
	const availableTags = db.select().from(tags).orderBy(tags.name).all();

	// Return current filter state for UI
	const currentFilters = {
		fy: fiscalYear,
		payee: payeeFilter || '',
		tags: tagFilters,
		from: fromFilter || '',
		to: toFilter || '',
		type: typeFilter || '',
		method: methodFilter || ''
	};

	return {
		transactions: transactionsWithTags,
		tags: availableTags,
		totals: {
			income: totalIncome,
			expense: totalExpenses,
			net: netIncome
		},
		currentFilters,
		availableFiscalYears,
		fiscalYear,
		filteredCount,
		totalCount,
		fiscalYearStartMonth
	};
};
