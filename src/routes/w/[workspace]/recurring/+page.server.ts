import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	tags,
	workspaceSettings,
	recurringTemplates,
	recurringTemplateTags,
	skippedInstances,
	transactions
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createRRule, getPatternDescription, type RecurringPattern } from '$lib/server/recurring/patterns';
import { getNextOccurrence } from '$lib/server/recurring/instances';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings
	const settings = db.select().from(workspaceSettings).get();
	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	// Get all recurring templates
	const templatesRaw = db.select().from(recurringTemplates).orderBy(recurringTemplates.payee).all();

	// Get tags for each template
	const templatesWithTags = templatesRaw.map((template) => {
		const tagAllocations = db
			.select({
				tagId: recurringTemplateTags.tagId,
				tagName: tags.name,
				percentage: recurringTemplateTags.percentage
			})
			.from(recurringTemplateTags)
			.innerJoin(tags, eq(recurringTemplateTags.tagId, tags.id))
			.where(eq(recurringTemplateTags.templateId, template.id))
			.all();

		// Get skipped dates for this template
		const skippedDates = new Set(
			db
				.select({ date: skippedInstances.date })
				.from(skippedInstances)
				.where(eq(skippedInstances.templateId, template.id))
				.all()
				.map((s) => s.date)
		);

		// Get confirmed dates (transactions with this template's ID)
		const confirmedDates = new Set(
			db
				.select({ date: transactions.date })
				.from(transactions)
				.where(eq(transactions.recurringTemplateId, template.id))
				.all()
				.map((t) => t.date)
		);

		// Get next occurrence
		const nextOccurrence = template.active
			? getNextOccurrence(template.rruleString, confirmedDates, skippedDates)
			: null;

		return {
			...template,
			tags: tagAllocations,
			nextOccurrence
		};
	});

	// Get all available tags for the form
	const availableTags = db.select().from(tags).orderBy(tags.name).all();

	return {
		templates: templatesWithTags,
		tags: availableTags,
		tagsLocked: settings.tagsLocked === 1
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
		const payee = formData.get('payee') as string;
		const description = (formData.get('description') as string) || null;
		const paymentMethod = (formData.get('paymentMethod') as 'cash' | 'card' | 'check') || 'card';
		const frequency = formData.get('frequency') as string;
		const interval = parseInt(formData.get('interval') as string) || 1;
		const customUnit = formData.get('customUnit') as 'day' | 'week' | 'month' | null;
		const startDate = formData.get('startDate') as string;
		const hasEndDate = formData.get('hasEndDate') === 'on';
		const endDate = hasEndDate ? (formData.get('endDate') as string) : null;

		// Validate required fields
		if (!type || !['income', 'expense'].includes(type)) {
			return fail(400, { error: 'Invalid transaction type' });
		}
		if (!amountCents || amountCents <= 0) {
			return fail(400, { error: 'Amount must be greater than 0' });
		}
		if (!payee || !payee.trim()) {
			return fail(400, { error: 'Payee is required' });
		}
		if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
			return fail(400, { error: 'Invalid start date format' });
		}
		if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
			return fail(400, { error: 'Invalid end date format' });
		}
		if (endDate && endDate < startDate) {
			return fail(400, { error: 'End date must be after start date' });
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
				return fail(400, {
					error: `Tag percentages must sum to 100% (currently ${totalPercentage}%)`
				});
			}
		}

		// Build pattern object
		const pattern: RecurringPattern = {
			frequency: frequency as RecurringPattern['frequency'],
			interval: frequency === 'custom' ? interval : undefined,
			customUnit: frequency === 'custom' ? customUnit || 'month' : undefined
		};

		// Create RRule and get description
		const rrule = createRRule(pattern, startDate, endDate || undefined);
		const patternDescription = getPatternDescription(pattern);

		// Generate public ID
		const publicId = crypto.randomUUID();

		// Insert template
		const result = db
			.insert(recurringTemplates)
			.values({
				publicId,
				type,
				amountCents,
				payee: payee.trim(),
				description: description?.trim() || null,
				paymentMethod,
				rruleString: rrule.toString(),
				patternDescription,
				startDate,
				endDate
			})
			.run();

		const templateId = Number(result.lastInsertRowid);

		// Insert tag allocations
		for (const allocation of tagAllocations) {
			db.insert(recurringTemplateTags)
				.values({
					templateId,
					tagId: allocation.tagId,
					percentage: allocation.percentage
				})
				.run();
		}

		return { success: true };
	},

	update: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const templateId = parseInt(formData.get('templateId') as string);

		if (!templateId) {
			return fail(400, { error: 'Template ID required' });
		}

		// Get existing template
		const existing = db
			.select()
			.from(recurringTemplates)
			.where(eq(recurringTemplates.id, templateId))
			.get();

		if (!existing) {
			return fail(404, { error: 'Template not found' });
		}

		// Parse form data
		const type = formData.get('type') as 'income' | 'expense';
		const amountCents = parseInt(formData.get('amount_cents') as string) || 0;
		const payee = formData.get('payee') as string;
		const description = (formData.get('description') as string) || null;
		const paymentMethod = (formData.get('paymentMethod') as 'cash' | 'card' | 'check') || 'card';
		const frequency = formData.get('frequency') as string;
		const interval = parseInt(formData.get('interval') as string) || 1;
		const customUnit = formData.get('customUnit') as 'day' | 'week' | 'month' | null;
		const startDate = formData.get('startDate') as string;
		const hasEndDate = formData.get('hasEndDate') === 'on';
		const endDate = hasEndDate ? (formData.get('endDate') as string) : null;

		// Validate
		if (!type || !['income', 'expense'].includes(type)) {
			return fail(400, { error: 'Invalid transaction type' });
		}
		if (!amountCents || amountCents <= 0) {
			return fail(400, { error: 'Amount must be greater than 0' });
		}
		if (!payee || !payee.trim()) {
			return fail(400, { error: 'Payee is required' });
		}
		if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
			return fail(400, { error: 'Invalid start date format' });
		}

		// Parse tag allocations
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

		if (tagAllocations.length > 0) {
			const totalPercentage = tagAllocations.reduce((sum, a) => sum + a.percentage, 0);
			if (totalPercentage !== 100) {
				return fail(400, {
					error: `Tag percentages must sum to 100% (currently ${totalPercentage}%)`
				});
			}
		}

		// Build pattern and rrule
		const pattern: RecurringPattern = {
			frequency: frequency as RecurringPattern['frequency'],
			interval: frequency === 'custom' ? interval : undefined,
			customUnit: frequency === 'custom' ? customUnit || 'month' : undefined
		};

		const rrule = createRRule(pattern, startDate, endDate || undefined);
		const patternDescription = getPatternDescription(pattern);

		// Update template
		db.update(recurringTemplates)
			.set({
				type,
				amountCents,
				payee: payee.trim(),
				description: description?.trim() || null,
				paymentMethod,
				rruleString: rrule.toString(),
				patternDescription,
				startDate,
				endDate,
				updatedAt: new Date().toISOString()
			})
			.where(eq(recurringTemplates.id, templateId))
			.run();

		// Delete existing tag allocations and insert new ones
		db.delete(recurringTemplateTags)
			.where(eq(recurringTemplateTags.templateId, templateId))
			.run();

		for (const allocation of tagAllocations) {
			db.insert(recurringTemplateTags)
				.values({
					templateId,
					tagId: allocation.tagId,
					percentage: allocation.percentage
				})
				.run();
		}

		return { success: true };
	},

	deactivate: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const templateId = parseInt(formData.get('templateId') as string);

		if (!templateId) {
			return fail(400, { error: 'Template ID required' });
		}

		db.update(recurringTemplates)
			.set({
				active: false,
				updatedAt: new Date().toISOString()
			})
			.where(eq(recurringTemplates.id, templateId))
			.run();

		return { success: true };
	},

	activate: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const templateId = parseInt(formData.get('templateId') as string);

		if (!templateId) {
			return fail(400, { error: 'Template ID required' });
		}

		db.update(recurringTemplates)
			.set({
				active: true,
				updatedAt: new Date().toISOString()
			})
			.where(eq(recurringTemplates.id, templateId))
			.run();

		return { success: true };
	},

	delete: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const templateId = parseInt(formData.get('templateId') as string);

		if (!templateId) {
			return fail(400, { error: 'Template ID required' });
		}

		// Check if any transactions reference this template
		const hasTransactions = db
			.select({ count: sql<number>`count(*)` })
			.from(transactions)
			.where(eq(transactions.recurringTemplateId, templateId))
			.get();

		if (hasTransactions && hasTransactions.count > 0) {
			return fail(400, {
				error:
					'Cannot delete template with confirmed transactions. Deactivate it instead to stop future occurrences.'
			});
		}

		// Delete template (cascade will delete tags and skipped instances)
		db.delete(recurringTemplates).where(eq(recurringTemplates.id, templateId)).run();

		return { success: true };
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
