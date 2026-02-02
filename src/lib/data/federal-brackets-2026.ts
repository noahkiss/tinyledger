/**
 * Federal income tax brackets for 2026 (single filers)
 *
 * Source: Tax Foundation
 * https://taxfoundation.org/data/all/federal/2026-tax-brackets/
 *
 * Note: These brackets are adjusted annually for inflation.
 * User selects their expected bracket based on taxable income.
 */

export interface FederalBracket {
	/** Tax rate as decimal (e.g., 0.22 for 22%) */
	rate: number;
	/** Display label for the rate (e.g., "22%") */
	rateLabel: string;
	/** Minimum taxable income for this bracket (dollars) */
	minIncome: number;
	/** Maximum taxable income for this bracket (dollars), null for top bracket */
	maxIncome: number | null;
	/** Full display label with income range */
	label: string;
}

/**
 * 2026 federal income tax brackets for single filers.
 * Updated annually - check Tax Foundation for latest data.
 */
export const FEDERAL_BRACKETS_2026: FederalBracket[] = [
	{
		rate: 0.1,
		rateLabel: '10%',
		minIncome: 0,
		maxIncome: 11925,
		label: '10% ($0 - $11,925)'
	},
	{
		rate: 0.12,
		rateLabel: '12%',
		minIncome: 11926,
		maxIncome: 48475,
		label: '12% ($11,926 - $48,475)'
	},
	{
		rate: 0.22,
		rateLabel: '22%',
		minIncome: 48476,
		maxIncome: 103350,
		label: '22% ($48,476 - $103,350)'
	},
	{
		rate: 0.24,
		rateLabel: '24%',
		minIncome: 103351,
		maxIncome: 197300,
		label: '24% ($103,351 - $197,300)'
	},
	{
		rate: 0.32,
		rateLabel: '32%',
		minIncome: 197301,
		maxIncome: 250525,
		label: '32% ($197,301 - $250,525)'
	},
	{
		rate: 0.35,
		rateLabel: '35%',
		minIncome: 250526,
		maxIncome: 626350,
		label: '35% ($250,526 - $626,350)'
	},
	{
		rate: 0.37,
		rateLabel: '37%',
		minIncome: 626351,
		maxIncome: null,
		label: '37% ($626,351+)'
	}
];

/**
 * Get bracket by rate percentage (e.g., 22 for 22%)
 */
export function getBracketByRate(ratePercent: number): FederalBracket | undefined {
	return FEDERAL_BRACKETS_2026.find((b) => b.rate * 100 === ratePercent);
}
