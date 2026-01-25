import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { tags, transactions, transactionTags, transactionHistory } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get all available tags for the form
	const availableTags = db.select().from(tags).orderBy(tags.name).all();

	return {
		tags: availableTags
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
	}
};
