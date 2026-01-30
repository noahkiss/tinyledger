import sharp from 'sharp';
import {
	writeFileSync,
	existsSync,
	mkdirSync,
	unlinkSync,
	readdirSync,
	readFileSync
} from 'node:fs';
import { join, extname } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Get the attachments directory for a workspace
 */
function getAttachmentsDir(workspaceId: string): string {
	return join(DATA_DIR, 'attachments', workspaceId);
}

/**
 * Get the attachment file path
 */
function getAttachmentPath(workspaceId: string, transactionPublicId: string, ext: string): string {
	return join(getAttachmentsDir(workspaceId), `${transactionPublicId}${ext}`);
}

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromExt(ext: string): string {
	const mimeTypes: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.webp': 'image/webp',
		'.gif': 'image/gif'
	};
	return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Process and save an attachment for a transaction.
 * - Validates MIME type and size
 * - Re-encodes through Sharp for security
 * - GIF preserved as GIF (animated support), everything else converted to JPEG
 * - Deletes any existing attachment for this transaction first
 *
 * @returns The filename, mimeType, and sizeBytes of the saved attachment
 */
export async function saveAttachment(
	workspaceId: string,
	transactionPublicId: string,
	file: File
): Promise<{ filename: string; mimeType: string; sizeBytes: number }> {
	// Validate MIME type
	if (!ALLOWED_TYPES.includes(file.type)) {
		throw new Error(
			`Invalid file type: ${file.type}. Allowed types: ${ALLOWED_TYPES.join(', ')}`
		);
	}

	// Validate size
	if (file.size > MAX_SIZE_BYTES) {
		throw new Error(
			`File too large: ${file.size} bytes. Maximum size: ${MAX_SIZE_BYTES} bytes (10MB)`
		);
	}

	// Ensure attachments directory exists
	const attachmentsDir = getAttachmentsDir(workspaceId);
	if (!existsSync(attachmentsDir)) {
		mkdirSync(attachmentsDir, { recursive: true });
	}

	// Delete any existing attachment for this transaction
	deleteAttachment(workspaceId, transactionPublicId);

	// Read file buffer
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Process with Sharp: re-encode for security
	// GIF preserved (animated support), everything else converted to JPEG
	let processedBuffer: Buffer;
	let ext: string;
	let mimeType: string;

	if (file.type === 'image/gif') {
		// Preserve GIF (may be animated)
		processedBuffer = await sharp(buffer, { animated: true }).gif().toBuffer();
		ext = '.gif';
		mimeType = 'image/gif';
	} else {
		// Convert to JPEG quality 90
		processedBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
		ext = '.jpg';
		mimeType = 'image/jpeg';
	}

	// Generate filename
	const filename = `${transactionPublicId}${ext}`;
	const attachmentPath = getAttachmentPath(workspaceId, transactionPublicId, ext);

	// Save to disk
	writeFileSync(attachmentPath, processedBuffer);

	return {
		filename,
		mimeType,
		sizeBytes: processedBuffer.length
	};
}

/**
 * Get attachment file buffer for serving
 */
export function getAttachment(
	workspaceId: string,
	transactionPublicId: string
): { buffer: Buffer; mimeType: string; filename: string } | null {
	const attachmentsDir = getAttachmentsDir(workspaceId);

	if (!existsSync(attachmentsDir)) {
		return null;
	}

	// Look for file matching pattern {transactionPublicId}.*
	const files = readdirSync(attachmentsDir);
	const matchingFile = files.find((f) => {
		const nameWithoutExt = f.substring(0, f.lastIndexOf('.'));
		return nameWithoutExt === transactionPublicId;
	});

	if (!matchingFile) {
		return null;
	}

	const filePath = join(attachmentsDir, matchingFile);
	const ext = extname(matchingFile);
	const mimeType = getMimeTypeFromExt(ext);

	return {
		buffer: readFileSync(filePath),
		mimeType,
		filename: matchingFile
	};
}

/**
 * Delete attachment for a transaction
 */
export function deleteAttachment(workspaceId: string, transactionPublicId: string): boolean {
	const attachmentsDir = getAttachmentsDir(workspaceId);

	if (!existsSync(attachmentsDir)) {
		return false;
	}

	// Find file matching pattern {transactionPublicId}.*
	const files = readdirSync(attachmentsDir);
	const matchingFile = files.find((f) => {
		const nameWithoutExt = f.substring(0, f.lastIndexOf('.'));
		return nameWithoutExt === transactionPublicId;
	});

	if (!matchingFile) {
		return false;
	}

	unlinkSync(join(attachmentsDir, matchingFile));
	return true;
}

/**
 * Generate an export-friendly filename for an attachment
 * Format: YYYY-MM-DD_Payee_$Amount.ext
 */
export function generateExportFilename(
	date: string,
	payee: string,
	amountCents: number,
	ext: string
): string {
	// Sanitize payee: remove special chars, replace spaces with underscores, limit to 30 chars
	const sanitizedPayee = payee
		.replace(/[^a-zA-Z0-9\s]/g, '')
		.replace(/\s+/g, '_')
		.substring(0, 30);

	// Format amount as dollars (no cents)
	const amountDollars = Math.round(amountCents / 100);

	// Ensure ext starts with a dot
	const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;

	return `${date}_${sanitizedPayee}_$${amountDollars}${normalizedExt}`;
}
