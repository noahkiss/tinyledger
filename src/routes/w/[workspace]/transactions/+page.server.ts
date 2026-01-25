import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { transactions, transactionTags, tags } from '$lib/server/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Query transactions excluding soft-deleted ones
	// ORDER BY date DESC, createdAt DESC for consistent ordering
	const transactionList = db
		.select()
		.from(transactions)
		.where(isNull(transactions.deletedAt))
		.orderBy(desc(transactions.date), desc(transactions.createdAt))
		.limit(50)
		.all();

	// Get tag allocations for each transaction
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

	// Query all tags for the create form
	const availableTags = db.select().from(tags).orderBy(tags.name).all();

	return {
		transactions: transactionsWithTags,
		tags: availableTags
	};
};
