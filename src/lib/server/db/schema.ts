import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// Type exports for use in application
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSettings = typeof workspaceSettings.$inferInsert;
