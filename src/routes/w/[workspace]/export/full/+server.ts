import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	transactions,
	transactionTags,
	tags,
	attachments,
	workspaceSettings,
	filings
} from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { generateTransactionsCSV, type ExportTransaction } from '$lib/server/export/csv-export';
import { generateFullExport } from '$lib/server/export/json-export';

const DATA_DIR = process.env.DATA_DIR ?? './data';

export const GET: RequestHandler = async ({ locals, params }) => {
	const db = locals.db;

	if (!db) {
		throw error(500, 'Database not initialized');
	}

	// Get workspace settings
	const settings = db.select().from(workspaceSettings).get();
	if (!settings) {
		throw error(500, 'Workspace settings not found');
	}

	// Query all non-deleted transactions
	const transactionList = db
		.select()
		.from(transactions)
		.where(isNull(transactions.deletedAt))
		.orderBy(transactions.date)
		.all();

	// Query all tags
	const tagList = db.select().from(tags).orderBy(tags.name).all();

	// Query all filings
	const filingList = db.select().from(filings).orderBy(filings.fiscalYear).all();

	// Build export transactions for both CSV and JSON
	const csvTransactions: ExportTransaction[] = [];
	const jsonTransactions: Array<{
		publicId: string;
		date: string;
		type: 'income' | 'expense';
		amountCents: number;
		payee: string;
		description?: string;
		paymentMethod: string;
		checkNumber?: string;
		tags: Array<{ name: string; percentage: number }>;
		hasAttachment: boolean;
		attachmentFilename?: string;
		voidedAt?: string;
		createdAt: string;
	}> = [];

	for (const txn of transactionList) {
		// Get tags for this transaction
		const tagAllocations = db
			.select({
				tagName: tags.name,
				percentage: transactionTags.percentage
			})
			.from(transactionTags)
			.innerJoin(tags, eq(transactionTags.tagId, tags.id))
			.where(eq(transactionTags.transactionId, txn.id))
			.all();

		// Check if transaction has attachment
		const attachment = db
			.select({ id: attachments.id, filename: attachments.filename })
			.from(attachments)
			.where(eq(attachments.transactionId, txn.id))
			.get();

		// Format tags as "Tag1 (50%), Tag2 (50%)" for CSV
		const tagsStr = tagAllocations
			.map((t) => (t.percentage === 100 ? t.tagName : `${t.tagName} (${t.percentage}%)`))
			.join(', ');

		csvTransactions.push({
			publicId: txn.publicId,
			date: txn.date,
			type: txn.type as 'income' | 'expense',
			payee: txn.payee,
			amountCents: txn.amountCents,
			description: txn.description ?? undefined,
			paymentMethod: txn.paymentMethod,
			checkNumber: txn.checkNumber ?? undefined,
			tags: tagsStr,
			hasReceipt: !!attachment,
			voidedAt: txn.voidedAt ?? undefined
		});

		jsonTransactions.push({
			publicId: txn.publicId,
			date: txn.date,
			type: txn.type as 'income' | 'expense',
			amountCents: txn.amountCents,
			payee: txn.payee,
			description: txn.description ?? undefined,
			paymentMethod: txn.paymentMethod,
			checkNumber: txn.checkNumber ?? undefined,
			tags: tagAllocations.map((t) => ({
				name: t.tagName,
				percentage: t.percentage
			})),
			hasAttachment: !!attachment,
			attachmentFilename: attachment?.filename,
			voidedAt: txn.voidedAt ?? undefined,
			createdAt: txn.createdAt
		});
	}

	// Generate CSV
	const csvData = generateTransactionsCSV(csvTransactions);

	// Generate JSON
	const jsonData = generateFullExport({
		workspace: {
			name: settings.name,
			type: settings.type,
			businessName: settings.businessName ?? undefined,
			ein: settings.ein ?? undefined,
			address: settings.address ?? undefined,
			phone: settings.phone ?? undefined,
			responsibleParty: settings.responsibleParty ?? undefined,
			fiscalYearStartMonth: settings.fiscalYearStartMonth,
			foundedYear: settings.foundedYear ?? undefined
		},
		transactions: jsonTransactions,
		tags: tagList.map((t) => ({
			name: t.name,
			createdAt: t.createdAt
		})),
		filings: filingList.map((f) => ({
			fiscalYear: f.fiscalYear,
			formId: f.formId,
			filedAt: f.filedAt ?? undefined,
			confirmationNumber: f.confirmationNumber ?? undefined,
			notes: f.notes ?? undefined
		}))
	});

	// Create archive
	const archive = archiver('zip', { zlib: { level: 6 } });

	// Add JSON
	archive.append(jsonData, { name: 'data.json' });

	// Add CSV
	archive.append(csvData, { name: 'transactions.csv' });

	// Add attachments folder if exists
	const attachmentsDir = join(DATA_DIR, 'attachments', params.workspace);
	if (existsSync(attachmentsDir)) {
		archive.directory(attachmentsDir, 'attachments');
	}

	// Finalize archive
	archive.finalize();

	// Convert to web stream
	const stream = Readable.toWeb(archive) as ReadableStream;
	const filename = `${params.workspace}-export-${new Date().toISOString().split('T')[0]}.zip`;

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
