/**
 * Filing definitions for compliance tracking.
 *
 * Provides filing requirements for both sole proprietors (Schedule C, SE, 1040-ES, PA forms)
 * and volunteer organizations (990-N, BCO-10).
 *
 * Each filing has deadline calculation logic based on fiscal year.
 */

export interface FilingDefinition {
	/** Unique identifier (e.g., 'schedule-c', '1040-es-q1') */
	id: string;
	/** Display name (e.g., 'Schedule C') */
	name: string;
	/** Full official name */
	fullName: string;
	/** Brief description */
	description: string;
	/** Filing frequency */
	frequency: 'annual' | 'quarterly';
	/** Quarter number for quarterly filings */
	quarter?: 1 | 2 | 3 | 4;
	/** Workspace type this applies to */
	workspaceType: 'sole_prop' | 'volunteer_org' | 'both';
	/** Category for grouping in UI */
	category: 'federal' | 'state';
	/** State codes this applies to (undefined = federal/all states) */
	applicableStates?: string[];
	/** Filing threshold description */
	filingThreshold?: string;
	/** Link to filing instructions */
	instructionsUrl?: string;
	/** Calculate deadline for given fiscal year */
	getDeadline: (fiscalYear: number) => { date: string; label: string };
}

/**
 * Format a date as "Mon DD, YYYY" label
 */
function formatDateLabel(isoDate: string): string {
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	const [year, month, day] = isoDate.split('-').map(Number);
	return `${months[month - 1]} ${day}, ${year}`;
}

/**
 * Federal sole proprietor filings:
 * - Schedule C (annual, April 15)
 * - Schedule SE (annual, April 15)
 * - 1040-ES Q1-Q4 (quarterly payments)
 */
