import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';

/**
 * Get the database file path for a workspace
 */
function getDbPath(workspaceId: string): string {
	return join(DATA_DIR, 'workspaces', `${workspaceId}.db`);
}

/**
 * Safely backup a workspace database using VACUUM INTO.
 *
 * VACUUM INTO creates a transactionally-consistent backup without
 * blocking writers. This is safe to run on a live database.
 *
 * The backup file will be a compact copy with no WAL file or free pages.
 * This method is recommended for small-to-medium databases (< 1GB).
 *
 * @param workspaceId - The workspace to backup
 * @param backupPath - Full path for the backup file (must not exist)
 * @throws Error if workspace doesn't exist, backup path exists, or backup fails
 *
 * @example
 * ```ts
 * import { backupDatabase } from '$lib/server/db/backup';
 *
 * // Backup workspace to timestamped file
 * const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
 * backupDatabase('my-workspace', `/backups/my-workspace-${timestamp}.db`);
 * ```
 */
export function backupDatabase(workspaceId: string, backupPath: string): void {
	const dbPath = getDbPath(workspaceId);

	// Verify source database exists
	if (!existsSync(dbPath)) {
		throw new Error(`Workspace database not found: ${workspaceId}`);
	}

	// VACUUM INTO requires the target file to NOT exist
	if (existsSync(backupPath)) {
		throw new Error(`Backup path already exists: ${backupPath}`);
	}

	// Open a read-only connection for backup
	// This ensures we don't interfere with the application's WAL mode
	const db = new Database(dbPath, { readonly: true });

	try {
		// VACUUM INTO creates a new database file with all data compacted
		// It's transactionally consistent and safe to run on a live database
		db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
	} finally {
		db.close();
	}
}

/**
 * Backup a database using the better-sqlite3 backup API.
 * This provides progress reporting for large databases.
 *
 * The backup uses the SQLite Online Backup API, which copies pages
 * incrementally and can report progress. This is recommended for
 * large databases (> 1GB) where VACUUM INTO would be too slow.
 *
 * @param workspaceId - The workspace to backup
 * @param backupPath - Full path for the backup file
 * @param onProgress - Optional callback for progress updates (0-100)
 * @throws Error if workspace doesn't exist or backup fails
 *
 * @example
 * ```ts
 * import { backupDatabaseAsync } from '$lib/server/db/backup';
 *
 * await backupDatabaseAsync('my-workspace', '/backups/my-workspace.db', (percent) => {
 *   console.log(`Backup progress: ${percent}%`);
 * });
 * ```
 */
export async function backupDatabaseAsync(
	workspaceId: string,
	backupPath: string,
	onProgress?: (percent: number) => void
): Promise<void> {
	const dbPath = getDbPath(workspaceId);

	// Verify source database exists
	if (!existsSync(dbPath)) {
		throw new Error(`Workspace database not found: ${workspaceId}`);
	}

	// Open connection for backup
	const db = new Database(dbPath, { readonly: true });

	try {
		await db.backup(backupPath, {
			progress({ totalPages, remainingPages }) {
				if (onProgress && totalPages > 0) {
					const percent = ((totalPages - remainingPages) / totalPages) * 100;
					onProgress(Math.round(percent));
				}
				// Return number of pages to copy per iteration
				// Higher = faster but less responsive to progress updates
				return 200;
			}
		});
	} finally {
		db.close();
	}
}

/**
 * Verify a backup database is valid and readable.
 *
 * Opens the backup file and runs integrity_check to ensure
 * the backup was successful and the file is not corrupted.
 *
 * @param backupPath - Path to the backup file to verify
 * @returns true if backup is valid, throws on error
 * @throws Error if file doesn't exist or integrity check fails
 *
 * @example
 * ```ts
 * import { verifyBackup } from '$lib/server/db/backup';
 *
 * if (verifyBackup('/backups/my-workspace.db')) {
 *   console.log('Backup verified successfully');
 * }
 * ```
 */
export function verifyBackup(backupPath: string): boolean {
	if (!existsSync(backupPath)) {
		throw new Error(`Backup file not found: ${backupPath}`);
	}

	const db = new Database(backupPath, { readonly: true });

	try {
		// Run SQLite integrity check
		const result = db.pragma('integrity_check') as Array<{ integrity_check: string }>;

		if (result.length === 0 || result[0].integrity_check !== 'ok') {
			const errors = result.map((r) => r.integrity_check).join(', ');
			throw new Error(`Backup integrity check failed: ${errors}`);
		}

		return true;
	} finally {
		db.close();
	}
}
