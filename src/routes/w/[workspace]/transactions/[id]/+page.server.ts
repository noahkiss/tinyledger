import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';
import {
	transactions,
	transactionTags,
	transactionHistory,
	tags,
	type Transaction
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get transaction by publicId, ensure not deleted
	const transaction = db
		.select()
		.from(transactions)
		.where(and(eq(transactions.publicId, params.id), isNull(transactions.deletedAt)))
		.get();

	if (!transaction) {
		throw error(404, 'Transaction not found');
	}

	// Get tag allocations for this transaction with tag names
	const tagAllocations = db
		.select({
			tagId: transactionTags.tagId,
			tagName: tags.name,
			percentage: transactionTags.percentage
		})
		.from(transactionTags)
		.leftJoin(tags, eq(transactionTags.tagId, tags.id))
		.where(eq(transactionTags.transactionId, transaction.id))
		.all();

	// Get all available tags for the edit form
	const availableTags = db.select().from(tags).all();

	return {
		transaction,
		tagAllocations,
		availableTags
	};
};

export const actions: Actions = {
	edit: async ({ locals, params, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		// Get existing transaction
		const existing = db
			.select()
			.from(transactions)
			.where(and(eq(transactions.publicId, params.id), isNull(transactions.deletedAt)))
			.get();

		if (!existing) {
			return fail(404, { error: 'Transaction not found' });
		}

		if (existing.voidedAt) {
			return fail(400, { error: 'Cannot edit voided transactions' });
		}

		const formData = await request.formData();

		// Parse form data
		const type = formData.get('type') as 'income' | 'expense';
		const amountCents = parseInt(formData.get('amount_cents') as string) || 0;
		const date = formData.get('date') as string;
		const payee = formData.get('payee') as string;
		const description = (formData.get('description') as string) || null;
		const paymentMethod = formData.get('paymentMethod') as 'cash' | 'card' | 'check';
		const checkNumber =
			paymentMethod === 'check' ? ((formData.get('checkNumber') as string) || null) : null;

		// Parse tag allocations from form
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

		// Build changed fields list
		const changedFields: string[] = [];
		if (existing.type !== type) changedFields.push('type');
		if (existing.amountCents !== amountCents) changedFields.push('amountCents');
		if (existing.date !== date) changedFields.push('date');
		if (existing.payee !== payee) changedFields.push('payee');
		if (existing.description !== description) changedFields.push('description');
		if (existing.paymentMethod !== paymentMethod) changedFields.push('paymentMethod');
		if (existing.checkNumber !== checkNumber) changedFields.push('checkNumber');

		// Check if tags changed (compare by converting to sorted JSON)
		const existingTags = db
			.select({ tagId: transactionTags.tagId, percentage: transactionTags.percentage })
			.from(transactionTags)
			.where(eq(transactionTags.transactionId, existing.id))
			.all();

		const sortedExisting = JSON.stringify(
			existingTags.sort((a, b) => a.tagId - b.tagId)
		);
		const sortedNew = JSON.stringify(
			tagAllocations.sort((a, b) => a.tagId - b.tagId)
		);
		if (sortedExisting !== sortedNew) changedFields.push('tags');

		// Only proceed if there are changes
		if (changedFields.length === 0) {
			return { success: true, message: 'No changes detected' };
		}

		// Create snapshot of previous state
		const previousState: Partial<Transaction> & { tags?: typeof existingTags } = {
			type: existing.type,
			amountCents: existing.amountCents,
			date: existing.date,
			payee: existing.payee,
			description: existing.description,
			paymentMethod: existing.paymentMethod,
			checkNumber: existing.checkNumber,
			tags: existingTags
		};

		// Insert history record
		db.insert(transactionHistory)
			.values({
				transactionId: existing.id,
				action: 'updated',
				previousState: JSON.stringify(previousState),
				changedFields: JSON.stringify(changedFields)
			})
			.run();

		// Update transaction
		db.update(transactions)
			.set({
				type,
				amountCents,
				date,
				payee,
				description,
				paymentMethod,
				checkNumber,
				updatedAt: new Date().toISOString()
			})
			.where(eq(transactions.id, existing.id))
			.run();

		// Update tag allocations: delete old, insert new
		db.delete(transactionTags).where(eq(transactionTags.transactionId, existing.id)).run();

		for (const allocation of tagAllocations) {
			db.insert(transactionTags)
				.values({
					transactionId: existing.id,
					tagId: allocation.tagId,
					percentage: allocation.percentage
				})
				.run();
		}

		return { success: true };
	},

	void: async ({ locals, params }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const transaction = db
			.select()
			.from(transactions)
			.where(and(eq(transactions.publicId, params.id), isNull(transactions.deletedAt)))
			.get();

		if (!transaction) {
			return fail(404, { error: 'Transaction not found' });
		}

		if (transaction.voidedAt) {
			return fail(400, { error: 'Transaction is already voided' });
		}

		// Create history record
		const previousState = {
			type: transaction.type,
			amountCents: transaction.amountCents,
			date: transaction.date,
			payee: transaction.payee,
			description: transaction.description,
			paymentMethod: transaction.paymentMethod,
			checkNumber: transaction.checkNumber,
			voidedAt: transaction.voidedAt
		};

		db.insert(transactionHistory)
			.values({
				transactionId: transaction.id,
				action: 'voided',
				previousState: JSON.stringify(previousState)
			})
			.run();

		// Update transaction with voidedAt timestamp
		const voidedAt = new Date().toISOString();
		db.update(transactions)
			.set({ voidedAt, updatedAt: voidedAt })
			.where(eq(transactions.id, transaction.id))
			.run();

		return { success: true, action: 'voided' };
	},

	unvoid: async ({ locals, params }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const transaction = db
			.select()
			.from(transactions)
			.where(and(eq(transactions.publicId, params.id), isNull(transactions.deletedAt)))
			.get();

		if (!transaction) {
			return fail(404, { error: 'Transaction not found' });
		}

		if (!transaction.voidedAt) {
			return fail(400, { error: 'Transaction is not voided' });
		}

		// Create history record
		const previousState = {
			type: transaction.type,
			amountCents: transaction.amountCents,
			date: transaction.date,
			payee: transaction.payee,
			description: transaction.description,
			paymentMethod: transaction.paymentMethod,
			checkNumber: transaction.checkNumber,
			voidedAt: transaction.voidedAt
		};

		db.insert(transactionHistory)
			.values({
				transactionId: transaction.id,
				action: 'unvoided',
				previousState: JSON.stringify(previousState)
			})
			.run();

		// Clear voidedAt
		db.update(transactions)
			.set({ voidedAt: null, updatedAt: new Date().toISOString() })
			.where(eq(transactions.id, transaction.id))
			.run();

		return { success: true, action: 'unvoided' };
	},

	delete: async ({ locals, params }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const transaction = db
			.select()
			.from(transactions)
			.where(and(eq(transactions.publicId, params.id), isNull(transactions.deletedAt)))
			.get();

		if (!transaction) {
			return fail(404, { error: 'Transaction not found' });
		}

		// CRITICAL: Can only delete voided transactions
		if (!transaction.voidedAt) {
			return fail(400, { error: 'Cannot delete active transaction. Void it first.' });
		}

		// Create history record
		const previousState = {
			type: transaction.type,
			amountCents: transaction.amountCents,
			date: transaction.date,
			payee: transaction.payee,
			description: transaction.description,
			paymentMethod: transaction.paymentMethod,
			checkNumber: transaction.checkNumber,
			voidedAt: transaction.voidedAt
		};

		db.insert(transactionHistory)
			.values({
				transactionId: transaction.id,
				action: 'deleted',
				previousState: JSON.stringify(previousState)
			})
			.run();

		// Soft delete: set deletedAt timestamp
		const deletedAt = new Date().toISOString();
		db.update(transactions)
			.set({ deletedAt, updatedAt: deletedAt })
			.where(eq(transactions.id, transaction.id))
			.run();

		// Redirect to transactions list
		throw redirect(303, `/w/${params.workspace}/transactions`);
	}
};
