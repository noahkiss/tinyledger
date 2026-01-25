import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const LOGO_SIZE = 128;

/**
 * Get the logos directory path
 */
function getLogosDir(): string {
	return join(DATA_DIR, 'logos');
}

/**
 * Get the logo file path for a workspace
 */
function getLogoPath(workspaceId: string, filename: string): string {
	return join(getLogosDir(), workspaceId, filename);
}

/**
 * Get the directory for a workspace's logos
 */
function getWorkspaceLogoDir(workspaceId: string): string {
	return join(getLogosDir(), workspaceId);
}

/**
 * Process and save a logo upload.
 * - Resizes to 128x128
 * - Converts to PNG
 * - Saves to data/logos/[workspaceId]/logo-[timestamp].png
 * - Deletes any existing logos for this workspace
 *
 * @returns The filename of the saved logo
 */
export async function processLogoUpload(
	workspaceId: string,
	file: File
): Promise<string> {
	// Ensure logos directory exists
	const workspaceLogoDir = getWorkspaceLogoDir(workspaceId);
	if (!existsSync(workspaceLogoDir)) {
		mkdirSync(workspaceLogoDir, { recursive: true });
	}

	// Delete existing logos for this workspace
	try {
		const existingFiles = readdirSync(workspaceLogoDir);
		for (const f of existingFiles) {
			if (f.startsWith('logo-')) {
				unlinkSync(join(workspaceLogoDir, f));
			}
		}
	} catch {
		// Directory might not exist yet, ignore
	}

	// Read file buffer
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Process with Sharp: resize to 128x128, convert to PNG
	const processedBuffer = await sharp(buffer)
		.resize(LOGO_SIZE, LOGO_SIZE, {
			fit: 'cover',
			position: 'center'
		})
		.png()
		.toBuffer();

	// Generate filename with timestamp for cache busting
	const filename = `logo-${Date.now()}.png`;
	const logoPath = getLogoPath(workspaceId, filename);

	// Save to disk
	writeFileSync(logoPath, processedBuffer);

	return filename;
}

/**
 * Get logo file buffer for serving
 */
export function getLogoBuffer(workspaceId: string, filename: string): Buffer | null {
	const logoPath = getLogoPath(workspaceId, filename);

	if (!existsSync(logoPath)) {
		return null;
	}

	const { readFileSync } = require('node:fs');
	return readFileSync(logoPath);
}

/**
 * Delete logo for a workspace
 */
export function deleteLogo(workspaceId: string, filename: string): boolean {
	const logoPath = getLogoPath(workspaceId, filename);

	if (!existsSync(logoPath)) {
		return false;
	}

	unlinkSync(logoPath);
	return true;
}
