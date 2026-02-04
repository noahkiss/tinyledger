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

	// Migration: Add tags_locked column to workspace_settings
	// Wrapped in try/catch as column may already exist
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN tags_locked INTEGER DEFAULT 0 NOT NULL`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add fiscal_year_start_month column to workspace_settings
	// Default 1 = January (calendar year)
	try {
		db.run(
			sql`ALTER TABLE workspace_settings ADD COLUMN fiscal_year_start_month INTEGER DEFAULT 1 NOT NULL`
		);
	} catch {
		// Column already exists, ignore
	}

	// Phase 7 Migrations: Tax configuration columns

	// Migration: Add state column to workspace_settings
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN state TEXT DEFAULT 'PA'`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add federal_bracket_rate column to workspace_settings
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN federal_bracket_rate INTEGER`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add state_rate_override column to workspace_settings
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN state_rate_override INTEGER`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add local_eit_rate column to workspace_settings
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN local_eit_rate INTEGER`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add tax_notes column to workspace_settings
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN tax_notes TEXT`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add tax_configured column to workspace_settings
	try {
		db.run(
			sql`ALTER TABLE workspace_settings ADD COLUMN tax_configured INTEGER DEFAULT 0 NOT NULL`
		);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Create quarterly_payments table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS quarterly_payments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			fiscal_year INTEGER NOT NULL,
			quarter INTEGER NOT NULL,
			federal_paid_cents INTEGER,
			state_paid_cents INTEGER,
			paid_at TEXT,
			notes TEXT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Create index for quarterly_payments lookup
	db.run(
		sql`CREATE INDEX IF NOT EXISTS quarterly_payments_year_quarter_idx ON quarterly_payments(fiscal_year, quarter)`
	);

	// Migration: Create attachments table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS attachments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
			filename TEXT NOT NULL,
			original_filename TEXT NOT NULL,
			mime_type TEXT NOT NULL,
			size_bytes INTEGER NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Create index for attachments lookup
	db.run(sql`CREATE INDEX IF NOT EXISTS attachments_transaction_idx ON attachments(transaction_id)`);

	// Migration: Create filings table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS filings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			fiscal_year INTEGER NOT NULL,
			form_id TEXT NOT NULL,
			filed_at TEXT,
			confirmation_number TEXT,
			notes TEXT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Create index for filings lookup
	db.run(sql`CREATE INDEX IF NOT EXISTS filings_year_form_idx ON filings(fiscal_year, form_id)`);

	// Migration: Add ein column to workspace_settings (for tax report letterhead)
	try {
		db.run(sql`ALTER TABLE workspace_settings ADD COLUMN ein TEXT`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Create recurring_templates table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS recurring_templates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			public_id TEXT NOT NULL UNIQUE,
			type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
			amount_cents INTEGER NOT NULL,
			payee TEXT NOT NULL,
			description TEXT,
			payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'check')),
			rrule_string TEXT NOT NULL,
			pattern_description TEXT NOT NULL,
			start_date TEXT NOT NULL,
			end_date TEXT,
			active INTEGER DEFAULT 1 NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Migration: Create recurring_template_tags junction table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS recurring_template_tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			template_id INTEGER NOT NULL REFERENCES recurring_templates(id) ON DELETE CASCADE,
			tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
			percentage INTEGER NOT NULL
		)
	`);

	// Create indexes for recurring_template_tags
	db.run(
		sql`CREATE INDEX IF NOT EXISTS recurring_template_tags_template_idx ON recurring_template_tags(template_id)`
	);
	db.run(
		sql`CREATE INDEX IF NOT EXISTS recurring_template_tags_tag_idx ON recurring_template_tags(tag_id)`
	);

	// Migration: Create skipped_instances table
	db.run(sql`
		CREATE TABLE IF NOT EXISTS skipped_instances (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			template_id INTEGER NOT NULL REFERENCES recurring_templates(id) ON DELETE CASCADE,
			date TEXT NOT NULL,
			skipped_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
		)
	`);

	// Create index for skipped_instances
	db.run(
		sql`CREATE INDEX IF NOT EXISTS skipped_instances_template_date_idx ON skipped_instances(template_id, date)`
	);

	// Migration: Add recurring_template_id column to transactions
	try {
		db.run(sql`ALTER TABLE transactions ADD COLUMN recurring_template_id INTEGER`);
	} catch {
		// Column already exists, ignore
	}

	// Migration: Add skipped_at column to quarterly_payments (for skipped/missed quarters)
	try {
		db.run(sql`ALTER TABLE quarterly_payments ADD COLUMN skipped_at TEXT`);
	} catch {
		// Column already exists, ignore
	}
}
