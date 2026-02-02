/**
 * Report utility functions for data aggregation and formatting.
 */

/**
 * Default tax set-aside rate (25%)
 * Used as fallback when taxes are not configured.
 */
export const TAX_SET_ASIDE_RATE = 0.25;

/**
 * Calculate effective tax rate from configured rates.
 * This is an approximation that includes SE tax (15.3% on 92.35% of income).
 *
 * @param netIncomeCents - Net self-employment income in cents
 * @param federalRate - Federal bracket rate (e.g., 0.22 for 22%)
 * @param stateRate - State tax rate (e.g., 0.0307 for 3.07%)
 * @param localRate - Local EIT rate (e.g., 0.01 for 1%)
 * @returns Effective tax rate as a decimal (e.g., 0.35 for 35%)
 */
export function calculateEffectiveTaxRate(
	netIncomeCents: number,
	federalRate: number,
	stateRate: number,
	localRate: number
): number {
	if (netIncomeCents <= 0) return 0;

	// SE tax base rate (15.3% on 92.35% of income = ~14.13%)
	const seRate = 0.153 * 0.9235;

	// Federal rate applies to income after SE deduction (half of SE tax)
	// Simplified: apply federal rate to (1 - seRate/2) of income
	const federalEffective = federalRate * (1 - seRate / 2);

	// State and local apply to full net income
	return seRate + federalEffective + stateRate + localRate;
}

/**
 * Get short month label from a date string.
 * @param date - Date string in YYYY-MM-DD or YYYY-MM format
 * @returns Short month name (e.g., "Jan", "Feb")
 */
export function getMonthLabel(date: string): string {
	// Parse YYYY-MM or YYYY-MM-DD format
	const [year, month] = date.split('-').map(Number);
	const dateObj = new Date(year, month - 1, 1);
	return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj);
}

/**
 * Get quarter label from a date string.
 * @param date - Date string in YYYY-MM-DD or YYYY-MM format
 * @returns Quarter label (e.g., "Q1", "Q2")
 */
export function getQuarterLabel(date: string): string {
	const [, month] = date.split('-').map(Number);
	const quarter = Math.ceil(month / 3);
	return `Q${quarter}`;
}

/**
 * Calculate percent change between two values.
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percent change as a number, or null if previous is 0 or invalid
 */
export function calculatePercentChange(current: number, previous: number): number | null {
	if (previous === 0 || !Number.isFinite(previous)) {
		return null;
	}
	return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Get array of YYYY-MM strings for each month in a fiscal year.
 * @param fiscalYear - The fiscal year number (year the FY ends in)
 * @param startMonth - The month the fiscal year starts (1=January, default 1)
 * @returns Array of YYYY-MM strings in chronological order
 */
export function getMonthsInFiscalYear(fiscalYear: number, startMonth: number = 1): string[] {
	const months: string[] = [];

	if (startMonth === 1) {
		// Calendar year: Jan-Dec of fiscal year
		for (let m = 1; m <= 12; m++) {
			months.push(`${fiscalYear}-${m.toString().padStart(2, '0')}`);
		}
	} else {
		// Non-calendar year: starts in previous year, ends in fiscal year
		// e.g., FY 2026 with startMonth=7 -> Jul 2025 through Jun 2026
		const startYear = fiscalYear - 1;

		// First part: from startMonth to December of startYear
		for (let m = startMonth; m <= 12; m++) {
			months.push(`${startYear}-${m.toString().padStart(2, '0')}`);
		}

		// Second part: from January to (startMonth - 1) of fiscalYear
		for (let m = 1; m < startMonth; m++) {
			months.push(`${fiscalYear}-${m.toString().padStart(2, '0')}`);
		}
	}

	return months;
}

/**
 * Format percent change for display.
 * @param change - Percent change value
 * @returns Formatted string with +/- prefix (e.g., "+12.5%", "-3.2%")
 */
export function formatPercentChange(change: number): string {
	const prefix = change >= 0 ? '+' : '';
	return `${prefix}${change.toFixed(1)}%`;
}
