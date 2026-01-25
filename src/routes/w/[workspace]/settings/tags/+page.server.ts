import type { PageServerLoad, Actions } from './$types';
import { tags, transactionTags, workspaceSettings } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db!;

	// Get all tags with usage count
	const allTags = db
		.select({
			id: tags.id,
			name: tags.name,
			createdAt: tags.createdAt,
			usageCount: sql<number>`(SELECT COUNT(*) FROM transaction_tags WHERE tag_id = ${tags.id})`
		})
		.from(tags)
		.orderBy(tags.name)
		.all();

	// Get workspace settings for tagsLocked status
	const settings = db.select().from(workspaceSettings).get();

	return {
		tags: allTags,
		tagsLocked: settings?.tagsLocked === 1
	};
};

export const actions: Actions = {
	rename: async ({ locals, request }) => {
		const db = locals.db!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);
		const newName = (formData.get('newName') as string)?.trim();

		if (!newName) {
			return fail(400, { error: 'Tag name is required' });
		}

		// Check for duplicate name (case-insensitive)
		const existing = db
			.select()
			.from(tags)
			.where(sql`LOWER(${tags.name}) = LOWER(${newName})`)
			.get();

		if (existing && existing.id !== id) {
			return fail(400, { error: 'A tag with this name already exists' });
		}

		db.update(tags).set({ name: newName }).where(eq(tags.id, id)).run();

		return { success: true, renamed: true };
	},

	merge: async ({ locals, request }) => {
		const db = locals.db!;
		const formData = await request.formData();
		const sourceId = parseInt(formData.get('sourceId') as string);
		const targetId = parseInt(formData.get('targetId') as string);

		if (sourceId === targetId) {
			return fail(400, { error: 'Cannot merge tag into itself' });
		}

		// Verify both tags exist
		const source = db.select().from(tags).where(eq(tags.id, sourceId)).get();
		const target = db.select().from(tags).where(eq(tags.id, targetId)).get();

		if (!source || !target) {
			return fail(404, { error: 'Tag not found' });
		}

		// Step 1: Find transactions that have BOTH source and target tags
		// These need special handling to combine percentages
		const transactionsWithBoth = db
			.select({
				transactionId: transactionTags.transactionId
			})
			.from(transactionTags)
			.where(eq(transactionTags.tagId, sourceId))
			.all()
			.map((r) => r.transactionId);

		// For each transaction that has both source AND target, combine percentages
		for (const txId of transactionsWithBoth) {
			const targetAlloc = db
				.select()
				.from(transactionTags)
				.where(sql`${transactionTags.transactionId} = ${txId} AND ${transactionTags.tagId} = ${targetId}`)
				.get();

			const sourceAlloc = db
				.select()
				.from(transactionTags)
				.where(sql`${transactionTags.transactionId} = ${txId} AND ${transactionTags.tagId} = ${sourceId}`)
				.get();

			if (targetAlloc && sourceAlloc) {
				// Both exist: sum percentages on target, delete source
				const newPercentage = targetAlloc.percentage + sourceAlloc.percentage;
				db.update(transactionTags)
					.set({ percentage: newPercentage })
					.where(eq(transactionTags.id, targetAlloc.id))
					.run();

				db.delete(transactionTags).where(eq(transactionTags.id, sourceAlloc.id)).run();
			}
		}

		// Step 2: Update remaining transaction_tags from source to target
		db.update(transactionTags).set({ tagId: targetId }).where(eq(transactionTags.tagId, sourceId)).run();

		// Step 3: Delete the source tag
		db.delete(tags).where(eq(tags.id, sourceId)).run();

		return { success: true, merged: { from: source.name, to: target.name } };
	},

	delete: async ({ locals, request }) => {
		const db = locals.db!;
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);

		// Check if tag is in use
		const usageCount = db
			.select({ count: sql<number>`count(*)` })
			.from(transactionTags)
			.where(eq(transactionTags.tagId, id))
			.get();

		if (usageCount && usageCount.count > 0) {
			return fail(400, {
				error: `Cannot delete tag: used in ${usageCount.count} transaction(s). Merge it instead.`
			});
		}

		db.delete(tags).where(eq(tags.id, id)).run();

		return { success: true, deleted: true };
	},

	toggleLock: async ({ locals }) => {
		const db = locals.db!;

		// Get current lock state
		const settings = db.select().from(workspaceSettings).get();
		const newLockState = settings?.tagsLocked === 1 ? 0 : 1;

		db.update(workspaceSettings)
			.set({
				tagsLocked: newLockState,
				updatedAt: new Date().toISOString()
			})
			.run();

		return { success: true, locked: newLockState === 1 };
	}
};
