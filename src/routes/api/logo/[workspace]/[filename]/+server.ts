import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getLogoBuffer } from '$lib/server/storage/logo';

export const GET: RequestHandler = async ({ params }) => {
	const { workspace, filename } = params;

	const buffer = getLogoBuffer(workspace, filename);

	if (!buffer) {
		throw error(404, 'Logo not found');
	}

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};
