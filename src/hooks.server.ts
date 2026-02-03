import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getWorkspaceDb, workspaceExists, createWorkspace } from '$lib/server/workspace';
import { seedDemoData } from '$lib/server/db/seed-demo';

// Initialize demo workspace on startup if SEED_DEMO_DATA is set
if (process.env.SEED_DEMO_DATA === 'true') {
	if (!workspaceExists('demo')) {
		console.log('[seed] Creating demo workspace...');
		createWorkspace('demo', 'Demo Workspace', 'sole_prop');
	}
	// Seed demo transactions
	const db = getWorkspaceDb('demo');
	seedDemoData(db);
	console.log('[seed] Demo data ready');
}

export const handle: Handle = async ({ event, resolve }) => {
	// Match /w/[workspace]/ routes
	const workspaceMatch = event.url.pathname.match(/^\/w\/([^/]+)/);

	if (workspaceMatch) {
		const workspaceId = workspaceMatch[1];

		// Validate workspace exists
		if (!workspaceExists(workspaceId)) {
			throw error(404, 'Workspace not found');
		}

		// Inject workspace context into locals
		event.locals.workspaceId = workspaceId;
		event.locals.db = getWorkspaceDb(workspaceId);
	}

	return resolve(event);
};
