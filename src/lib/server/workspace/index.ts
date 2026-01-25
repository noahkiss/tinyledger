import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from '$lib/server/db/schema';
import { initializeSchema } from '$lib/server/db/migrate';
import { addWorkspace as addToRegistry } from './registry';

const DATA_DIR = process.env.DATA_DIR ?? './data';

// Connection cache to avoid repeated file opens
const connectionCache = new Map<string, BetterSQLite3Database<typeof schema>>();

/**
 * Get the database directory path for workspaces
 */
function getWorkspacesDir(): string {
	return join(DATA_DIR, 'workspaces');
}

/**
 * Get the database file path for a workspace
 */
function getDbPath(workspaceId: string): string {
	return join(getWorkspacesDir(), `${workspaceId}.db`);
}

/**
 * Get or create a workspace-scoped Drizzle database connection.
 * Connections are cached to avoid repeated file opens.
 * WAL mode and busy_timeout are enabled for all connections.
 */
export function getWorkspaceDb(workspaceId: string): BetterSQLite3Database<typeof schema> {
	// Return cached connection if exists
	if (connectionCache.has(workspaceId)) {
		return connectionCache.get(workspaceId)!;
	}

	// Ensure workspaces directory exists
	const workspacesDir = getWorkspacesDir();
	if (!existsSync(workspacesDir)) {
		mkdirSync(workspacesDir, { recursive: true });
	}

	// Create new connection
	const dbPath = getDbPath(workspaceId);
	const sqlite = new Database(dbPath);

	// Enable WAL mode for better concurrency (CRITICAL for performance)
	sqlite.pragma('journal_mode = WAL');

	// Set busy timeout for concurrent access (5 seconds)
	sqlite.pragma('busy_timeout = 5000');

	// Wrap with Drizzle ORM
	const db = drizzle(sqlite, { schema });

	// Initialize schema if new database
	initializeSchema(db);

	// Cache and return
	connectionCache.set(workspaceId, db);
	return db;
}

/**
 * Check if a workspace database file exists
 */
export function workspaceExists(workspaceId: string): boolean {
	const dbPath = getDbPath(workspaceId);
	return existsSync(dbPath);
}

/**
 * Create a new workspace with initial settings
 */
export function createWorkspace(
	workspaceId: string,
	name: string,
	type: 'sole_prop' | 'volunteer_org'
): void {
	// Create database via getWorkspaceDb (handles WAL, schema init)
	const db = getWorkspaceDb(workspaceId);

	// Update the default settings row with provided name and type
	db.update(schema.workspaceSettings)
		.set({
			name,
			type,
			updatedAt: new Date().toISOString()
		})
		.run();

	// Add to registry
	addToRegistry(workspaceId, name);
}

/**
 * Close all cached database connections (for graceful shutdown)
 */
export function closeAllConnections(): void {
	// Note: better-sqlite3 connections are automatically closed on process exit,
	// but this can be called for explicit cleanup if needed
	connectionCache.clear();
}
