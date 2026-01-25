/**
 * Currency utility functions
 * All monetary values are stored as integer cents to avoid floating-point errors
 */

/**
 * Convert dollar amount to cents (integer)
 * Handles floating-point precision by rounding
 */
export function dollarsToCents(dollars: number): number {
	return Math.round(dollars * 100);
}

/**
 * Convert cents (integer) to dollar amount
 */
export function centsToDollars(cents: number): number {
	return cents / 100;
}

/**
 * Format cents as currency string for display
 * Uses Intl.NumberFormat for proper locale handling
 */
export function formatCurrency(cents: number): string {
	const dollars = centsToDollars(cents);
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(dollars);
}

/**
 * Parse a currency string input to cents
 * Handles inputs like "1.50", "$1.50", "1", "1.5"
 */
export function parseCurrencyToCents(input: string): number {
	// Remove all non-numeric except decimal point
	const cleaned = input.replace(/[^\d.]/g, '');
	const dollars = parseFloat(cleaned) || 0;
	return dollarsToCents(dollars);
}
