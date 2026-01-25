import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import type * as schema from './schema';

/**
 * Initialize workspace database schema.
 * Creates tables if they don't exist and inserts default settings row.
 */
export function initializeSchema(db: BetterSQLite3Database<typeof schema>): void {
	// Create workspace_settings table if it doesn't exist
	db.run(sql`
		CREATE TABLE IF NOT EXISTS workspace_settings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('sole_prop', 'volunteer_org')),
			business_name TEXT,
			address TEXT,
			phone TEXT,
			responsible_party TEXT,
			founded_year INTEGER,
			logo_filename TEXT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Insert default settings row if table is empty (singleton pattern)
	const result = db.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM workspace_settings`);
	if (result && result.count === 0) {
		db.run(sql`
			INSERT INTO workspace_settings (name, type)
			VALUES ('New Workspace', 'sole_prop')
		`);
	}
}
