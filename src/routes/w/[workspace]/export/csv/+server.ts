import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import {
	transactions,
	transactionTags,
	tags,
	attachments
} from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { generateTransactionsCSV } from '$lib/server/export/csv-export';

export const GET: RequestHandler = async ({ locals, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Query all non-deleted transactions
	const transactionList = db
		.select()
		.from(transactions)
		.where(isNull(transactions.deletedAt))
		.orderBy(transactions.date)
		.all();

	// Get tag allocations and attachment presence for each transaction
	const exportTransactions = transactionList.map((txn) => {
		// Get tags for this transaction
		const tagAllocations = db
			.select({
				tagName: tags.name,
				percentage: transactionTags.percentage
			})
			.from(transactionTags)
			.innerJoin(tags, eq(transactionTags.tagId, tags.id))
			.where(eq(transactionTags.transactionId, txn.id))
			.all();

		// Format tags as "Tag1 (50%), Tag2 (50%)"
		const tagsStr = tagAllocations
			.map((t) => (t.percentage === 100 ? t.tagName : `${t.tagName} (${t.percentage}%)`))
			.join(', ');

		// Check if transaction has attachment
		const attachment = db
			.select({ id: attachments.id })
			.from(attachments)
			.where(eq(attachments.transactionId, txn.id))
			.get();

		return {
			publicId: txn.publicId,
			date: txn.date,
			type: txn.type as 'income' | 'expense',
			payee: txn.payee,
			amountCents: txn.amountCents,
			description: txn.description ?? undefined,
			paymentMethod: txn.paymentMethod,
			checkNumber: txn.checkNumber ?? undefined,
			tags: tagsStr,
			hasReceipt: !!attachment,
			voidedAt: txn.voidedAt ?? undefined
		};
	});

	const csv = generateTransactionsCSV(exportTransactions);

	const filename = `${params.workspace}-transactions-${new Date().toISOString().split('T')[0]}.csv`;

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
