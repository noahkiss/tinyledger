/**
 * State income tax rates for flat-rate states.
 *
 * Source: Tax Foundation
 * https://taxfoundation.org/data/all/state/state-income-tax-rates/
 *
 * Note: This includes only flat-rate states for simplicity.
 * Graduated-rate states (CA, NY, etc.) would require more complex calculations.
 * For v1, users in graduated states can manually override with their expected rate.
 */

export interface StateRate {
	/** Two-letter state code (e.g., "PA") */
	code: string;
	/** Full state name */
	name: string;
	/** Tax rate as decimal (e.g., 0.0307 for 3.07%) */
	rate: number;
	/** Display label for the rate (e.g., "3.07%") */
	rateLabel: string;
	/** Rate type */
	type: 'flat' | 'graduated';
	/** Optional notes about the rate */
	notes?: string;
}

/**
 * State income tax rates for flat-rate states.
 * Users in graduated states can manually override.
 */
export const STATE_TAX_RATES: StateRate[] = [
	{
		code: 'PA',
		name: 'Pennsylvania',
		rate: 0.0307,
		rateLabel: '3.07%',
		type: 'flat',
		notes: 'Flat rate on all taxable income'
	},
	{
		code: 'IL',
		name: 'Illinois',
		rate: 0.0495,
		rateLabel: '4.95%',
		type: 'flat'
	},
	{
		code: 'MI',
		name: 'Michigan',
		rate: 0.0425,
		rateLabel: '4.25%',
		type: 'flat'
	},
	{
		code: 'IN',
		name: 'Indiana',
		rate: 0.0305,
		rateLabel: '3.05%',
		type: 'flat'
	},
	{
		code: 'CO',
		name: 'Colorado',
		rate: 0.044,
		rateLabel: '4.40%',
		type: 'flat'
	},
	{
		code: 'UT',
		name: 'Utah',
		rate: 0.0465,
		rateLabel: '4.65%',
		type: 'flat'
	},
	{
		code: 'NC',
		name: 'North Carolina',
		rate: 0.0475,
		rateLabel: '4.75%',
		type: 'flat'
	},
	{
		code: 'MA',
		name: 'Massachusetts',
		rate: 0.05,
		rateLabel: '5.00%',
		type: 'flat',
		notes: 'Additional 4% surtax on income over $1M'
	},
	{
		code: 'KY',
		name: 'Kentucky',
		rate: 0.04,
		rateLabel: '4.00%',
		type: 'flat'
	}
];

/**
 * Look up state rate by two-letter code.
 * Returns undefined if state not found (user should manually enter rate).
 */
export function getStateRate(code: string): StateRate | undefined {
	return STATE_TAX_RATES.find((s) => s.code === code.toUpperCase());
}

/**
 * Get all state codes for dropdown population.
 */
export function getStateCodes(): string[] {
	return STATE_TAX_RATES.map((s) => s.code);
}
