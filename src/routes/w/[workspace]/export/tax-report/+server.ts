import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { Readable } from 'node:stream';
import {
	transactions,
	transactionTags,
	tags,
	attachments,
	workspaceSettings
} from '$lib/server/db/schema';
import { isNull, and, gte, lte, eq, sql } from 'drizzle-orm';
import { getCurrentFiscalYear, getFiscalYearRange } from '$lib/utils/fiscal-year';
import { getLogoBuffer } from '$lib/server/storage/logo';
import { generateTaxReportPDF, type TaxReportData, type TaxReportTag } from '$lib/server/reports/tax-report';

export const GET: RequestHandler = async ({ locals, url, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings
	const settings = db.select().from(workspaceSettings).get();
	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	// Parse fiscal year from query param (default to current)
	const fyParam = url.searchParams.get('fy');
	const fiscalYearStartMonth = settings.fiscalYearStartMonth;
	const currentFiscalYear = getCurrentFiscalYear(fiscalYearStartMonth);
	const fiscalYear = fyParam ? parseInt(fyParam, 10) : currentFiscalYear;

	// Get fiscal year date range
	const { start: fyStart, end: fyEnd } = getFiscalYearRange(fiscalYear, fiscalYearStartMonth);

	// Load logo buffer if available
	let logoBuffer: Buffer | undefined;
	if (settings.logoFilename) {
		const buffer = getLogoBuffer(params.workspace, settings.logoFilename);
		if (buffer) {
			logoBuffer = buffer;
		}
	}

	// Query all transactions for the fiscal year with tags and attachment status
	// Uses a subquery to check if attachment exists
	const transactionRows = db
		.select({
			id: transactions.id,
			publicId: transactions.publicId,
			type: transactions.type,
			date: transactions.date,
			payee: transactions.payee,
			amountCents: transactions.amountCents,
			hasAttachment: sql<number>`(SELECT COUNT(*) FROM attachments WHERE transaction_id = ${transactions.id}) > 0`
		})
		.from(transactions)
		.where(
			and(
				isNull(transactions.voidedAt),
				isNull(transactions.deletedAt),
				gte(transactions.date, fyStart),
				lte(transactions.date, fyEnd)
			)
		)
		.orderBy(transactions.date)
		.all();

	// Get tags for each transaction
	const transactionIds = transactionRows.map((t) => t.id);

	// Build a map of transaction ID to tags
	const tagsByTransaction = new Map<number, string[]>();
	if (transactionIds.length > 0) {
		const tagRows = db
			.select({
				transactionId: transactionTags.transactionId,
				tagName: tags.name
			})
			.from(transactionTags)
			.innerJoin(tags, eq(transactionTags.tagId, tags.id))
			.where(sql`${transactionTags.transactionId} IN (${sql.raw(transactionIds.join(','))})`)
			.all();

		for (const row of tagRows) {
			const existing = tagsByTransaction.get(row.transactionId) || [];
			existing.push(row.tagName);
			tagsByTransaction.set(row.transactionId, existing);
		}
	}

	// Group transactions by type and tag
	const incomeByTag = new Map<string, TaxReportTag>();
	const expenseByTag = new Map<string, TaxReportTag>();

	for (const txn of transactionRows) {
		const txnTags = tagsByTransaction.get(txn.id) || ['Uncategorized'];
		const isIncome = txn.type === 'income';
		const targetMap = isIncome ? incomeByTag : expenseByTag;

		// For each tag on this transaction
		for (const tagName of txnTags) {
			let tagGroup = targetMap.get(tagName);
			if (!tagGroup) {
				tagGroup = {
					name: tagName,
					transactions: [],
					totalCents: 0
				};
				targetMap.set(tagName, tagGroup);
			}

			tagGroup.transactions.push({
				date: txn.date,
				payee: txn.payee,
				amountCents: txn.amountCents,
				hasReceipt: Boolean(txn.hasAttachment)
			});
			tagGroup.totalCents += txn.amountCents;
		}
	}

	// Convert maps to sorted arrays (by total, descending)
	const income = Array.from(incomeByTag.values()).sort((a, b) => b.totalCents - a.totalCents);
	const expenses = Array.from(expenseByTag.values()).sort((a, b) => b.totalCents - a.totalCents);

	// Calculate summary
	const totalIncomeCents = income.reduce((sum, t) => sum + t.totalCents, 0);
	const totalExpensesCents = expenses.reduce((sum, t) => sum + t.totalCents, 0);
	const transactionCount = transactionRows.length;
	const receiptCount = transactionRows.filter((t) => Boolean(t.hasAttachment)).length;

	// Build report data
	const reportData: TaxReportData = {
		workspace: {
			name: settings.name,
			businessName: settings.businessName || undefined,
			ein: settings.ein || undefined,
			address: settings.address || undefined,
			logoBuffer
		},
		fiscalYear,
		fiscalYearStartMonth,
		income,
		expenses,
		summary: {
			totalIncomeCents,
			totalExpensesCents,
			netIncomeCents: totalIncomeCents - totalExpensesCents,
			transactionCount,
			receiptCount,
			receiptPercentage: transactionCount > 0 ? (receiptCount / transactionCount) * 100 : 0
		}
	};

	// Generate PDF
	const doc = generateTaxReportPDF(reportData);
	doc.end();

	// Stream response
	const stream = Readable.toWeb(doc) as ReadableStream;

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="TaxReport-FY${fiscalYear}.pdf"`
		}
	});
};
