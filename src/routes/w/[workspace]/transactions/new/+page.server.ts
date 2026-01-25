import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	tags,
	transactions,
	transactionTags,
	transactionHistory,
	workspaceSettings
} from '$lib/server/db/schema';
import { sql, desc, and, isNull, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get all available tags for the form
	const availableTags = db.select().from(tags).orderBy(tags.name).all();

	// Get payee history with aggregated data for predictive entry
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

	// Get workspace settings for tagsLocked
	const settings = db.select().from(workspaceSettings).limit(1).get();

	return {
		tags: availableTags,
		payeeHistory,
		tagsLocked: settings?.tagsLocked === 1
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
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
		const paymentMethod = formData.get('paymentMethod') as 'cash' | 'card' | 'check';
		const checkNumber =
			paymentMethod === 'check' ? ((formData.get('checkNumber') as string) || null) : null;

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
		if (!paymentMethod || !['cash', 'card', 'check'].includes(paymentMethod)) {
			return fail(400, { error: 'Invalid payment method' });
		}

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

		// Validate tag allocations sum to 100% if any tags are present
		if (tagAllocations.length > 0) {
			const totalPercentage = tagAllocations.reduce((sum, a) => sum + a.percentage, 0);
			if (totalPercentage !== 100) {
				return fail(400, { error: `Tag percentages must sum to 100% (currently ${totalPercentage}%)` });
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
				paymentMethod,
				checkNumber: checkNumber?.trim() || null
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

		// Redirect to the new transaction's detail page
		throw redirect(303, `/w/${params.workspace}/transactions/${publicId}`);
	},

	createTag: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();

		if (!name) {
			return fail(400, { error: 'Tag name is required' });
		}

		// Check for duplicate (case-insensitive)
		const existing = db
			.select()
			.from(tags)
			.where(sql`LOWER(${tags.name}) = LOWER(${name})`)
			.get();

		if (existing) {
			return fail(400, { error: 'Tag already exists', existingTag: existing });
		}

		const result = db.insert(tags).values({ name }).returning().get();

		return { success: true, tag: result };
	}
};
