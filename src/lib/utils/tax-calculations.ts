/**
 * Tax calculation utilities for sole proprietors.
 * All amounts are in integer cents to match TinyLedger convention.
 *
 * Sources:
 * - IRS Topic 554: https://www.irs.gov/taxtopics/tc554
 * - IRS Form 1040-ES: https://www.irs.gov/forms-pubs/about-form-1040-es
 * - IRS Publication 505: https://www.irs.gov/publications/p505
 */

/** Social Security wage base limit for 2026 (estimated) */
const WAGE_BASE_2026_CENTS = 17610000; // $176,100 in cents

/** Medicare additional tax threshold */
const MEDICARE_SURTAX_THRESHOLD_CENTS = 20000000; // $200,000 in cents

/**
 * Self-employment tax result breakdown.
 */
export interface SelfEmploymentTaxResult {
	/** Net earnings subject to SE tax (92.35% of net income) */
	taxableCents: number;
	/** Social Security tax (12.4% up to wage base) */
	socialSecurityCents: number;
	/** Medicare tax (2.9% of all income) */
	medicareCents: number;
	/** Additional Medicare tax (0.9% over $200k threshold) */
	additionalMedicareCents: number;
	/** Total SE tax (SS + Medicare + Additional Medicare) */
	totalCents: number;
	/** Deductible portion (50% of total SE tax) */
	deductibleCents: number;
}

/**
 * Calculate self-employment tax.
 *
 * Formula (IRS Topic 554):
 * 1. Taxable SE income = Net earnings * 92.35%
 * 2. Social Security = 12.4% of taxable (up to wage base limit)
 * 3. Medicare = 2.9% of all taxable income (no cap)
 * 4. Additional Medicare = 0.9% of income over $200,000
 * 5. Total SE tax = SS + Medicare + Additional Medicare
 * 6. Deductible = 50% of total (deducted from gross income on Form 1040)
 *
 * @param netIncomeCents - Net self-employment income in cents
 * @returns Breakdown of SE tax components
 */
export function calculateSelfEmploymentTax(netIncomeCents: number): SelfEmploymentTaxResult {
	if (netIncomeCents <= 0) {
		return {
			taxableCents: 0,
			socialSecurityCents: 0,
			medicareCents: 0,
			additionalMedicareCents: 0,
			totalCents: 0,
			deductibleCents: 0
		};
	}

	// 92.35% of net earnings (IRS reduces SE income before calculating tax)
	const taxableCents = Math.round(netIncomeCents * 0.9235);

	// Social Security: 12.4% up to wage base limit
	const ssIncomeCents = Math.min(taxableCents, WAGE_BASE_2026_CENTS);
	const socialSecurityCents = Math.round(ssIncomeCents * 0.124);

	// Medicare: 2.9% of all income (no cap)
	const medicareCents = Math.round(taxableCents * 0.029);

	// Additional Medicare: 0.9% over $200,000 threshold
	const additionalMedicareCents =
		taxableCents > MEDICARE_SURTAX_THRESHOLD_CENTS
			? Math.round((taxableCents - MEDICARE_SURTAX_THRESHOLD_CENTS) * 0.009)
			: 0;

	const totalCents = socialSecurityCents + medicareCents + additionalMedicareCents;

	// 50% of SE tax is deductible from gross income
	const deductibleCents = Math.round(totalCents / 2);

	return {
		taxableCents,
		socialSecurityCents,
		medicareCents,
		additionalMedicareCents,
		totalCents,
		deductibleCents
	};
}

/**
 * Calculate federal income tax estimate.
 *
 * This uses a simplified calculation: (Net income - SE deduction) * bracket rate
 *
 * Note: This is an estimate using the user's selected bracket rate.
 * Full progressive calculation would require knowing total taxable income
 * including wages and other income, which is outside TinyLedger's scope.
 *
 * @param netIncomeCents - Net business income in cents
 * @param bracketRate - User's selected federal bracket rate (e.g., 0.22 for 22%)
 * @param seDeductionCents - Self-employment tax deduction (50% of SE tax)
 * @returns Estimated federal income tax in cents
 */
export function calculateFederalIncomeTax(
	netIncomeCents: number,
	bracketRate: number,
	seDeductionCents: number
): number {
	const taxableIncomeCents = Math.max(0, netIncomeCents - seDeductionCents);
	return Math.round(taxableIncomeCents * bracketRate);
}

/**
 * Calculate state income tax estimate.
 *
 * Uses flat rate calculation (appropriate for flat-rate states like PA).
 *
 * @param netIncomeCents - Net business income in cents
 * @param stateRate - State income tax rate (e.g., 0.0307 for PA 3.07%)
 * @returns Estimated state income tax in cents
 */
export function calculateStateIncomeTax(netIncomeCents: number, stateRate: number): number {
	if (netIncomeCents <= 0) return 0;
	return Math.round(netIncomeCents * stateRate);
}

