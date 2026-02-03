import Papa from 'papaparse';
import { parseDate } from './date-detector';

export interface ParsedRow {
	rowNumber: number;
	data: Record<string, string>;
	errors: string[];
}

export interface CSVPreviewResult {
	headers: string[];
	preview: ParsedRow[];
	totalRows: number;
	parseErrors: string[];
}

export interface ColumnMapping {
	date?: string;
	type?: string;
	payee?: string;
	amount?: string;
	description?: string;
	tags?: string;
	paymentMethod?: string;
	checkNumber?: string;
}

export interface ValidatedTransaction {
	date: string;
	type: 'income' | 'expense';
	payee: string;
	amountCents: number;
	description?: string;
	tags: string[];
	paymentMethod: 'cash' | 'card' | 'check';
	checkNumber?: string;
}

export interface ValidationResult {
	valid: ValidatedTransaction[];
	invalid: Array<{ rowNumber: number; errors: string[] }>;
	unknownTags: string[];
}

/**
 * Parse CSV and return preview with headers and first N rows.
 */
export function parseCSVPreview(csvText: string, previewRows = 20): CSVPreviewResult {
	const result = Papa.parse(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: (h) => h.trim()
	});

	const headers = result.meta.fields || [];
	const allData = result.data as Record<string, string>[];

	const preview: ParsedRow[] = allData.slice(0, previewRows).map((row, index) => ({
		rowNumber: index + 2, // +2 for 1-based and header row
		data: row,
		errors: []
	}));

	return {
		headers,
		preview,
		totalRows: allData.length,
		parseErrors: result.errors.map((e) => `Row ${e.row}: ${e.message}`)
	};
}

/**
 * Parse and validate full CSV with column mapping.
 * Returns validated transactions and invalid rows.
 */
export function validateCSVWithMapping(
	csvText: string,
	mapping: ColumnMapping,
	existingTags: string[]
): ValidationResult {
	const result = Papa.parse(csvText, {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: (h) => h.trim()
	});

	const allData = result.data as Record<string, string>[];
	const valid: ValidatedTransaction[] = [];
	const invalid: Array<{ rowNumber: number; errors: string[] }> = [];
	const unknownTagsSet = new Set<string>();
	const existingTagsLower = new Set(existingTags.map((t) => t.toLowerCase()));

	for (let i = 0; i < allData.length; i++) {
		const row = allData[i];
		const rowNumber = i + 2; // 1-based + header
		const errors: string[] = [];

		// Parse date
		const dateRaw = mapping.date ? row[mapping.date] : '';
		const date = parseDate(dateRaw);
		if (!date) {
			errors.push(`Invalid date: "${dateRaw}"`);
		}

		// Parse type
		const typeRaw = mapping.type ? row[mapping.type]?.toLowerCase().trim() : '';
		let type: 'income' | 'expense' | null = null;
		if (typeRaw === 'income' || typeRaw === 'expense') {
			type = typeRaw;
		} else if (typeRaw === 'in' || typeRaw === 'revenue' || typeRaw === 'sale') {
			type = 'income';
		} else if (
			typeRaw === 'out' ||
			typeRaw === 'cost' ||
			typeRaw === 'purchase' ||
			typeRaw === 'exp'
		) {
			type = 'expense';
		} else {
			errors.push(`Invalid type: "${typeRaw}" (expected income or expense)`);
		}

		// Parse payee
		const payee = mapping.payee ? row[mapping.payee]?.trim() : '';
		if (!payee) {
			errors.push('Payee is required');
		}

		// Parse amount
		const amountRaw = mapping.amount ? row[mapping.amount] : '';
		const amountCents = parseAmount(amountRaw);
		if (amountCents === null) {
			errors.push(`Invalid amount: "${amountRaw}"`);
		}

		// Parse payment method
		const pmRaw = mapping.paymentMethod
			? row[mapping.paymentMethod]?.toLowerCase().trim()
			: 'card';
		let paymentMethod: 'cash' | 'card' | 'check' = 'card';
		if (pmRaw === 'cash') paymentMethod = 'cash';
		else if (pmRaw === 'check' || pmRaw === 'cheque') paymentMethod = 'check';
		else paymentMethod = 'card';

		// Parse check number
		const checkNumber = mapping.checkNumber ? row[mapping.checkNumber]?.trim() : undefined;

		// Parse description
		const description = mapping.description ? row[mapping.description]?.trim() : undefined;

		// Parse tags
		const tagsRaw = mapping.tags ? row[mapping.tags] : '';
		const tags = tagsRaw
			.split(/[,;]/)
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		// Check for unknown tags
		for (const tag of tags) {
			if (!existingTagsLower.has(tag.toLowerCase())) {
				unknownTagsSet.add(tag);
			}
		}

		if (errors.length > 0) {
			invalid.push({ rowNumber, errors });
		} else if (date && type && payee && amountCents !== null) {
			valid.push({
				date,
				type,
				payee,
				amountCents,
				description: description || undefined,
				tags,
				paymentMethod,
				checkNumber: checkNumber || undefined
			});
		}
	}

	return {
		valid,
		invalid,
		unknownTags: Array.from(unknownTagsSet)
	};
}

/**
 * Parse amount string to cents.
 * Handles: $1,234.56, 1234.56, -$50.00, (50.00) for negatives
 */
function parseAmount(amountStr: string): number | null {
	if (!amountStr) return null;

	let str = amountStr.trim();
	let negative = false;

	// Handle parentheses for negative (accounting format)
	if (str.startsWith('(') && str.endsWith(')')) {
		negative = true;
		str = str.slice(1, -1);
	}

	// Handle leading minus
	if (str.startsWith('-')) {
		negative = true;
		str = str.slice(1);
	}

	// Remove currency symbols and commas
	str = str.replace(/[$,]/g, '');

	const num = parseFloat(str);
	if (isNaN(num)) return null;

	const cents = Math.round(num * 100);
	return negative ? -cents : cents;
}
