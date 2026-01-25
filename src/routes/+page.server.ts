import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { listWorkspaces } from '$lib/server/workspace/registry';
import { createWorkspace } from '$lib/server/workspace';

export const load: PageServerLoad = async () => {
	const workspaces = listWorkspaces();

	return {
		workspaces
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const type = formData.get('type')?.toString() as 'sole_prop' | 'volunteer_org';

		// Validation
		if (!name || name.length < 1) {
			return fail(400, { error: 'Name is required', name, type });
		}

		if (!type || !['sole_prop', 'volunteer_org'].includes(type)) {
			return fail(400, { error: 'Invalid workspace type', name, type });
		}

		// Generate workspace ID (URL-safe, lowercase)
		const workspaceId = generateWorkspaceId(name);

		// Create the workspace (handles both database creation and registry update)
		createWorkspace(workspaceId, name, type);

		// Redirect to settings page for completing setup
		throw redirect(303, `/w/${workspaceId}/settings`);
	}
};

/**
 * Generate a URL-safe workspace ID from name
 * Format: name-slug-xxxxx (random suffix for uniqueness)
 */
function generateWorkspaceId(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.substring(0, 20);

	const suffix = Math.random().toString(36).substring(2, 7);

	return `${slug}-${suffix}`;
}
