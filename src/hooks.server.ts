import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getWorkspaceDb, workspaceExists, createWorkspace } from '$lib/server/workspace';
import { seedDemoData } from '$lib/server/db/seed-demo';

// Seed demo data lazily on first request (dynamic import avoids build-time errors)
let demoSeeded = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!demoSeeded) {
		demoSeeded = true;
		const { env } = await import('$env/dynamic/private');
		if (env.SEED_DEMO_DATA === 'true') {
			if (!workspaceExists('demo')) {
				console.log('[seed] Creating demo workspace...');
				createWorkspace('demo', 'Demo Workspace', 'sole_prop');
			}
			const db = getWorkspaceDb('demo');
			seedDemoData(db);
			console.log('[seed] Demo data ready');
		}
	}

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
