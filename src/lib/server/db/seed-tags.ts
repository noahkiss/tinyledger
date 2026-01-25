import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tags } from './schema';
import { SCHEDULE_C_CATEGORIES } from '$lib/data/schedulec-categories';
import type * as schema from './schema';

/**
 * Seed Schedule C categories into a new workspace database.
 * Only seeds if the tags table is empty (new workspace).
 */
export function seedScheduleCTags(db: BetterSQLite3Database<typeof schema>): void {
	const existingTags = db.select().from(tags).all();

	// Only seed if no tags exist (new workspace)
	if (existingTags.length === 0) {
		for (const category of SCHEDULE_C_CATEGORIES) {
			db.insert(tags).values({ name: category }).run();
		}
	}
}
