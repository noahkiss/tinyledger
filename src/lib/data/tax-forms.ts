/**
 * Tax forms reference data for sole proprietors.
 *
 * Provides a "cheat sheet" of required tax forms with links and due dates.
 * Forms are categorized by federal vs state-specific.
 */

export interface TaxForm {
	/** Unique identifier */
	id: string;
	/** Short form name (e.g., "Schedule C") */
	name: string;
	/** Full official form name */
	fullName: string;
	/** Brief description of the form's purpose */
	description: string;
	/** Link to IRS form page (federal forms) */
	irsLink?: string;
	/** Link to state revenue department (state forms) */
	stateLink?: string;
	/** Due date description */
	dueDate: string;
	/** Filing frequency */
	frequency: 'annual' | 'quarterly';
	/** Filing threshold description */
	filingThreshold?: string;
	/** States this form applies to (empty = federal) */
	applicableStates?: string[];
}

/**
 * Federal tax forms for sole proprietors.
 */
export const FEDERAL_FORMS: TaxForm[] = [
	{
		id: 'schedule-c',
		name: 'Schedule C',
		fullName: 'Schedule C (Form 1040) - Profit or Loss From Business',
		description: 'Report profit or loss from your sole proprietorship business',
		irsLink: 'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040',
		dueDate: 'April 15 (with tax return)',
		frequency: 'annual',
		filingThreshold: 'All sole proprietors with business income'
	},
	{
		id: 'schedule-se',
		name: 'Schedule SE',
		fullName: 'Schedule SE (Form 1040) - Self-Employment Tax',
		description: 'Calculate self-employment tax (Social Security and Medicare)',
		irsLink: 'https://www.irs.gov/forms-pubs/about-schedule-se-form-1040',
		dueDate: 'April 15 (with tax return)',
		frequency: 'annual',
		filingThreshold: 'Net self-employment earnings of $400 or more'
	},
	{
		id: 'form-1040-es',
		name: 'Form 1040-ES',
		fullName: 'Form 1040-ES - Estimated Tax for Individuals',
		description: 'Quarterly estimated tax payment vouchers for federal taxes',
		irsLink: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
		dueDate: 'Apr 15, Jun 15, Sep 15, Jan 15',
		frequency: 'quarterly',
		filingThreshold: 'Expect to owe $1,000 or more in federal taxes'
	}
];

/**
 * Pennsylvania tax forms for sole proprietors.
 */
export const PA_FORMS: TaxForm[] = [
	{
		id: 'pa-40',
		name: 'PA-40',
		fullName: 'PA-40 - Pennsylvania Personal Income Tax Return',
		description: 'Annual Pennsylvania state income tax return',
		stateLink: 'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		dueDate: 'April 15',
		frequency: 'annual',
		applicableStates: ['PA']
	},
	{
		id: 'pa-40-es',
		name: 'PA-40 ES',
		fullName: 'PA-40 ES - Declaration of Estimated Personal Income Tax',
		description: 'Quarterly estimated Pennsylvania state tax payments',
		stateLink: 'https://www.revenue.pa.gov/FormsAndPublications/FormsForIndividuals/PIT/Pages/default.aspx',
		dueDate: 'Apr 15, Jun 15, Sep 15, Jan 15',
		frequency: 'quarterly',
		filingThreshold: 'Expect to owe $430 or more in PA taxes',
		applicableStates: ['PA']
	}
];

/**
 * Get all applicable forms for a given state.
 * Always includes federal forms, plus state-specific forms if available.
 *
 * @param stateCode - Two-letter state code (e.g., "PA")
 * @returns Array of applicable tax forms
 */
export function getFormsForState(stateCode: string): TaxForm[] {
	const upperCode = stateCode.toUpperCase();

	// State forms lookup - add more states as needed
	const stateForms: Record<string, TaxForm[]> = {
		PA: PA_FORMS
	};

	const stateSpecificForms = stateForms[upperCode] || [];
	return [...FEDERAL_FORMS, ...stateSpecificForms];
}

/**
 * Get forms by frequency (for filtering quarterly vs annual).
 */
export function getFormsByFrequency(
	forms: TaxForm[],
	frequency: 'annual' | 'quarterly'
): TaxForm[] {
	return forms.filter((f) => f.frequency === frequency);
}
