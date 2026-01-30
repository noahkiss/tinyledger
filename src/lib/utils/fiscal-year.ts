/**
 * Fiscal year calculation utilities.
 *
 * Convention: FY number is the year the fiscal year ENDS.
 * - For FY with startMonth=1 (Jan): FY 2026 = Jan 1, 2026 - Dec 31, 2026
 * - For FY with startMonth=7 (Jul): FY 2026 = Jul 1, 2025 - Jun 30, 2026
 *
 * All startMonth values are 1-indexed (1=January, 12=December).
 */

/**
 * Get the last day of a given month.
 */
function getLastDayOfMonth(year: number, month: number): number {
	// month is 1-indexed, but Date uses 0-indexed months
	// Setting day to 0 of next month gives last day of current month
	return new Date(year, month, 0).getDate();
}

/**
 * Get fiscal year for a given date.
 *
 * @param date - The date to check
 * @param startMonth - The month the fiscal year starts (1=January, default 1)
 * @returns The fiscal year number (year the FY ends in)
 */
export function getFiscalYear(date: Date, startMonth: number = 1): number {
	const month = date.getMonth() + 1; // Convert to 1-indexed
	const year = date.getFullYear();

	if (startMonth === 1) {
		// Calendar year fiscal year - FY equals the calendar year
		return year;
	}

	// For non-calendar fiscal years:
	// If current month >= startMonth, we're in FY that ends next calendar year
	// If current month < startMonth, we're in FY that ends this calendar year
	if (month >= startMonth) {
		return year + 1;
	}
	return year;
}

/**
 * Get the start and end dates for a fiscal year.
 * Returns ISO date strings (YYYY-MM-DD) suitable for DB queries.
 *
 * @param fiscalYear - The fiscal year number (year the FY ends in)
 * @param startMonth - The month the fiscal year starts (1=January, default 1)
 * @returns Object with start and end dates as ISO strings
 */
export function getFiscalYearRange(
	fiscalYear: number,
	startMonth: number = 1
): { start: string; end: string } {
	if (startMonth === 1) {
		// Calendar year: Jan 1 - Dec 31 of the fiscal year
		return {
			start: `${fiscalYear}-01-01`,
			end: `${fiscalYear}-12-31`
		};
	}

	// Non-calendar year: Starts in previous calendar year, ends in fiscal year
	// e.g., FY 2026 with startMonth=7 -> Jul 1, 2025 to Jun 30, 2026
	const startYear = fiscalYear - 1;
	const endMonth = startMonth - 1 || 12; // Month before start month
	const endYear = endMonth === 12 ? fiscalYear - 1 : fiscalYear;
	const lastDay = getLastDayOfMonth(endYear, endMonth);

	const startMonthStr = startMonth.toString().padStart(2, '0');
	const endMonthStr = endMonth.toString().padStart(2, '0');
	const lastDayStr = lastDay.toString().padStart(2, '0');

	return {
		start: `${startYear}-${startMonthStr}-01`,
		end: `${endYear}-${endMonthStr}-${lastDayStr}`
	};
}

/**
 * Get current fiscal year based on today's date.
 *
 * @param startMonth - The month the fiscal year starts (1=January, default 1)
 * @returns The current fiscal year number
 */
export function getCurrentFiscalYear(startMonth: number = 1): number {
	return getFiscalYear(new Date(), startMonth);
}

/**
 * Get list of available fiscal years from foundedYear to next year.
 * Returns array of fiscal year numbers in descending order.
 *
 * @param foundedYear - The year the business was founded (null = use current year - 5)
 * @param startMonth - The month the fiscal year starts (1=January, default 1)
 * @returns Array of fiscal year numbers in descending order
 */
export function getAvailableFiscalYears(
	foundedYear: number | null,
	startMonth: number = 1
): number[] {
	const currentFY = getCurrentFiscalYear(startMonth);
	const nextFY = currentFY + 1; // Allow selecting next FY for planning

	// If no founded year, default to 5 years back from current FY
	const firstFY = foundedYear !== null ? getFiscalYear(new Date(foundedYear, 0, 1), startMonth) : currentFY - 5;

	// Generate array from nextFY down to firstFY
	const years: number[] = [];
	for (let fy = nextFY; fy >= firstFY; fy--) {
		years.push(fy);
	}

	return years;
}

/**
 * Format fiscal year for display.
 * - Calendar year (startMonth=1): "FY 2026"
 * - Non-calendar year (startMonth>1): "FY 2025-2026"
 *
 * @param fiscalYear - The fiscal year number (year the FY ends in)
 * @param startMonth - The month the fiscal year starts (1=January, default 1)
 * @returns Formatted string for display
 */
export function formatFiscalYear(fiscalYear: number, startMonth: number = 1): string {
	if (startMonth === 1) {
		return `FY ${fiscalYear}`;
	}

	// Non-calendar year shows both years
	return `FY ${fiscalYear - 1}-${fiscalYear}`;
}
