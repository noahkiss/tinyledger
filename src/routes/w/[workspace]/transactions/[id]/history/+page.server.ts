import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { transactions, transactionHistory } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get transaction by publicId to get the internal id
	// Note: We allow viewing history of deleted transactions
	const transaction = db
		.select({
			id: transactions.id,
			publicId: transactions.publicId,
			payee: transactions.payee,
			deletedAt: transactions.deletedAt
		})
		.from(transactions)
		.where(eq(transactions.publicId, params.id))
		.get();

	if (!transaction) {
		throw error(404, 'Transaction not found');
	}

	// Get history records ordered by timestamp descending (most recent first)
	const history = db
		.select()
		.from(transactionHistory)
		.where(eq(transactionHistory.transactionId, transaction.id))
		.orderBy(desc(transactionHistory.timestamp))
		.all();

	return {
		transaction: {
			publicId: transaction.publicId,
			payee: transaction.payee,
			isDeleted: !!transaction.deletedAt
		},
		history
	};
};