export const SOLE_PROP_FILINGS: FilingDefinition[] = [
	// Annual federal filings
	{
		id: 'schedule-c',
		name: 'Schedule C',
		fullName: 'Schedule C (Form 1040) - Profit or Loss From Business',
		description: 'Report profit or loss from your sole proprietorship business',
		frequency: 'annual',
		workspaceType: 'sole_prop',
		category: 'federal',
		filingThreshold: 'All sole proprietors with business income',
		instructionsUrl: 'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear + 1}-04-15`,
			label: `Apr 15, ${fiscalYear + 1}`
		})
	},
	{
		id: 'schedule-se',
		name: 'Schedule SE',
		fullName: 'Schedule SE (Form 1040) - Self-Employment Tax',
		description: 'Calculate self-employment tax (Social Security and Medicare)',
		frequency: 'annual',
		workspaceType: 'sole_prop',
		category: 'federal',
		filingThreshold: 'Net self-employment earnings of $400 or more',
		instructionsUrl: 'https://www.irs.gov/forms-pubs/about-schedule-se-form-1040',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear + 1}-04-15`,
			label: `Apr 15, ${fiscalYear + 1}`
		})
	},

	// Federal quarterly estimated payments (1040-ES)
	{
		id: '1040-es-q1',
		name: '1040-ES Q1',
		fullName: 'Form 1040-ES Q1 Estimated Tax Payment',
		description: 'Federal quarterly estimated tax payment (Q1)',
		frequency: 'quarterly',
		quarter: 1,
		workspaceType: 'sole_prop',
		category: 'federal',
		filingThreshold: 'Expect to owe $1,000 or more in federal taxes',
		instructionsUrl: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear}-04-15`,
			label: `Apr 15, ${fiscalYear}`
		})
	},
	{
		id: '1040-es-q2',
		name: '1040-ES Q2',
		fullName: 'Form 1040-ES Q2 Estimated Tax Payment',
		description: 'Federal quarterly estimated tax payment (Q2)',
		frequency: 'quarterly',
		quarter: 2,
		workspaceType: 'sole_prop',
		category: 'federal',
		filingThreshold: 'Expect to owe $1,000 or more in federal taxes',
		instructionsUrl: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear}-06-15`,
			label: `Jun 15, ${fiscalYear}`
		})
	},
	{
		id: '1040-es-q3',
		name: '1040-ES Q3',
		fullName: 'Form 1040-ES Q3 Estimated Tax Payment',
		description: 'Federal quarterly estimated tax payment (Q3)',
		frequency: 'quarterly',
		quarter: 3,
		workspaceType: 'sole_prop',
		category: 'federal',
		filingThreshold: 'Expect to owe $1,000 or more in federal taxes',
		instructionsUrl: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear}-09-15`,
			label: `Sep 15, ${fiscalYear}`
		})
	},
	{
		id: '1040-es-q4',
		name: '1040-ES Q4',
		fullName: 'Form 1040-ES Q4 Estimated Tax Payment',
		description: 'Federal quarterly estimated tax payment (Q4)',
		frequency: 'quarterly',
		quarter: 4,
		workspaceType: 'sole_prop',
		category: 'federal',
		filingThreshold: 'Expect to owe $1,000 or more in federal taxes',
		instructionsUrl: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
		// Q4 payment is due January 15 of the NEXT year
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear + 1}-01-15`,
			label: `Jan 15, ${fiscalYear + 1}`
		})
	},

	// Pennsylvania state annual filing
	{
		id: 'pa-40',
		name: 'PA-40',
		fullName: 'PA-40 - Pennsylvania Personal Income Tax Return',
		description: 'Annual Pennsylvania state income tax return',
		frequency: 'annual',
		workspaceType: 'sole_prop',
		category: 'state',
		applicableStates: ['PA'],
		instructionsUrl:
			'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear + 1}-04-15`,
			label: `Apr 15, ${fiscalYear + 1}`
		})
	},

	// Pennsylvania quarterly estimated payments
	{
		id: 'pa-40-es-q1',
		name: 'PA-40 ES Q1',
		fullName: 'PA-40 ES Q1 Estimated Tax Payment',
		description: 'Pennsylvania quarterly estimated tax payment (Q1)',
		frequency: 'quarterly',
		quarter: 1,
		workspaceType: 'sole_prop',
		category: 'state',
		applicableStates: ['PA'],
		filingThreshold: 'Expect to owe $430 or more in PA taxes',
		instructionsUrl:
			'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear}-04-15`,
			label: `Apr 15, ${fiscalYear}`
		})
	},
	{
		id: 'pa-40-es-q2',
		name: 'PA-40 ES Q2',
		fullName: 'PA-40 ES Q2 Estimated Tax Payment',
		description: 'Pennsylvania quarterly estimated tax payment (Q2)',
		frequency: 'quarterly',
		quarter: 2,
		workspaceType: 'sole_prop',
		category: 'state',
		applicableStates: ['PA'],
		filingThreshold: 'Expect to owe $430 or more in PA taxes',
		instructionsUrl:
			'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear}-06-15`,
			label: `Jun 15, ${fiscalYear}`
		})
	},
	{
		id: 'pa-40-es-q3',
		name: 'PA-40 ES Q3',
		fullName: 'PA-40 ES Q3 Estimated Tax Payment',
		description: 'Pennsylvania quarterly estimated tax payment (Q3)',
		frequency: 'quarterly',
		quarter: 3,
		workspaceType: 'sole_prop',
		category: 'state',
		applicableStates: ['PA'],
		filingThreshold: 'Expect to owe $430 or more in PA taxes',
		instructionsUrl:
			'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear}-09-15`,
			label: `Sep 15, ${fiscalYear}`
		})
	},
	{
		id: 'pa-40-es-q4',
		name: 'PA-40 ES Q4',
		fullName: 'PA-40 ES Q4 Estimated Tax Payment',
		description: 'Pennsylvania quarterly estimated tax payment (Q4)',
		frequency: 'quarterly',
		quarter: 4,
		workspaceType: 'sole_prop',
		category: 'state',
		applicableStates: ['PA'],
		filingThreshold: 'Expect to owe $430 or more in PA taxes',
		instructionsUrl:
			'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		// Q4 payment is due January 15 of the NEXT year
		getDeadline: (fiscalYear: number) => ({
			date: `${fiscalYear + 1}-01-15`,
			label: `Jan 15, ${fiscalYear + 1}`
		})
	}
];

