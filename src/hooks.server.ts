import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getWorkspaceDb, workspaceExists } from '$lib/server/workspace';

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
