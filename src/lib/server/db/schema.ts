import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

/**
 * Workspace settings table - singleton pattern (one row per workspace database)
 * Each workspace has its own SQLite database with this table.
 */
export const workspaceSettings = sqliteTable('workspace_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	type: text('type', { enum: ['sole_prop', 'volunteer_org'] }).notNull(),
	businessName: text('business_name'),
	address: text('address'),
	phone: text('phone'),
	responsibleParty: text('responsible_party'),
	foundedYear: integer('founded_year'),
	logoFilename: text('logo_filename'),
	tagsLocked: integer('tags_locked').default(0).notNull(), // SQLite boolean: 0 = false, 1 = true
	fiscalYearStartMonth: integer('fiscal_year_start_month').default(1).notNull(), // 1=January (calendar year), 7=July, etc.

	// Tax configuration (added in Phase 7)
	state: text('state').default('PA'), // Two-letter state code
	federalBracketRate: integer('federal_bracket_rate'), // Stored as percentage (e.g., 22 for 22%)
	stateRateOverride: integer('state_rate_override'), // Rate * 10000 (e.g., 307 for 3.07%), null = use default
	localEitRate: integer('local_eit_rate'), // Rate * 10000 (e.g., 100 for 1%)
	taxNotes: text('tax_notes'), // Free text for user reference
	taxConfigured: integer('tax_configured', { mode: 'boolean' }).default(false).notNull(), // Has user configured taxes?

	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Type exports for workspace settings
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSettings = typeof workspaceSettings.$inferInsert;

/**
 * Transactions table - core financial records
 * Amounts stored as integer cents to avoid floating-point errors
 */
export const transactions = sqliteTable(
	'transactions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		publicId: text('public_id').notNull().unique(), // UUID for URLs
		type: text('type', { enum: ['income', 'expense'] }).notNull(),
		amountCents: integer('amount_cents').notNull(), // Store as cents!
		date: text('date').notNull(), // ISO date string YYYY-MM-DD
		payee: text('payee').notNull(),
		description: text('description'),
		paymentMethod: text('payment_method', {
			enum: ['cash', 'card', 'check']
		}).notNull(),
		checkNumber: text('check_number'), // Only for payment_method = 'check'

		// Void/delete tracking
		voidedAt: text('voided_at'), // NULL = active, set = voided
		deletedAt: text('deleted_at'), // Soft delete timestamp

		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	(table) => [
		index('transactions_date_idx').on(table.date),
		index('transactions_payee_idx').on(table.payee),
		index('transactions_type_idx').on(table.type)
	]
);

// Type exports for transactions
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

/**
 * Tags table - categories for transactions
 */
export const tags = sqliteTable('tags', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Type exports for tags
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

/**
 * Transaction-Tags junction table with percentage allocation
 * Each tag allocation includes a percentage (1-100) that must sum to 100% per transaction
 */
export const transactionTags = sqliteTable(
	'transaction_tags',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		transactionId: integer('transaction_id')
			.notNull()
			.references(() => transactions.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'restrict' }),
		percentage: integer('percentage').notNull() // 1-100, must sum to 100 per transaction
	},
	(table) => [
		index('transaction_tags_transaction_idx').on(table.transactionId),
		index('transaction_tags_tag_idx').on(table.tagId)
	]
);

// Type exports for transaction tags
export type TransactionTag = typeof transactionTags.$inferSelect;
export type NewTransactionTag = typeof transactionTags.$inferInsert;

/**
 * Transaction history table - audit trail for all changes
 * Tracks created, updated, voided, unvoided, and deleted actions
 */
export const transactionHistory = sqliteTable('transaction_history', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	transactionId: integer('transaction_id')
		.notNull()
		.references(() => transactions.id, { onDelete: 'cascade' }),
	action: text('action', {
		enum: ['created', 'updated', 'voided', 'unvoided', 'deleted']
	}).notNull(),

	// Snapshot of transaction state before change (for updates)
	previousState: text('previous_state', { mode: 'json' }),

	// What changed (for updates)
	changedFields: text('changed_fields', { mode: 'json' }),

	timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Type exports for transaction history
export type TransactionHistory = typeof transactionHistory.$inferSelect;
export type NewTransactionHistory = typeof transactionHistory.$inferInsert;

// Drizzle relations for query builder
export const transactionsRelations = relations(transactions, ({ one, many }) => ({
	tagAllocations: many(transactionTags),
	history: many(transactionHistory),
	attachment: one(attachments)
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
	transaction: one(transactions, {
		fields: [transactionTags.transactionId],
		references: [transactions.id]
	}),
	tag: one(tags, {
		fields: [transactionTags.tagId],
		references: [tags.id]
	})
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	transactionTags: many(transactionTags)
}));

export const transactionHistoryRelations = relations(transactionHistory, ({ one }) => ({
	transaction: one(transactions, {
		fields: [transactionHistory.transactionId],
		references: [transactions.id]
	})
}));

/**
 * Attachments table - receipt images for transactions
 * One attachment per transaction (unique constraint on transactionId)
 */
export const attachments = sqliteTable(
	'attachments',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		transactionId: integer('transaction_id')
			.notNull()
			.unique()
			.references(() => transactions.id, { onDelete: 'cascade' }),
		filename: text('filename').notNull(), // Stored filename like "abc-123.jpg"
		originalName: text('original_name').notNull(), // User's original filename for display
		mimeType: text('mime_type').notNull(), // e.g., "image/jpeg"
		sizeBytes: integer('size_bytes').notNull(),
		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	(table) => [index('attachments_transaction_idx').on(table.transactionId)]
);

// Type exports for attachments
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

// Relations for attachments
export const attachmentsRelations = relations(attachments, ({ one }) => ({
	transaction: one(transactions, {
		fields: [attachments.transactionId],
		references: [transactions.id]
	})
}));

/**
 * Quarterly payments table - tracks estimated tax payments
 * One record per fiscal year per quarter
 */
export const quarterlyPayments = sqliteTable(
	'quarterly_payments',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		fiscalYear: integer('fiscal_year').notNull(),
		quarter: integer('quarter').notNull(), // 1-4
		federalPaidCents: integer('federal_paid_cents'), // null = unpaid
		statePaidCents: integer('state_paid_cents'), // null = unpaid
		paidAt: text('paid_at'), // ISO timestamp when marked paid
		notes: text('notes'),
		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	(table) => [
		// Unique constraint: one payment record per fiscal year per quarter
		index('quarterly_payments_year_quarter_idx').on(table.fiscalYear, table.quarter)
	]
);

// Type exports for quarterly payments
export type QuarterlyPayment = typeof quarterlyPayments.$inferSelect;
export type NewQuarterlyPayment = typeof quarterlyPayments.$inferInsert;

/**
 * Filings table - tracks compliance filing completion status
 * Covers both sole_prop (Schedule C, SE, 1040-ES, PA forms) and volunteer_org (990-N, BCO-10)
 */
export const filings = sqliteTable(
	'filings',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		fiscalYear: integer('fiscal_year').notNull(),
		formId: text('form_id').notNull(), // References filing definition ID (e.g., 'schedule-c', '1040-es-q1')
		filedAt: text('filed_at'), // ISO timestamp when marked complete (null = not filed)
		confirmationNumber: text('confirmation_number'), // Optional confirmation/receipt number
		notes: text('notes'), // User notes
		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	(table) => [
		// Index for looking up filings by fiscal year and form
		index('filings_year_form_idx').on(table.fiscalYear, table.formId)
	]
);

// Type exports for filings
export type Filing = typeof filings.$inferSelect;
export type NewFiling = typeof filings.$inferInsert;