/**
 * Volunteer organization filings:
 * - 990-N (annual, 15th of 5th month after FY end)
 * - BCO-10 (PA only, if >$25k contributions)
 */
export const VOLUNTEER_ORG_FILINGS: FilingDefinition[] = [
	{
		id: '990-n',
		name: '990-N (e-Postcard)',
		fullName: 'Form 990-N Electronic Notice',
		description: 'Annual electronic filing for small tax-exempt organizations',
		frequency: 'annual',
		workspaceType: 'volunteer_org',
		category: 'federal',
		filingThreshold: 'Gross receipts normally $50,000 or less',
		instructionsUrl:
			'https://www.irs.gov/charities-non-profits/annual-electronic-filing-requirement-for-small-exempt-organizations-form-990-n-e-postcard',
		// Due: 15th day of 5th month after fiscal year end
		// For calendar year (ends Dec 31): due May 15
		getDeadline: (fiscalYear: number) => {
			// Assuming calendar year for simplicity (fiscalYearStartMonth = 1)
			// FY ends Dec 31 of fiscalYear, due May 15 of next year
			const dueDate = `${fiscalYear + 1}-05-15`;
			return {
				date: dueDate,
				label: formatDateLabel(dueDate)
			};
		}
	},
	{
		id: 'bco-10',
		name: 'PA BCO-10',
		fullName: 'BCO-10 Charitable Organization Registration',
		description: 'PA charitable registration (required if >$25k contributions)',
		frequency: 'annual',
		workspaceType: 'volunteer_org',
		category: 'state',
		applicableStates: ['PA'],
		filingThreshold: 'Required if gross contributions exceed $25,000',
		instructionsUrl:
			'https://www.pa.gov/agencies/dos/programs/charities/information-for-charities/-charitable-organizations',
		// Due within 30 days of anniversary (using end of 11th month as proxy)
		// For calendar year: registration anniversary is typically near year end
		getDeadline: (fiscalYear: number) => {
			// Using Nov 15 as the due date (roughly 11 months after Dec 31 of prior year)
			const dueDate = `${fiscalYear + 1}-11-15`;
			return {
				date: dueDate,
				label: formatDateLabel(dueDate)
			};
		}
	}
];

/**
 * Get all applicable filings for a workspace based on type and state.
 *
 * @param type - Workspace type ('sole_prop' or 'volunteer_org')
 * @param state - Two-letter state code (e.g., 'PA')
 * @returns Array of applicable filing definitions
 */
export function getFilingsForWorkspace(
	type: 'sole_prop' | 'volunteer_org',
	state: string
): FilingDefinition[] {
	const upperState = state.toUpperCase();

	// Select base filings by workspace type
	const baseFilings = type === 'sole_prop' ? SOLE_PROP_FILINGS : VOLUNTEER_ORG_FILINGS;

	// Filter to include:
	// 1. Federal filings (no applicableStates)
	// 2. State-specific filings that match the workspace state
	return baseFilings.filter((filing) => {
		if (!filing.applicableStates) {
			// Federal filing - always include
			return true;
		}
		// State-specific - include only if state matches
		return filing.applicableStates.includes(upperState);
	});
}

/**
 * Get deadline for a specific filing in a fiscal year.
 *
 * @param filingId - Filing definition ID (e.g., 'schedule-c', '1040-es-q1')
 * @param fiscalYear - The fiscal year to calculate deadline for
 * @returns Deadline info or null if filing not found
 */
export function getFilingDeadline(
	filingId: string,
	fiscalYear: number
): { date: string; label: string } | null {
	// Search both filing arrays
	const allFilings = [...SOLE_PROP_FILINGS, ...VOLUNTEER_ORG_FILINGS];
	const filing = allFilings.find((f) => f.id === filingId);

	if (!filing) {
		return null;
	}

	return filing.getDeadline(fiscalYear);
}

/**
 * Get a filing definition by ID.
 *
 * @param filingId - Filing definition ID
 * @returns Filing definition or undefined if not found
 */
export function getFilingById(filingId: string): FilingDefinition | undefined {
	const allFilings = [...SOLE_PROP_FILINGS, ...VOLUNTEER_ORG_FILINGS];
	return allFilings.find((f) => f.id === filingId);
}
