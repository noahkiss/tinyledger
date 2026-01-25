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

	// Create transactions table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			public_id TEXT NOT NULL UNIQUE,
			type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
			amount_cents INTEGER NOT NULL,
			date TEXT NOT NULL,
			payee TEXT NOT NULL,
			description TEXT,
			payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'check')),
			check_number TEXT,
			voided_at TEXT,
			deleted_at TEXT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Create indexes for transactions table
	db.run(sql`CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date)`);
	db.run(sql`CREATE INDEX IF NOT EXISTS transactions_payee_idx ON transactions(payee)`);
	db.run(sql`CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type)`);

	// Create tags table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Create transaction_tags junction table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS transaction_tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
			tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
			percentage INTEGER NOT NULL
		)
	`);

	// Create indexes for transaction_tags table
	db.run(
		sql`CREATE INDEX IF NOT EXISTS transaction_tags_transaction_idx ON transaction_tags(transaction_id)`
	);
	db.run(sql`CREATE INDEX IF NOT EXISTS transaction_tags_tag_idx ON transaction_tags(tag_id)`);

	// Create transaction_history table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS transaction_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
			action TEXT NOT NULL CHECK(action IN ('created', 'updated', 'voided', 'unvoided', 'deleted')),
			previous_state TEXT,
			changed_fields TEXT,
			timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Enable foreign key enforcement
	db.run(sql`PRAGMA foreign_keys = ON`);
}