/**
 * Calculate local Earned Income Tax (EIT).
 *
 * PA and some other states have local EIT in addition to state tax.
 * Rate varies by municipality (PA range: 0.5% to ~3.6%).
 *
 * @param netIncomeCents - Net business income in cents
 * @param eitRate - Local EIT rate (e.g., 0.01 for 1%)
 * @returns Estimated local EIT in cents
 */
export function calculateLocalEIT(netIncomeCents: number, eitRate: number): number {
	if (netIncomeCents <= 0) return 0;
	return Math.round(netIncomeCents * eitRate);
}

/**
 * Quarterly due date information.
 */
export interface QuarterlyDueDate {
	/** Quarter number (1-4) */
	quarter: 1 | 2 | 3 | 4;
	/** ISO date string (YYYY-MM-DD) */
	dueDate: string;
	/** Formatted label (e.g., "Apr 15, 2026") */
	label: string;
}

/**
 * Get quarterly estimated payment due dates for a given tax year.
 *
 * IRS quarterly payment schedule for individuals:
 * - Q1: April 15 (for Jan-Mar income)
 * - Q2: June 15 (for Apr-May income)
 * - Q3: September 15 (for Jun-Aug income)
 * - Q4: January 15 of following year (for Sep-Dec income)
 *
 * @param year - Tax year (calendar year)
 * @returns Array of quarterly due dates
 */
export function getQuarterlyDueDates(year: number): QuarterlyDueDate[] {
	return [
		{ quarter: 1, dueDate: `${year}-04-15`, label: `Apr 15, ${year}` },
		{ quarter: 2, dueDate: `${year}-06-15`, label: `Jun 15, ${year}` },
		{ quarter: 3, dueDate: `${year}-09-15`, label: `Sep 15, ${year}` },
		{ quarter: 4, dueDate: `${year + 1}-01-15`, label: `Jan 15, ${year + 1}` }
	];
}

/**
 * Quarterly payment status and recommendation.
 */
export interface QuarterlyPayment {
	/** Quarter number (1-4) */
	quarter: 1 | 2 | 3 | 4;
	/** ISO date string for due date */
	dueDate: string;
	/** Formatted due date label */
	dueDateLabel: string;
	/** Recommended payment amount in cents */
	recommendedCents: number;
	/** Amount already paid in cents (null = not paid) */
	paidCents: number | null;
	/** Whether this quarter has been paid */
	isPaid: boolean;
	/** Whether this quarter is past due and unpaid */
	isPastDue: boolean;
	/** Whether due date is within 30 days */
	isUpcoming: boolean;
}

/**
 * Paid payment record for quarterly calculation.
 */
export interface PaidPayment {
	quarter: number;
	amountCents: number;
}

/**
 * Calculate quarterly payment schedule with recommended amounts.
 *
 * Uses the annualized income installment method:
 * - Divide total estimated tax by remaining quarters
 * - Adjust for payments already made
 *
 * This is the IRS-recommended method for self-employed individuals
 * with fluctuating income.
 *
 * @param year - Tax year
 * @param ytdNetIncomeCents - Year-to-date net income in cents
 * @param totalEstimatedTaxCents - Total estimated tax for the year in cents
 * @param paidPayments - Array of payments already made
 * @param today - Current date as ISO string (YYYY-MM-DD)
 * @returns Array of quarterly payment details
 */
export function calculateQuarterlyPayments(
	year: number,
	ytdNetIncomeCents: number,
	totalEstimatedTaxCents: number,
	paidPayments: PaidPayment[],
	today: string
): QuarterlyPayment[] {
	const dueDates = getQuarterlyDueDates(year);

	// Calculate total already paid
	const totalPaidCents = paidPayments.reduce((sum, p) => sum + p.amountCents, 0);
	const remainingTaxCents = Math.max(0, totalEstimatedTaxCents - totalPaidCents);

	// Count remaining unpaid quarters
	const paidQuarters = new Set(paidPayments.map((p) => p.quarter));
	const unpaidQuarters = [1, 2, 3, 4].filter((q) => !paidQuarters.has(q)).length;

	// Calculate per-quarter recommended amount
	const perQuarterCents = unpaidQuarters > 0 ? Math.round(remainingTaxCents / unpaidQuarters) : 0;

	const todayDate = new Date(today);

	return dueDates.map((dd) => {
		const paid = paidPayments.find((p) => p.quarter === dd.quarter);
		const dueDateObj = new Date(dd.dueDate);
		const daysUntilDue = Math.floor(
			(dueDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
		);

		return {
			quarter: dd.quarter,
			dueDate: dd.dueDate,
			dueDateLabel: dd.label,
			recommendedCents: paid ? paid.amountCents : perQuarterCents,
			paidCents: paid?.amountCents ?? null,
			isPaid: !!paid,
			isPastDue: !paid && dd.dueDate < today,
			isUpcoming: !paid && daysUntilDue >= 0 && daysUntilDue <= 30
		};
	});
}
