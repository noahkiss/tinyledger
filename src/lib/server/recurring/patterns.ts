import rrule from 'rrule';
const { RRule } = rrule;
type RRuleInstance = InstanceType<typeof RRule>;

export type RecurringFrequency =
	| 'daily'
	| 'weekly'
	| 'biweekly'
	| 'monthly'
	| 'quarterly'
	| 'yearly'
	| 'custom';

export interface RecurringPattern {
	frequency: RecurringFrequency;
	interval?: number; // For custom: every N periods
	customUnit?: 'day' | 'week' | 'month';
	dayOfWeek?: number; // 0-6 (Mon-Sun) for weekly patterns
	dayOfMonth?: number; // 1-31 for monthly patterns
}

/**
 * Create an RRule from pattern definition.
 */
export function createRRule(pattern: RecurringPattern, startDate: string, endDate?: string): RRuleInstance {
	// Parse start date as local date (no timezone)
	const [year, month, day] = startDate.split('-').map(Number);
	const dtstart = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid DST issues

	let freq: number;
	let interval = 1;
	const options: { byweekday?: number[]; bymonthday?: number[] } = {};

	switch (pattern.frequency) {
		case 'daily':
			freq = RRule.DAILY;
			break;
		case 'weekly':
			freq = RRule.WEEKLY;
			if (pattern.dayOfWeek !== undefined) {
				options.byweekday = [pattern.dayOfWeek];
			}
			break;
		case 'biweekly':
			freq = RRule.WEEKLY;
			interval = 2;
			break;
		case 'monthly':
			freq = RRule.MONTHLY;
			if (pattern.dayOfMonth !== undefined) {
				options.bymonthday = [pattern.dayOfMonth];
			}
			break;
		case 'quarterly':
			freq = RRule.MONTHLY;
			interval = 3;
			break;
		case 'yearly':
			freq = RRule.YEARLY;
			break;
		case 'custom':
			freq =
				pattern.customUnit === 'day'
					? RRule.DAILY
					: pattern.customUnit === 'week'
						? RRule.WEEKLY
						: RRule.MONTHLY;
			interval = pattern.interval || 1;
			break;
		default:
			freq = RRule.MONTHLY;
	}

	const ruleOptions: ConstructorParameters<typeof RRule>[0] = {
		freq,
		interval,
		dtstart,
		...options
	};

	if (endDate) {
		const [ey, em, ed] = endDate.split('-').map(Number);
		ruleOptions.until = new Date(ey, em - 1, ed, 23, 59, 59);
	}

	return new RRule(ruleOptions);
}

/**
 * Get human-readable description of pattern.
 */
export function getPatternDescription(pattern: RecurringPattern): string {
	switch (pattern.frequency) {
		case 'daily':
			return 'Every day';
		case 'weekly':
			return 'Every week';
		case 'biweekly':
			return 'Every 2 weeks';
		case 'monthly':
			return 'Every month';
		case 'quarterly':
			return 'Every 3 months';
		case 'yearly':
			return 'Every year';
		case 'custom': {
			const unit = pattern.customUnit || 'month';
			const interval = pattern.interval || 1;
			return `Every ${interval} ${unit}${interval > 1 ? 's' : ''}`;
		}
		default:
			return 'Unknown pattern';
	}
}

/**
 * Parse pattern from stored rrule string.
 */
export function parseRRuleString(rruleString: string): RRuleInstance {
	return RRule.fromString(rruleString);
}
