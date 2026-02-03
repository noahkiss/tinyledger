import { parse, isValid, format } from 'date-fns';

// Date formats to try, in order of likelihood for US users
export const DATE_FORMATS = [
	'yyyy-MM-dd', // ISO: 2026-01-15
	'MM/dd/yyyy', // US: 01/15/2026
	'M/d/yyyy', // US short: 1/15/2026
	'MM-dd-yyyy', // US with dashes
	'M-d-yyyy', // US short with dashes
	'dd/MM/yyyy', // European: 15/01/2026
	'dd-MM-yyyy', // European with dashes
	'MMM d, yyyy', // Text: Jan 15, 2026
	'MMMM d, yyyy', // Full text: January 15, 2026
	'yyyy/MM/dd' // Asian: 2026/01/15
];

/**
 * Attempt to parse a date string using multiple formats.
 * Returns YYYY-MM-DD format or null if unparseable.
 */
export function parseDate(dateStr: string): string | null {
	const trimmed = dateStr.trim();
	if (!trimmed) return null;

	for (const fmt of DATE_FORMATS) {
		try {
			const parsed = parse(trimmed, fmt, new Date());
			if (isValid(parsed)) {
				return format(parsed, 'yyyy-MM-dd');
			}
		} catch {
			// Try next format
		}
	}
	return null;
}

/**
 * Detect the most likely date format from a sample of date strings.
 * Returns the format string or null if no consistent format found.
 */
export function detectDateFormat(samples: string[]): string | null {
	const formatCounts = new Map<string, number>();

	for (const sample of samples) {
		for (const fmt of DATE_FORMATS) {
			try {
				const parsed = parse(sample.trim(), fmt, new Date());
				if (isValid(parsed)) {
					formatCounts.set(fmt, (formatCounts.get(fmt) || 0) + 1);
					break; // Use first matching format for this sample
				}
			} catch {
				// Try next format
			}
		}
	}

	// Return format with highest count
	let bestFormat: string | null = null;
	let bestCount = 0;
	for (const [fmt, count] of formatCounts) {
		if (count > bestCount) {
			bestCount = count;
			bestFormat = fmt;
		}
	}

	return bestFormat;
}
