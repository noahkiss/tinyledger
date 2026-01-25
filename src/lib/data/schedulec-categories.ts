/**
 * IRS Schedule C expense categories (Part II, Lines 8-27)
 * Pre-seeded into new workspaces to provide standard tax-friendly categorization
 *
 * Source: https://www.irs.gov/instructions/i1040sc
 */
export const SCHEDULE_C_CATEGORIES = [
	// Line 9 - Car and truck expenses
	'Vehicle Expenses',

	// Line 10 - Commissions and fees
	'Commissions & Fees',

	// Line 11 - Contract labor
	'Contract Labor',

	// Line 13 - Depreciation
	'Depreciation',

	// Line 14 - Employee benefit programs
	'Employee Benefits',

	// Line 15 - Insurance (other than health)
	'Business Insurance',

	// Line 16a/16b - Interest (mortgage and other)
	'Interest Expense',

	// Line 17 - Legal and professional services
	'Legal & Professional',

	// Line 18 - Office expense
	'Office Expenses',

	// Line 19 - Pension and profit-sharing plans
	'Retirement Contributions',

	// Line 20a/20b - Rent or lease
	'Rent & Lease',

	// Line 21 - Repairs and maintenance
	'Repairs & Maintenance',

	// Line 22 - Supplies
	'Supplies',

	// Line 23 - Taxes and licenses
	'Taxes & Licenses',

	// Line 24a - Travel
	'Travel',

	// Line 24b - Meals (deductible portion)
	'Meals & Entertainment',

	// Line 25 - Utilities
	'Utilities',

	// Line 26 - Wages
	'Wages & Salaries',

	// Common additional categories (Line 27b - Other expenses)
	'Advertising & Marketing',
	'Bank & Merchant Fees',
	'Computer & Software',
	'Cost of Goods Sold',
	'Education & Training',
	'Postage & Shipping',
	'Subscriptions & Dues',
	'Telephone & Internet',

	// Income categories (useful for categorization)
	'Sales Revenue',
	'Service Income',
	'Other Income'
] as const;

export type ScheduleCCategory = (typeof SCHEDULE_C_CATEGORIES)[number];
