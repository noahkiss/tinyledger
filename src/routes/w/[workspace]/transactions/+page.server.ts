import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	transactions,
	transactionTags,
	tags,
	workspaceSettings,
	transactionHistory,
	quarterlyPayments,
	recurringTemplates,
	skippedInstances
} from '$lib/server/db/schema';
import { eq, isNull, desc, and, gte, lte, like, sql } from 'drizzle-orm';
import {
	getCurrentFiscalYear,
	getFiscalYearRange,
	getAvailableFiscalYears
} from '$lib/utils/fiscal-year';
import {
	getQuarterlyDueDates,
	calculateSelfEmploymentTax,
	calculateFederalIncomeTax,
	calculateStateIncomeTax,
	calculateLocalEIT
} from '$lib/utils/tax-calculations';
import { getStateRate } from '$lib/data/state-tax-rates';
import { getAllPendingForTimeline, type PendingInstance } from '$lib/server/recurring/instances';

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

	// Get payee history with aggregated data for quick entry autocomplete
	const payeeHistoryRaw = db
		.select({
			payee: transactions.payee,
			count: sql<number>`count(*)`,
			lastAmount: sql<number>`(
				SELECT amount_cents FROM transactions t2
				WHERE t2.payee = ${transactions.payee}
				AND t2.voided_at IS NULL AND t2.deleted_at IS NULL
				ORDER BY t2.date DESC, t2.id DESC LIMIT 1
			)`,
			lastType: sql<string>`(
				SELECT type FROM transactions t2
				WHERE t2.payee = ${transactions.payee}
				AND t2.voided_at IS NULL AND t2.deleted_at IS NULL
				ORDER BY t2.date DESC, t2.id DESC LIMIT 1
			)`,
			lastTransactionId: sql<number>`(
				SELECT id FROM transactions t2
				WHERE t2.payee = ${transactions.payee}
				AND t2.voided_at IS NULL AND t2.deleted_at IS NULL
				ORDER BY t2.date DESC, t2.id DESC LIMIT 1
			)`
		})
		.from(transactions)
		.where(and(isNull(transactions.voidedAt), isNull(transactions.deletedAt)))
		.groupBy(transactions.payee)
		.orderBy(desc(sql`count(*)`))
		.all();

	// For each payee, get the tags from their last transaction
	const payeeHistory = payeeHistoryRaw.map((p) => {
		const lastTags = db
			.select({
				id: tags.id,
				name: tags.name,
				percentage: transactionTags.percentage
			})
			.from(transactionTags)
			.innerJoin(tags, eq(transactionTags.tagId, tags.id))
			.where(eq(transactionTags.transactionId, p.lastTransactionId))
			.all();

		return {
			payee: p.payee,
			count: p.count,
			lastAmount: p.lastAmount,
			lastType: p.lastType as 'income' | 'expense',
			lastTags
		};
	});

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

	// Calculate quarterly payment data for timeline (only for sole_prop with tax configured)
	let quarterlyPaymentsData: {
		quarter: 1 | 2 | 3 | 4;
		dueDate: string;
		dueDateLabel: string;
		federalRecommendedCents: number;
		stateRecommendedCents: number;
		isPaid: boolean;
		paidFederalCents: number | null;
		paidStateCents: number | null;
		isPastDue: boolean;
		isUpcoming: boolean;
	}[] = [];

	if (settings.type === 'sole_prop' && settings.taxConfigured) {
		// Calculate tax rates from stored settings
		const federalRate = (settings.federalBracketRate ?? 22) / 100;
		let stateRate: number;
		if (settings.stateRateOverride !== null) {
			stateRate = settings.stateRateOverride / 10000;
		} else {
			const stateData = getStateRate(settings.state ?? 'PA');
			stateRate = stateData?.rate ?? 0.0307;
		}
		const localEitRate = settings.localEitRate ? settings.localEitRate / 10000 : 0;

		// Calculate taxes using net income
		const selfEmploymentTax = calculateSelfEmploymentTax(netIncome);
		const federalTaxCents = calculateFederalIncomeTax(
			netIncome,
			federalRate,
			selfEmploymentTax.deductibleCents
		);
		const stateTaxCents = calculateStateIncomeTax(netIncome, stateRate);
		const localEitCents = calculateLocalEIT(netIncome, localEitRate);

		const totalEstimatedTaxCents =
			selfEmploymentTax.totalCents + federalTaxCents + stateTaxCents + localEitCents;

		// Query paid quarterly payments from database
		const paidPaymentsRaw = db
			.select()
			.from(quarterlyPayments)
			.where(eq(quarterlyPayments.fiscalYear, fiscalYear))
			.all();

		// Get quarterly due dates
		const dueDates = getQuarterlyDueDates(fiscalYear);
		const today = new Date().toISOString().slice(0, 10);
		const todayDate = new Date(today);

		// Calculate total already paid
		const totalPaidCents = paidPaymentsRaw.reduce(
			(sum, p) => sum + (p.federalPaidCents ?? 0) + (p.statePaidCents ?? 0),
			0
		);
		const remainingTaxCents = Math.max(0, totalEstimatedTaxCents - totalPaidCents);

		// Count remaining unpaid quarters
		const paidQuarters = new Set(paidPaymentsRaw.map((p) => p.quarter));
		const unpaidQuarters = [1, 2, 3, 4].filter((q) => !paidQuarters.has(q)).length;

		// Calculate per-quarter recommended amount
		const perQuarterCents = unpaidQuarters > 0 ? Math.round(remainingTaxCents / unpaidQuarters) : 0;

		// Split recommended amounts: federal portion and state portion
		const totalTaxRate = federalRate + selfEmploymentTax.totalCents / (netIncome || 1);
		const federalPortion = netIncome > 0 ? (federalTaxCents + selfEmploymentTax.totalCents) / totalEstimatedTaxCents : 0.7;
		const statePortion = netIncome > 0 ? (stateTaxCents + localEitCents) / totalEstimatedTaxCents : 0.3;

		quarterlyPaymentsData = dueDates.map((dd) => {
			const dbRecord = paidPaymentsRaw.find((p) => p.quarter === dd.quarter);
			const isPaid = !!dbRecord;
			const dueDateObj = new Date(dd.dueDate);
			const daysUntilDue = Math.floor(
				(dueDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			// Recommended split
			const federalRecommendedCents = Math.round(perQuarterCents * federalPortion);
			const stateRecommendedCents = perQuarterCents - federalRecommendedCents; // Ensure no rounding loss

			return {
				quarter: dd.quarter,
				dueDate: dd.dueDate,
				dueDateLabel: dd.label,
				federalRecommendedCents: isPaid ? (dbRecord?.federalPaidCents ?? 0) : federalRecommendedCents,
				stateRecommendedCents: isPaid ? (dbRecord?.statePaidCents ?? 0) : stateRecommendedCents,
				isPaid,
				paidFederalCents: dbRecord?.federalPaidCents ?? null,
				paidStateCents: dbRecord?.statePaidCents ?? null,
				isPastDue: !isPaid && dd.dueDate < today,
				isUpcoming: !isPaid && daysUntilDue >= 0 && daysUntilDue <= 30
			};
		});
	}

	// Calculate pending recurring instances
	let pendingInstances: PendingInstance[] = [];

	// Get active recurring templates
	const activeTemplates = db
		.select()
		.from(recurringTemplates)
		.where(eq(recurringTemplates.active, true))
		.all();

	if (activeTemplates.length > 0) {
		// Get confirmed transaction dates by template
		const confirmedByTemplate = new Map<number, Set<string>>();
		const confirmedTransactions = db
			.select({
				templateId: transactions.recurringTemplateId,
				date: transactions.date
			})
			.from(transactions)
			.where(
				and(
					sql`${transactions.recurringTemplateId} IS NOT NULL`,
					isNull(transactions.deletedAt)
				)
			)
			.all();

		for (const ct of confirmedTransactions) {
			if (ct.templateId) {
				if (!confirmedByTemplate.has(ct.templateId)) {
					confirmedByTemplate.set(ct.templateId, new Set());
				}
				confirmedByTemplate.get(ct.templateId)!.add(ct.date);
			}
		}

		// Get skipped dates by template
		const skippedByTemplate = new Map<number, Set<string>>();
		const skippedRecords = db.select().from(skippedInstances).all();

		for (const sr of skippedRecords) {
			if (!skippedByTemplate.has(sr.templateId)) {
				skippedByTemplate.set(sr.templateId, new Set());
			}
			skippedByTemplate.get(sr.templateId)!.add(sr.date);
		}

		// Get pending instances for timeline
		pendingInstances = getAllPendingForTimeline(
			activeTemplates,
			confirmedByTemplate,
			skippedByTemplate,
			fyStart,
			fyEnd
		);
	}

	return {
		transactions: transactionsWithTags,
		tags: availableTags,
		payeeHistory,
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
		fiscalYearStartMonth,
		quarterlyPayments: quarterlyPaymentsData,
		pendingInstances
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();

		// Parse form data
		const type = formData.get('type') as 'income' | 'expense';
		const amountCents = parseInt(formData.get('amount_cents') as string) || 0;
		const date = formData.get('date') as string;
		const payee = formData.get('payee') as string;
		const description = (formData.get('description') as string) || null;
		const paymentMethod = (formData.get('paymentMethod') as 'cash' | 'card' | 'check') || 'card';

		// Validate required fields
		if (!type || !['income', 'expense'].includes(type)) {
			return fail(400, { error: 'Invalid transaction type' });
		}
		if (!amountCents || amountCents <= 0) {
			return fail(400, { error: 'Amount must be greater than 0' });
		}
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return fail(400, { error: 'Invalid date format (expected YYYY-MM-DD)' });
		}
		// Validate date is a real date
		const [year, month, day] = date.split('-').map(Number);
		const dateObj = new Date(year, month - 1, day);
		if (
			dateObj.getFullYear() !== year ||
			dateObj.getMonth() !== month - 1 ||
			dateObj.getDate() !== day
		) {
			return fail(400, { error: 'Invalid date' });
		}
		if (!payee || !payee.trim()) {
			return fail(400, { error: 'Payee is required' });
		}

		// Parse tag allocations from form (simplified - single tag with 100%)
		const tagAllocations: { tagId: number; percentage: number }[] = [];
		let tagIndex = 0;
		while (formData.has(`tag_${tagIndex}`)) {
			const tagId = parseInt(formData.get(`tag_${tagIndex}`) as string);
			const percentage = parseInt(formData.get(`percentage_${tagIndex}`) as string) || 0;
			if (tagId > 0 && percentage > 0) {
				tagAllocations.push({ tagId, percentage });
			}
			tagIndex++;
		}

		// Validate tag allocations sum to 100% if any tags are present
		if (tagAllocations.length > 0) {
			const totalPercentage = tagAllocations.reduce((sum, a) => sum + a.percentage, 0);
			if (totalPercentage !== 100) {
				return fail(400, {
					error: `Tag percentages must sum to 100% (currently ${totalPercentage}%)`
				});
			}
		}

		// Generate public ID using native crypto
		const publicId = crypto.randomUUID();

		// Insert transaction
		const result = db
			.insert(transactions)
			.values({
				publicId,
				type,
				amountCents,
				date,
				payee: payee.trim(),
				description: description?.trim() || null,
				paymentMethod
			})
			.run();

		const transactionId = Number(result.lastInsertRowid);

		// Insert tag allocations
		for (const allocation of tagAllocations) {
			db.insert(transactionTags)
				.values({
					transactionId,
					tagId: allocation.tagId,
					percentage: allocation.percentage
				})
				.run();
		}

		// Insert history record for creation
		db.insert(transactionHistory)
			.values({
				transactionId,
				action: 'created'
			})
			.run();

		return { success: true, publicId };
	},

	skip: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const templateId = parseInt(formData.get('templateId') as string);
		const date = formData.get('date') as string;

		if (!templateId || !date) {
			return fail(400, { error: 'Template ID and date required' });
		}

		// Check if already skipped
		const existing = db
			.select()
			.from(skippedInstances)
			.where(and(eq(skippedInstances.templateId, templateId), eq(skippedInstances.date, date)))
			.get();

		if (!existing) {
			db.insert(skippedInstances)
				.values({
					templateId,
					date
				})
				.run();
		}

		return { success: true };
	}
};
