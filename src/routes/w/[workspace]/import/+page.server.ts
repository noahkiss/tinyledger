import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { tags, transactions, transactionTags, transactionHistory } from '$lib/server/db/schema';
import { sql, eq } from 'drizzle-orm';
import {
	parseCSVPreview,
	validateCSVWithMapping,
	type ColumnMapping,
	type CSVPreviewResult,
	type ValidationResult
} from '$lib/server/import/csv-parser';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get all existing tags for mapping unknown tags
	const existingTags = db.select().from(tags).orderBy(tags.name).all();

	return {
		tags: existingTags.map((t) => t.name)
	};
};

export const actions: Actions = {
	preview: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file || file.size === 0) {
			return fail(400, { error: 'Please select a CSV file to upload' });
		}

		if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
			return fail(400, { error: 'Please upload a CSV file' });
		}

		// Limit file size to 5MB
		if (file.size > 5 * 1024 * 1024) {
			return fail(400, { error: 'File too large. Maximum size is 5MB.' });
		}

		try {
			const csvText = await file.text();
			const preview = parseCSVPreview(csvText);

			if (preview.headers.length === 0) {
				return fail(400, { error: 'CSV file appears to be empty or has no headers' });
			}

			return {
				success: true,
				preview,
				csvText // Return CSV text for client to hold for later import
			};
		} catch (e) {
			return fail(400, { error: 'Failed to parse CSV file' });
		}
	},

	validate: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const csvText = formData.get('csvText') as string;
		const mappingJson = formData.get('mapping') as string;

		if (!csvText) {
			return fail(400, { error: 'No CSV data provided' });
		}

		if (!mappingJson) {
			return fail(400, { error: 'No column mapping provided' });
		}

		try {
			const mapping: ColumnMapping = JSON.parse(mappingJson);

			// Get existing tags
			const existingTags = db
				.select()
				.from(tags)
				.all()
				.map((t) => t.name);

			// Validate the CSV with mapping
			const result = validateCSVWithMapping(csvText, mapping, existingTags);

			return {
				success: true,
				validation: result
			};
		} catch (e) {
			return fail(400, { error: 'Failed to validate CSV' });
		}
	},

	import: async ({ locals, request }) => {
		const db = locals.db;

		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();
		const csvText = formData.get('csvText') as string;
		const mappingJson = formData.get('mapping') as string;
		const createTagsJson = formData.get('createTags') as string;
		const tagMappingsJson = formData.get('tagMappings') as string;

		if (!csvText || !mappingJson) {
			return fail(400, { error: 'Missing required data' });
		}

		try {
			const mapping: ColumnMapping = JSON.parse(mappingJson);
			const createTagsList: string[] = JSON.parse(createTagsJson || '[]');
			const tagMappings: Record<string, string> = JSON.parse(tagMappingsJson || '{}');

			// Create new tags first
			const tagNameToId = new Map<string, number>();

			// Get existing tags and map names to IDs
			const existingTags = db.select().from(tags).all();
			for (const tag of existingTags) {
				tagNameToId.set(tag.name.toLowerCase(), tag.id);
			}

			// Create new tags
			for (const tagName of createTagsList) {
				// Check if already exists (case insensitive)
				const existing = db
					.select()
					.from(tags)
					.where(sql`LOWER(${tags.name}) = LOWER(${tagName})`)
					.get();

				if (!existing) {
					const result = db.insert(tags).values({ name: tagName }).returning().get();
					tagNameToId.set(tagName.toLowerCase(), result.id);
				} else {
					tagNameToId.set(tagName.toLowerCase(), existing.id);
				}
			}

			// Apply tag mappings (unknown -> existing)
			for (const [unknown, existing] of Object.entries(tagMappings)) {
				const existingId = tagNameToId.get(existing.toLowerCase());
				if (existingId) {
					tagNameToId.set(unknown.toLowerCase(), existingId);
				}
			}

			// Validate CSV
			const validation = validateCSVWithMapping(
				csvText,
				mapping,
				Array.from(tagNameToId.keys())
			);

			let imported = 0;
			const skippedRows: Array<{ rowNumber: number; errors: string[] }> = [];

			// Import valid transactions
			for (const tx of validation.valid) {
				const publicId = crypto.randomUUID();

				// Insert transaction
				const result = db
					.insert(transactions)
					.values({
						publicId,
						type: tx.type,
						amountCents: tx.amountCents,
						date: tx.date,
						payee: tx.payee,
						description: tx.description || null,
						paymentMethod: tx.paymentMethod,
						checkNumber: tx.checkNumber || null
					})
					.run();

				const transactionId = Number(result.lastInsertRowid);

				// Insert tag allocations
				if (tx.tags.length > 0) {
					// Calculate equal allocation percentages
					const basePercentage = Math.floor(100 / tx.tags.length);
					const remainder = 100 - basePercentage * tx.tags.length;

					for (let i = 0; i < tx.tags.length; i++) {
						const tagId = tagNameToId.get(tx.tags[i].toLowerCase());
						if (tagId) {
							// Give first tag the remainder to ensure 100% total
							const percentage = basePercentage + (i === 0 ? remainder : 0);
							db.insert(transactionTags)
								.values({
									transactionId,
									tagId,
									percentage
								})
								.run();
						}
					}
				}

				// Insert history record
				db.insert(transactionHistory)
					.values({
						transactionId,
						action: 'created'
					})
					.run();

				imported++;
			}

			// Collect skipped rows
			skippedRows.push(...validation.invalid);

			return {
				success: true,
				imported,
				skipped: skippedRows.length,
				skippedRows
			};
		} catch (e) {
			console.error('Import error:', e);
			return fail(500, { error: 'Failed to import transactions' });
		}
	}
};
