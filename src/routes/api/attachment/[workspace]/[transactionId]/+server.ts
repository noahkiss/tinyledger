import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getAttachment } from '$lib/server/storage/attachment';

export const GET: RequestHandler = async ({ params, url }) => {
	const { workspace, transactionId } = params;

	const attachment = getAttachment(workspace, transactionId);

	if (!attachment) {
		throw error(404, 'Attachment not found');
	}

	const headers: Record<string, string> = {
		'Content-Type': attachment.mimeType,
		'Cache-Control': 'private, max-age=3600' // Shorter than logo - attachments may be replaced
	};

	// Check for download mode
	const download = url.searchParams.get('download') === 'true';
	const exportName = url.searchParams.get('exportName');

	if (download) {
		// Use exportName if provided, otherwise use stored filename
		const filename = exportName || attachment.filename;
		headers['Content-Disposition'] = `attachment; filename="${filename}"`;
	}

	return new Response(new Uint8Array(attachment.buffer), { headers });
};
