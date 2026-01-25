import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { workspaceSettings } from '$lib/server/db/schema';
import { processLogoUpload } from '$lib/server/storage/logo';
import { updateWorkspaceName } from '$lib/server/workspace/registry';

export const load: PageServerLoad = async ({ parent }) => {
	// Get settings from parent layout
	const { settings } = await parent();
	return { settings };
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const db = locals.db;
		if (!db) {
			return fail(500, { error: 'Database not initialized' });
		}

		const formData = await request.formData();

		// Extract form fields
		const name = formData.get('name')?.toString().trim();
		const type = formData.get('type')?.toString() as 'sole_prop' | 'volunteer_org';
		const businessName = formData.get('businessName')?.toString().trim() || null;
		const address = formData.get('address')?.toString().trim() || null;
		const phone = formData.get('phone')?.toString().trim() || null;
		const responsibleParty = formData.get('responsibleParty')?.toString().trim() || null;
		const foundedYearStr = formData.get('foundedYear')?.toString().trim();
		const foundedYear = foundedYearStr ? parseInt(foundedYearStr, 10) : null;
		const logoFile = formData.get('logo') as File | null;

		// Validation
		if (!name || name.length < 1) {
			return fail(400, { error: 'Workspace name is required' });
		}

		if (!type || !['sole_prop', 'volunteer_org'].includes(type)) {
			return fail(400, { error: 'Invalid workspace type' });
		}

		if (foundedYear !== null && (foundedYear < 1800 || foundedYear > new Date().getFullYear())) {
			return fail(400, { error: 'Invalid founded year' });
		}

		// Process logo upload if provided
		let logoFilename: string | null = null;
		if (logoFile && logoFile.size > 0) {
			// Validate file type
			if (!logoFile.type.startsWith('image/')) {
				return fail(400, { error: 'Logo must be an image file' });
			}

			// Validate file size (max 5MB)
			if (logoFile.size > 5 * 1024 * 1024) {
				return fail(400, { error: 'Logo file too large (max 5MB)' });
			}

			try {
				logoFilename = await processLogoUpload(params.workspace, logoFile);
			} catch (e) {
				console.error('Logo processing error:', e);
				return fail(500, { error: 'Failed to process logo image' });
			}
		}

		// Build update object
		const updateData: Record<string, unknown> = {
			name,
			type,
			businessName,
			address,
			phone,
			responsibleParty,
			foundedYear,
			updatedAt: new Date().toISOString()
		};

		// Only update logo if a new one was uploaded
		if (logoFilename) {
			updateData.logoFilename = logoFilename;
		}

		// Update workspace settings in database
		db.update(workspaceSettings).set(updateData).run();

		// Update workspace name in registry (for workspace list)
		updateWorkspaceName(params.workspace, name);

		return { success: true };
	}
};
