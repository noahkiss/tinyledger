import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { workspaceSettings } from '$lib/server/db/schema';
import { listWorkspaces } from '$lib/server/workspace/registry';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	// Access db from hooks.server.ts injection
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings (singleton row)
	const settings = db.select().from(workspaceSettings).get();

	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	// Get all workspaces for the switcher
	const allWorkspaces = listWorkspaces();

	return {
		workspaceId: params.workspace,
		settings,
		allWorkspaces
	};
};
